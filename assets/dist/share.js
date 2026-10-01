"use strict";
(function () {
    const TARGETS = [
        { label: "WhatsApp", icon: "💬", href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t}\n${u}`)}` },
        { label: "Telegram", icon: "✈️", href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
        { label: "Facebook", icon: "👍", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
        { label: "X", icon: "🐦", href: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
        { label: "Email", icon: "✉️", href: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(`${t}\n${u}`)}` },
    ];
    const CSS = `
.share-btn{position:absolute;top:0;right:0;width:42px;height:42px;border-radius:50%;background:#fff;border:1px solid var(--gray-200,#e5e7eb);box-shadow:0 2px 10px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;color:#111827;cursor:pointer;transition:transform .2s,background .2s,box-shadow .2s;z-index:2}
.share-btn:hover{background:var(--gold,#fbbf24);transform:scale(1.08);box-shadow:0 4px 16px rgba(251,191,36,.45)}
.share-btn:active{transform:scale(.95)}
.product-info{position:relative}
.product-info__title{padding-right:54px}
.share-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;animation:shFade .2s ease}
.share-sheet{width:100%;max-width:440px;background:#fff;border-radius:18px 18px 0 0;padding:20px 20px 24px;animation:shUp .28s cubic-bezier(.2,.8,.2,1)}
.share-sheet__head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.share-sheet__head h3{font-size:17px}
.share-sheet__close{font-size:18px;padding:6px 10px;color:#6b7280}
.share-sheet__name{font-size:13px;color:#6b7280;margin-bottom:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.share-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.share-opt{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:12px;background:#f9fafb;font-size:12px;font-weight:500;color:#111827;text-decoration:none}
.share-opt:hover{background:#fef3c7}
.share-opt span{font-size:26px;line-height:1}
.share-copy{display:flex;gap:8px}
.share-copy input{flex:1;min-width:0;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;color:#374151}
.share-copy button{padding:10px 16px;border-radius:8px;background:#0a0a0a;color:#fff;font-weight:600;font-size:13px}
@media(min-width:640px){.share-overlay{align-items:center}.share-sheet{border-radius:18px}}
@keyframes shFade{from{opacity:0}to{opacity:1}}
@keyframes shUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
`;
    function shareUrl() {
        const host = location.hostname;
        const local = host === "localhost" || host === "127.0.0.1" || location.protocol === "file:";
        const canonical = document.querySelector('link[rel="canonical"]')?.href;
        if (local && canonical)
            return canonical;
        return location.origin + location.pathname;
    }
    async function copyText(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        }
        catch {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            ta.remove();
            return ok;
        }
    }
    function openSheet(name, text, url) {
        const overlay = document.createElement("div");
        overlay.className = "share-overlay";
        const close = () => {
            overlay.remove();
            document.removeEventListener("keydown", onKey);
        };
        const onKey = (e) => {
            if (e.key === "Escape")
                close();
        };
        document.addEventListener("keydown", onKey);
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay)
                close();
        });
        const sheet = document.createElement("div");
        sheet.className = "share-sheet";
        sheet.setAttribute("role", "dialog");
        sheet.setAttribute("aria-label", "Share product");
        const head = document.createElement("div");
        head.className = "share-sheet__head";
        const h3 = document.createElement("h3");
        h3.textContent = "Share this product";
        const x = document.createElement("button");
        x.className = "share-sheet__close";
        x.type = "button";
        x.setAttribute("aria-label", "Close");
        x.textContent = "✕";
        x.addEventListener("click", close);
        head.append(h3, x);
        const nm = document.createElement("div");
        nm.className = "share-sheet__name";
        nm.textContent = name;
        const grid = document.createElement("div");
        grid.className = "share-grid";
        TARGETS.forEach((t) => {
            const a = document.createElement("a");
            a.className = "share-opt";
            a.href = t.href(url, text);
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            const ic = document.createElement("span");
            ic.textContent = t.icon;
            a.append(ic, document.createTextNode(t.label));
            grid.appendChild(a);
        });
        const copy = document.createElement("div");
        copy.className = "share-copy";
        const input = document.createElement("input");
        input.type = "text";
        input.readOnly = true;
        input.value = url;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Copy";
        btn.addEventListener("click", () => {
            void copyText(url).then((ok) => {
                btn.textContent = ok ? "Copied ✓" : "Copy failed";
                window.setTimeout(() => {
                    btn.textContent = "Copy";
                }, 1800);
            });
        });
        copy.append(input, btn);
        sheet.append(head, nm, grid, copy);
        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
    }
    async function handleShare() {
        const name = document.querySelector(".product-info__title")?.textContent?.trim() ?? "AVIORCART product";
        const price = document.getElementById("product-price")?.textContent?.trim() ?? "";
        const text = `${name}${price ? ` — ${price}` : ""} | AVIORCART`;
        const url = shareUrl();
        if ("share" in navigator) {
            try {
                await navigator.share({ title: name, text, url });
                return;
            }
            catch (err) {
                if (err instanceof DOMException && err.name === "AbortError")
                    return;
            }
        }
        openSheet(name, text, url);
    }
    function init() {
        const info = document.querySelector(".product-info");
        if (!info || info.querySelector(".share-btn"))
            return;
        const style = document.createElement("style");
        style.textContent = CSS;
        document.head.appendChild(style);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "share-btn";
        btn.title = "Share";
        btn.setAttribute("aria-label", "Share this product");
        btn.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>';
        btn.addEventListener("click", () => {
            void handleShare();
        });
        info.insertBefore(btn, info.firstChild);
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    }
    else {
        init();
    }
})();
