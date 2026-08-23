/* AVIORCART Admin Dashboard — orders: fetch, realtime, filter, render */

let allOrders: Order[] = [];
let activeFilter: OrderFilter = "all";

function money(n: number | null): string {
  const v = typeof n === "number" ? n : 0;
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function statusOf(o: Order): string {
  return (o.payment_status || "pending").toLowerCase();
}

function statusClass(status: string | null): string {
  const s = (status || "pending").toLowerCase();
  if (s === "success") return "status-success";
  if (s === "failed") return "status-failed";
  return "status-pending";
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

async function fetchOrders(): Promise<void> {
  setRefreshing(true);
  const res = await sb.from("orders").select("*").order("created_at", { ascending: false });
  setRefreshing(false);

  if (res.error) {
    showToast("⚠ Failed to load orders: " + res.error.message);
    return;
  }

  allOrders = res.data || [];
  renderStats();
  renderOrders();
  setText("last-updated", "Updated " + new Date().toLocaleTimeString("en-IN"));
}

function setFilter(filter: OrderFilter): void {
  activeFilter = filter;
  const tabs = document.querySelectorAll(".filter-tab");
  for (let i = 0; i < tabs.length; i++) {
    const btn = tabs[i] as HTMLElement;
    btn.classList.toggle("active", btn.dataset.filter === filter);
  }
  renderOrders();
}

function getFilteredOrders(): Order[] {
  if (activeFilter === "all") return allOrders;
  return allOrders.filter(function (o) {
    return statusOf(o) === activeFilter;
  });
}

function renderStats(): void {
  const total = allOrders.length;
  const success = allOrders.filter(function (o) { return statusOf(o) === "success"; }).length;
  const failed = allOrders.filter(function (o) { return statusOf(o) === "failed"; }).length;
  const pending = total - success - failed;
  const revenue = allOrders
    .filter(function (o) { return statusOf(o) === "success"; })
    .reduce(function (sum, o) { return sum + (o.amount || 0); }, 0);

  setText("stat-total", String(total));
  setText("stat-success", String(success));
  setText("stat-failed", String(failed));
  setText("stat-pending", String(pending));
  setText("stat-revenue", money(revenue));

  setText("tab-count-all", String(total));
  setText("tab-count-success", String(success));
  setText("tab-count-failed", String(failed));
  setText("tab-count-pending", String(pending));
}

function renderOrders(): void {
  const container = document.getElementById("orders-list");
  if (!container) return;
  const orders = getFilteredOrders();

  if (!orders.length) {
    container.innerHTML = '<div class="empty-state">✨ No orders in this category yet</div>';
    return;
  }

  container.innerHTML = orders.map(orderCardHtml).join("");
}

function orderCardHtml(o: Order, index: number): string {
  const items = o.items || [];
  const itemsHtml = items
    .map(function (it) {
      return (
        '<div class="order-item-row"><span>' +
        escapeHtml(it.title) +
        " × " +
        it.quantity +
        "</span><span>" +
        money(it.price) +
        "</span></div>"
      );
    })
    .join("");

  const date = new Date(o.created_at).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const delay = (index % 12) * 40;

  return (
    '<div class="order-card reveal" style="--delay:' + delay + 'ms" data-id="' + o.id + '">' +

    '<div class="order-card__head">' +
    "<div>" +
    '<span class="order-id">#' + o.id + "</span>" +
    '<span class="order-txn">Txn ID: ' + escapeHtml(o.txnid || "-") + "</span>" +
    "</div>" +
    '<span class="status-badge ' + statusClass(o.payment_status) + '">' + escapeHtml(o.payment_status || "pending") + "</span>" +
    "</div>" +

    '<div class="order-card__body">' +

    detailRow("Customer", escapeHtml(o.full_name || "-")) +
    detailRow("Phone", escapeHtml(o.phone || "-")) +
    detailRow("Email", escapeHtml(o.email || "-")) +
    detailRow(
      "Address",
      escapeHtml(o.address || "-") + ", " + escapeHtml(o.city || "-") + ", " + escapeHtml(o.state || "-") + " - " + escapeHtml(o.pincode || "-")
    ) +
    detailRow("Order Time", date) +

    '<div class="order-section-label">Items Ordered</div>' +
    '<div class="order-items">' + itemsHtml + "</div>" +

    "</div>" +

    '<div class="order-card__foot">' +
    '<span class="detail-label">Total Amount</span>' +
    '<span class="order-amount">' + money(o.amount) + "</span>" +
    "</div>" +

    "</div>"
  );
}

function detailRow(label: string, value: string): string {
  return (
    '<div class="detail-row">' +
    '<span class="detail-label">' + label + "</span>" +
    '<span class="detail-value">' + value + "</span>" +
    "</div>"
  );
}

function setRefreshing(state: boolean): void {
  const el = document.getElementById("refresh-btn");
  if (el) el.classList.toggle("spinning", state);
}

let toastTimer: number | undefined;

function showToast(msg: string): void {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    t.classList.remove("show");
  }, 3000);
}

function subscribeRealtime(): void {
  sb.channel("orders-realtime-channel")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, handleRealtimeChange)
    .subscribe();
}

function handleRealtimeChange(payload: RealtimePayload): void {
  if (payload.eventType === "INSERT") {
    allOrders = [payload.new].concat(allOrders);
    showToast("🔔 New order received — #" + payload.new.id);
    playNotifySound();
  } else if (payload.eventType === "UPDATE") {
    allOrders = allOrders.map(function (o) {
      return o.id === payload.new.id ? payload.new : o;
    });
    showToast("Order #" + payload.new.id + " updated");
  } else if (payload.eventType === "DELETE") {
    const removedId = payload.old.id;
    allOrders = allOrders.filter(function (o) {
      return o.id !== removedId;
    });
  }
  renderStats();
  renderOrders();
}

function playNotifySound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    /* audio not available — ignore */
  }
}
