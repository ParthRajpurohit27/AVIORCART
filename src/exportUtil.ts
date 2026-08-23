/* AVIORCART Admin Dashboard — downloadable report generation (PDF / PNG) */

function reportTitle(filter: OrderFilter): string {
  if (filter === "all") return "All Orders";
  return filter.charAt(0).toUpperCase() + filter.slice(1) + " Orders";
}

function buildReportNode(filter: OrderFilter): HTMLDivElement {
  const orders = filter === "all" ? allOrders : allOrders.filter(function (o) { return statusOf(o) === filter; });
  const total = orders.reduce(function (sum, o) { return sum + (o.amount || 0); }, 0);

  const rows = orders
    .map(function (o, i) {
      return (
        "<tr>" +
        '<td style="padding:8px;border-bottom:1px solid #232330;">' + (i + 1) + "</td>" +
        '<td style="padding:8px;border-bottom:1px solid #232330;">' + escapeHtml(o.txnid || "-") + "</td>" +
        '<td style="padding:8px;border-bottom:1px solid #232330;">' + escapeHtml(o.full_name || "-") + "</td>" +
        '<td style="padding:8px;border-bottom:1px solid #232330;">' + escapeHtml(o.phone || "-") + "</td>" +
        '<td style="padding:8px;border-bottom:1px solid #232330;">' + money(o.amount) + "</td>" +
        '<td style="padding:8px;border-bottom:1px solid #232330;text-transform:capitalize;">' + escapeHtml(o.payment_status || "pending") + "</td>" +
        '<td style="padding:8px;border-bottom:1px solid #232330;">' + new Date(o.created_at).toLocaleDateString("en-IN") + "</td>" +
        "</tr>"
      );
    })
    .join("");

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "position:fixed;left:-9999px;top:0;width:920px;padding:36px;background:#08080b;color:#fff;font-family:'DM Sans',Arial,sans-serif;";

  wrap.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #fbbf24;padding-bottom:18px;margin-bottom:20px;">' +
    '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:26px;letter-spacing:2px;">' +
    '<span style="color:#fbbf24;">AVI</span><span style="color:#fff;">OR</span><span style="color:#fbbf24;">CART</span>' +
    "</div>" +
    '<div style="text-align:right;font-size:11px;color:#9ca3af;">Generated: ' + new Date().toLocaleString("en-IN") + "</div>" +
    "</div>" +
    '<h2 style="font-size:20px;margin-bottom:16px;color:#fbbf24;font-family:Orbitron,sans-serif;">' + reportTitle(filter) + " Report</h2>" +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
    '<thead><tr style="background:#15151d;color:#fbbf24;text-align:left;">' +
    '<th style="padding:8px;">#</th><th style="padding:8px;">Txn ID</th><th style="padding:8px;">Customer</th>' +
    '<th style="padding:8px;">Phone</th><th style="padding:8px;">Amount</th><th style="padding:8px;">Status</th><th style="padding:8px;">Date</th>' +
    "</tr></thead><tbody>" + (rows || '<tr><td colspan="7" style="padding:16px;text-align:center;color:#7c7c96;">No orders</td></tr>') + "</tbody>" +
    "</table>" +
    '<div style="display:flex;justify-content:space-between;margin-top:22px;font-size:13px;color:#fbbf24;font-weight:700;">' +
    "<span>Total Orders: " + orders.length + "</span><span>Total Amount: " + money(total) + "</span>" +
    "</div>" +
    '<div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #232330;padding-top:18px;">' +
    '<div style="font-size:11px;color:#8a8aa0;line-height:1.8;">' +
    "Payment Partners: Delhivery &bull; PayU<br>" +
    "Founder — " + OWNER_NAME +
    "</div>" +
    '<div style="border:2px solid #fbbf24;border-radius:50%;width:82px;height:82px;display:flex;align-items:center;justify-content:center;' +
    'transform:rotate(-8deg);color:#fbbf24;font-family:Orbitron,sans-serif;font-size:9px;font-weight:900;text-align:center;letter-spacing:1px;">' +
    BRAND_NAME + "<br>VERIFIED</div>" +
    "</div>";

  document.body.appendChild(wrap);
  return wrap;
}

async function downloadReport(filter: OrderFilter, format: DownloadFormat): Promise<void> {
  showToast("⏳ Preparing " + format.toUpperCase() + "…");
  const node = buildReportNode(filter);

  try {
    const canvas = await html2canvas(node, { backgroundColor: "#08080b", scale: 2 });
    const filename = "aviorcart-orders-" + filter + "-" + Date.now();

    if (format === "png") {
      const link = document.createElement("a");
      link.download = filename + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } else {
      const PdfCtor = window.jspdf.jsPDF;
      const pdf = new PdfCtor({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(filename + ".pdf");
    }
    showToast("✅ Downloaded successfully");
  } catch (e) {
    showToast("⚠ Download failed, try again");
  } finally {
    document.body.removeChild(node);
  }
}
