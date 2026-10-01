import type { VercelRequest, VercelResponse } from "@vercel/node";

const DELHIVERY_URL = "https://track.delhivery.com/api/v1/packages/json/";
const AWB_PATTERN = /^[A-Za-z0-9]{8,20}$/;

type Stage = 0 | 1 | 2 | 3 | 4;

interface DelhiveryStatus {
  Status?: string;
  StatusType?: string;
  StatusLocation?: string;
  StatusDateTime?: string;
  Instructions?: string;
}

interface DelhiveryScanDetail {
  Scan?: string;
  ScannedLocation?: string;
  ScanDateTime?: string;
  StatusDateTime?: string;
  Instructions?: string;
}

interface DelhiveryShipment {
  AWB?: string;
  Status?: DelhiveryStatus;
  Scans?: Array<{ ScanDetail?: DelhiveryScanDetail }>;
  Origin?: string;
  Destination?: string;
  ExpectedDeliveryDate?: string;
  PromisedDeliveryDate?: string;
}

interface DelhiveryResponse {
  ShipmentData?: Array<{ Shipment?: DelhiveryShipment }>;
  Error?: string;
}

interface TrackScan {
  status: string;
  location: string;
  time: string;
  remark: string;
}

interface TrackResult {
  awb: string;
  status: string;
  stage: Stage;
  isReturn: boolean;
  location: string;
  updatedAt: string;
  expectedDelivery: string;
  origin: string;
  destination: string;
  scans: TrackScan[];
}

function getStage(status: string, statusType: string): { stage: Stage; isReturn: boolean } {
  const s = status.toLowerCase();
  const isReturn = statusType === "RT" || statusType === "PU" || s.includes("rto") || s.includes("return");
  if (statusType === "DL" || (s.includes("deliver") && !s.includes("out for") && !s.includes("undeliver"))) {
    return { stage: 4, isReturn };
  }
  if (s.includes("dispatched") || s.includes("out for delivery")) return { stage: 3, isReturn };
  if (s.includes("transit") || s.includes("reached") || s.includes("pending") || s.includes("undeliver")) {
    return { stage: 2, isReturn };
  }
  if (s.includes("manifest") || s.includes("picked") || s.includes("pickup")) return { stage: 1, isReturn };
  return { stage: 1, isReturn };
}

function normalize(shipment: DelhiveryShipment, awb: string): TrackResult {
  const st = shipment.Status ?? {};
  const status = st.Status ?? "Unknown";
  const { stage, isReturn } = getStage(status, st.StatusType ?? "");

  const scans: TrackScan[] = (shipment.Scans ?? [])
    .map((s) => s.ScanDetail)
    .filter((d): d is DelhiveryScanDetail => d !== undefined)
    .map((d) => ({
      status: d.Scan ?? "",
      location: d.ScannedLocation ?? "",
      time: d.ScanDateTime ?? d.StatusDateTime ?? "",
      remark: d.Instructions ?? "",
    }))
    .sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

  return {
    awb: shipment.AWB ?? awb,
    status,
    stage,
    isReturn,
    location: st.StatusLocation ?? "",
    updatedAt: st.StatusDateTime ?? "",
    expectedDelivery: shipment.ExpectedDeliveryDate ?? shipment.PromisedDeliveryDate ?? "",
    origin: shipment.Origin ?? "",
    destination: shipment.Destination ?? "",
    scans,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const raw = req.query["awb"];
  const awb = (Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  if (!AWB_PATTERN.test(awb)) {
    res.status(400).json({ error: "Enter a valid AWB number (8-20 letters/digits)." });
    return;
  }

  const token = process.env["DELHIVERY_TOKEN"];
  if (!token) {
    console.error("track: DELHIVERY_TOKEN env var missing");
    res.status(500).json({ error: "Tracking is temporarily unavailable." });
    return;
  }

  try {
    const upstream = await fetch(`${DELHIVERY_URL}?waybill=${encodeURIComponent(awb)}`, {
      headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    });

    if (!upstream.ok) {
      console.error("track: Delhivery HTTP", upstream.status);
      res.status(502).json({ error: "Courier service did not respond. Try again shortly." });
      return;
    }

    const data = (await upstream.json()) as DelhiveryResponse;
    const shipment = data.ShipmentData?.[0]?.Shipment;
    if (!shipment || !shipment.Status) {
      res.status(404).json({ error: "No shipment found for this AWB. Check the number and try again." });
      return;
    }

    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(normalize(shipment, awb));
  } catch (err) {
    console.error("track: fetch failed", err);
    res.status(502).json({ error: "Could not reach courier service. Try again shortly." });
  }
}
