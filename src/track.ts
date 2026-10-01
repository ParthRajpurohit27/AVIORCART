/* order tracking page — talks to /api/track (Delhivery proxy) */

(function (): void {
  type Stage = 0 | 1 | 2 | 3 | 4;

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

  interface TrackError {
    error: string;
  }

  interface RouteInfo {
    nodes: string[];
    current: number;
    hidden: number;
  }

  interface StepDef {
    label: string;
    icon: string;
  }

  const STEPS: readonly StepDef[] = [
    { label: "Picked Up", icon: "📦" },
    { label: "In Transit", icon: "🚚" },
    { label: "Out for Delivery", icon: "🛵" },
    { label: "Delivered", icon: "🏠" },
  ];
  const HISTORY_KEY = "aviorcart_recent_awb";
  const MAX_HISTORY = 4;
  const MAX_ROUTE_NODES = 7;

  function byId<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Missing element #${id}`);
    return node as T;
  }

  function el(tag: string, className?: string, text?: string): HTMLElement {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatTime(iso: string): string {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    return new Date(ms).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function cleanLoc(raw: string): string {
    return raw.replace(/\([^)]*\)/g, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  }

  function sameLoc(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
  }

  function loadHistory(): string[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  }

  function saveHistory(awb: string): void {
    try {
      const next = [awb, ...loadHistory().filter((a) => a !== awb)].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — ignore */
    }
  }

  function renderHistory(onPick: (awb: string) => void): void {
    const box = byId<HTMLDivElement>("track-recent");
    box.replaceChildren();
    const items = loadHistory();
    if (!items.length) return;
    box.appendChild(el("span", "track-recent__label", "Recent:"));
    items.forEach((awb) => {
      const chip = el("button", "track-chip", awb) as HTMLButtonElement;
      chip.type = "button";
      chip.addEventListener("click", () => onPick(awb));
      box.appendChild(chip);
    });
  }

  function heroIcon(r: TrackResult): string {
    if (r.isReturn) return "↩️";
    if (r.stage === 4) return "🎉";
    if (r.stage === 3) return "🛵";
    if (r.stage === 2) return "🚚";
    return "📦";
  }

  function buildRoute(r: TrackResult): RouteInfo {
    const path: string[] = [];
    [...r.scans].reverse().forEach((s) => {
      const c = cleanLoc(s.location);
      const prev = path[path.length - 1];
      if (c && (prev === undefined || !sameLoc(prev, c))) path.push(c);
    });

    const origin = cleanLoc(r.origin);
    const dest = cleanLoc(r.destination);
    const first = path[0];
    if (origin && (first === undefined || !sameLoc(first, origin))) path.unshift(origin);

    let current = path.length - 1;
    const lastNode = path[path.length - 1];
    if (dest && (lastNode === undefined || !sameLoc(lastNode, dest))) path.push(dest);
    if (r.stage >= 3 || r.stage === 4) current = path.length - 1;

    if (path.length <= MAX_ROUTE_NODES) return { nodes: path, current, hidden: 0 };

    const keep = new Set<number>([0, path.length - 1, current, Math.max(0, current - 1), Math.min(path.length - 1, current + 1)]);
    const step = (path.length - 1) / (MAX_ROUTE_NODES - 1);
    for (let k = 0; keep.size < MAX_ROUTE_NODES && k < MAX_ROUTE_NODES; k++) keep.add(Math.round(k * step));
    const idx = [...keep].sort((a, b) => a - b);
    return {
      nodes: idx.map((i) => path[i] ?? ""),
      current: idx.indexOf(current),
      hidden: path.length - idx.length,
    };
  }

  function renderRoute(r: TrackResult): HTMLElement | null {
    const route = buildRoute(r);
    const n = route.nodes.length;
    if (n < 2) return null;

    const delivered = r.stage === 4 && !r.isReturn;
    const frac = route.current / (n - 1);

    const section = el("div", "route-section");
    section.appendChild(el("h3", "track-section-title", "Live route"));

    const wrap = el("div", "route");
    wrap.style.setProperty("--n", String(n));
    wrap.style.setProperty("--p", `${(frac * 100).toFixed(1)}%`);
    wrap.style.setProperty("--f", frac.toFixed(3));

    const line = el("div", "route__line");
    line.appendChild(el("div", "route__fill"));
    wrap.appendChild(line);

    route.nodes.forEach((name, i) => {
      const state = i < route.current ? " is-passed" : i === route.current ? " is-current" : "";
      const isEnd = delivered && i === n - 1;
      const node = el("div", "route__node" + state + (isEnd ? " is-done" : ""));
      node.style.animationDelay = `${(i * 0.12).toFixed(2)}s`;
      node.appendChild(el("div", "route__dot", i < route.current || isEnd ? "✓" : ""));
      const label = el("div", "route__label");
      label.appendChild(el("span", "route__name", name));
      const tag = i === 0 ? "Origin" : i === n - 1 ? "Destination" : i === route.current ? "You are here" : "";
      if (tag) label.appendChild(el("span", "route__tag", tag));
      node.appendChild(label);
      wrap.appendChild(node);
    });

    if (!delivered) {
      wrap.appendChild(el("div", "route__truck", r.stage === 3 ? "🛵" : "🚚"));
    }
    section.appendChild(wrap);
    if (route.hidden > 0) {
      section.appendChild(el("p", "route__more", `+${route.hidden} more stops in between (see history below)`));
    }
    return section;
  }

  function renderResult(r: TrackResult): void {
    const out = byId<HTMLDivElement>("track-result");
    out.replaceChildren();
    const delivered = r.stage === 4 && !r.isReturn;

    const hero = el("div", "track-hero" + (delivered ? " is-done" : "") + (r.isReturn ? " is-return" : ""));
    hero.appendChild(el("div", "track-hero__icon", heroIcon(r)));
    const body = el("div", "track-hero__body");
    body.appendChild(el("div", "track-hero__awb", `AWB ${r.awb}`));
    body.appendChild(el("div", "track-hero__status", r.status));
    const where = r.location ? cleanLoc(r.location) : "";
    if (where) {
      const w = el("div", "track-hero__where");
      w.appendChild(el("span", "track-hero__pin", "📍"));
      w.appendChild(el("span", undefined, delivered ? `Delivered at ${where}` : `Currently at ${where}`));
      body.appendChild(w);
    }
    if (r.updatedAt) body.appendChild(el("div", "track-hero__time", `Updated ${formatTime(r.updatedAt)}`));
    hero.appendChild(body);
    out.appendChild(hero);

    const meta = el("div", "track-meta");
    const addMeta = (label: string, value: string): void => {
      if (!value) return;
      const item = el("div", "track-meta__item");
      item.appendChild(el("span", "track-meta__k", label));
      item.appendChild(el("span", "track-meta__v", value));
      meta.appendChild(item);
    };
    addMeta("Expected delivery", r.expectedDelivery ? formatTime(r.expectedDelivery) : "");
    addMeta("From", cleanLoc(r.origin));
    addMeta("To", cleanLoc(r.destination));
    addMeta("Updates", String(r.scans.length));
    if (meta.childElementCount) out.appendChild(meta);

    if (r.isReturn) {
      out.appendChild(el("div", "track-note", "↩️ This shipment is being returned to the seller."));
    } else {
      const steps = el("ol", "track-steps");
      STEPS.forEach((def, i) => {
        const nStep = i + 1;
        const cls = "track-step" + (r.stage >= nStep ? " is-on" : "") + (r.stage === nStep ? " is-current" : "");
        const li = el("li", cls);
        li.style.animationDelay = `${(i * 0.15).toFixed(2)}s`;
        li.appendChild(el("span", "track-step__dot", r.stage >= nStep ? def.icon : String(nStep)));
        li.appendChild(el("span", "track-step__label", def.label));
        steps.appendChild(li);
      });
      out.appendChild(steps);
    }

    const route = renderRoute(r);
    if (route) out.appendChild(route);

    const tl = el("div", "track-timeline");
    tl.appendChild(el("h3", "track-section-title", "Shipment history"));
    if (!r.scans.length) {
      tl.appendChild(el("p", "track-empty", "No scan updates yet. Check back soon."));
    }
    r.scans.forEach((s, i) => {
      const row = el("div", "track-scan" + (i === 0 ? " is-latest" : ""));
      row.style.animationDelay = `${(0.2 + Math.min(i, 12) * 0.07).toFixed(2)}s`;
      row.appendChild(el("div", "track-scan__dot"));
      const sb = el("div", "track-scan__body");
      sb.appendChild(el("div", "track-scan__status", s.status || "Update"));
      const sub = [cleanLoc(s.location), s.remark].filter(Boolean).join(" • ");
      if (sub) sb.appendChild(el("div", "track-scan__sub", sub));
      sb.appendChild(el("div", "track-scan__time", formatTime(s.time)));
      row.appendChild(sb);
      tl.appendChild(row);
    });
    out.appendChild(tl);

    const share = el("button", "btn btn-gold track-share", "🔗 Copy tracking link") as HTMLButtonElement;
    share.type = "button";
    share.addEventListener("click", () => {
      const url = `${location.origin}${location.pathname}?awb=${encodeURIComponent(r.awb)}`;
      void navigator.clipboard.writeText(url).then(() => {
        share.textContent = "Link copied ✓";
      });
    });
    out.appendChild(share);

    out.hidden = false;
    if (delivered) window.dispatchEvent(new CustomEvent("track:delivered"));
  }

  function showError(msg: string): void {
    const box = byId<HTMLDivElement>("track-error");
    box.textContent = msg;
    box.hidden = false;
  }

  function setLoading(on: boolean): void {
    const btn = byId<HTMLButtonElement>("track-btn");
    btn.disabled = on;
    btn.textContent = on ? "Tracking…" : "Track";
    byId<HTMLDivElement>("track-loader").hidden = !on;
  }

  async function track(rawAwb: string): Promise<void> {
    const awb = rawAwb.replace(/\s+/g, "");
    byId<HTMLDivElement>("track-error").hidden = true;
    byId<HTMLDivElement>("track-result").hidden = true;

    if (!/^[A-Za-z0-9]{8,20}$/.test(awb)) {
      showError("Enter a valid AWB number (8-20 letters/digits).");
      return;
    }

    byId<HTMLInputElement>("track-input").value = awb;
    setLoading(true);
    try {
      const res = await fetch(`/api/track?awb=${encodeURIComponent(awb)}`);
      let data: TrackResult | TrackError | null = null;
      try {
        data = (await res.json()) as TrackResult | TrackError;
      } catch {
        data = null;
      }
      if (data === null) {
        showError(`Tracking service unavailable (HTTP ${res.status}). Please try again later.`);
        return;
      }
      if (!res.ok || "error" in data) {
        showError("error" in data ? data.error : "Something went wrong. Try again.");
        return;
      }
      saveHistory(awb);
      renderHistory(pick);
      renderResult(data);
      history.replaceState(null, "", `?awb=${encodeURIComponent(awb)}`);
    } catch {
      showError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function pick(awb: string): void {
    void track(awb);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = byId<HTMLFormElement>("track-form");
    form.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      void track(byId<HTMLInputElement>("track-input").value);
    });
    renderHistory(pick);
    const initial = new URLSearchParams(location.search).get("awb");
    if (initial) void track(initial);
  });
})();
