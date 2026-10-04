/* AVIORCART boot: network hints + smart preloader (only appears when loading is actually slow) */

(function (): void {
  const SHOW_AFTER_MS = 450;
  const NAV_SHOW_AFTER_MS = 350;
  const MIN_VISIBLE_MS = 700;
  const MAX_WAIT_MS = 15000;
  const FLAG = "av_boot_nav";

  const root = document.documentElement;

  function hint(rel: string, href: string, cors: boolean): void {
    const l = document.createElement("link");
    l.rel = rel;
    l.href = href;
    if (cors) l.crossOrigin = "anonymous";
    document.head.appendChild(l);
  }
  hint("preconnect", "https://cdn.shopify.com", false);
  hint("preconnect", "https://fonts.gstatic.com", true);
  hint("dns-prefetch", "https://i.postimg.cc", false);

  const STAR = "M12 0C12.8 8 16 11.2 24 12C16 12.8 12.8 16 12 24C11.2 16 8 12.8 0 12C8 11.2 11.2 8 12 0Z";

  const CSS = `
#av-boot{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;flex-direction:column;background:radial-gradient(ellipse at 50% 38%,#17110a 0%,#07070b 55%,#020203 100%);opacity:0;transition:opacity .35s ease;touch-action:none;overflow:hidden;font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif}
#av-boot.on{opacity:1}
#av-boot .av-sky{position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 72%,#fff,transparent),radial-gradient(1.5px 1.5px at 44% 30%,#fde68a,transparent),radial-gradient(1px 1px at 63% 15%,#fff,transparent),radial-gradient(1.5px 1.5px at 78% 62%,#fff,transparent),radial-gradient(1px 1px at 88% 24%,#fde68a,transparent),radial-gradient(1px 1px at 8% 56%,#fff,transparent),radial-gradient(1.5px 1.5px at 55% 82%,#fff,transparent),radial-gradient(1px 1px at 92% 78%,#fff,transparent),radial-gradient(1px 1px at 35% 8%,#fff,transparent);animation:avTw 2.6s ease-in-out infinite alternate}
#av-boot .av-sky.b{background-position:47px 31px;transform:scale(1.2);animation-duration:3.4s;animation-delay:-1s;opacity:.7}
@keyframes avTw{from{opacity:.35}to{opacity:1}}
#av-boot .av-mark{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:-6vh;padding:0 16px;text-align:center}
#av-boot .av-star{width:64px;height:64px;filter:drop-shadow(0 0 14px rgba(251,191,36,.75));animation:avStar 2.4s ease-in-out infinite}
@keyframes avStar{0%,100%{transform:rotate(0) scale(.92)}50%{transform:rotate(90deg) scale(1.1)}}
#av-boot .av-word{font-weight:900;font-size:clamp(28px,8vw,44px);letter-spacing:.06em;color:#fff;line-height:1;white-space:nowrap}
#av-boot .av-word span,#av-boot .av-word b{display:inline-block;animation:avIn .7s cubic-bezier(.2,.8,.2,1) both}
#av-boot .av-word b{color:#fbbf24;font-weight:900;animation-delay:.18s}
@keyframes avIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
#av-boot .av-tag{font-size:clamp(9px,2.6vw,12px);letter-spacing:.38em;color:rgba(251,191,36,.7);padding-left:.38em;animation:avIn .7s .35s both}
#av-boot .av-road{position:absolute;left:0;right:0;bottom:17%;height:44px;background:linear-gradient(#0d0d12,#15151c);border-top:2px solid rgba(251,191,36,.55);border-bottom:2px solid rgba(251,191,36,.55);overflow:hidden;z-index:1}
#av-boot .av-lane{position:absolute;left:0;top:calc(50% - 1.5px);height:3px;width:calc(100% + 44px);background:repeating-linear-gradient(90deg,#fbbf24 0 22px,transparent 22px 44px);animation:avLane .55s linear infinite;opacity:.85}
@keyframes avLane{to{transform:translateX(-44px)}}
#av-boot .av-run{position:absolute;top:50%;left:0;width:26px;height:26px;margin-top:-13px;will-change:transform;animation:avRun var(--d,3s) linear infinite;animation-delay:var(--l,0s)}
#av-boot .av-run svg{width:100%;height:100%;filter:drop-shadow(0 0 6px #fbbf24)}
#av-boot .av-run::before{content:'';position:absolute;right:20px;top:50%;width:70px;height:2px;margin-top:-1px;background:linear-gradient(90deg,transparent,rgba(251,191,36,.9));border-radius:2px}
@keyframes avRun{from{transform:translateX(-120px)}to{transform:translateX(calc(100vw + 40px))}}
#av-boot .av-by{position:absolute;z-index:2;left:0;right:0;bottom:6%;text-align:center;font-size:11px;letter-spacing:.2em;color:rgba(255,255,255,.45);text-transform:uppercase}
#av-boot .av-by b{color:rgba(251,191,36,.85);font-weight:600}
`;

  function starSvg(): string {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}" fill="#fbbf24"/></svg>`;
  }

  function build(): HTMLElement {
    const style = document.createElement("style");
    style.textContent = CSS;
    const el = document.createElement("div");
    el.id = "av-boot";
    el.setAttribute("role", "status");
    el.setAttribute("aria-label", "Loading AVIORCART");
    const runners = [
      { d: "2.6s", l: "0s" },
      { d: "3.4s", l: "-1.1s" },
      { d: "4.2s", l: "-2.3s" },
      { d: "3s", l: "-1.9s" },
    ]
      .map((r) => `<span class="av-run" style="--d:${r.d};--l:${r.l}">${starSvg()}</span>`)
      .join("");
    el.innerHTML =
      `<div class="av-sky"></div><div class="av-sky b"></div>` +
      `<div class="av-mark"><div class="av-star">${starSvg()}</div>` +
      `<div class="av-word"><span>AVIOR</span><b>CART</b></div>` +
      `<div class="av-tag">SHOP BEYOND THE STARS</div></div>` +
      `<div class="av-road"><div class="av-lane"></div>${runners}</div>` +
      `<div class="av-by">by <b>Parth Rajpurohit</b></div>`;
    el.appendChild(style);
    return el;
  }

  let overlay: HTMLElement | null = null;
  let shownAt = 0;
  let showTimer = 0;
  let hidden = false;

  function setFlag(on: boolean): void {
    try {
      if (on) sessionStorage.setItem(FLAG, String(Date.now()));
      else sessionStorage.removeItem(FLAG);
    } catch {
      /* storage unavailable */
    }
  }

  function show(): HTMLElement | null {
    if (overlay || hidden) return overlay;
    const o = build();
    overlay = o;
    root.appendChild(o);
    shownAt = Date.now();
    requestAnimationFrame(() => o.classList.add("on"));
    return o;
  }

  function hide(): void {
    window.clearTimeout(showTimer);
    hidden = true;
    setFlag(false);
    const o = overlay;
    if (!o) return;
    overlay = null;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
    window.setTimeout(() => {
      o.classList.remove("on");
      window.setTimeout(() => o.remove(), 400);
    }, wait);
  }

  let cameFromLoader = false;
  try {
    const t = Number(sessionStorage.getItem(FLAG) ?? "0");
    cameFromLoader = t > 0 && Date.now() - t < 10000;
  } catch {
    cameFromLoader = false;
  }

  if (cameFromLoader) {
    const o = show();
    if (o) o.classList.add("on");
  } else {
    showTimer = window.setTimeout(show, SHOW_AFTER_MS);
  }

  function ready(): void {
    requestAnimationFrame(() => requestAnimationFrame(hide));
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
  window.addEventListener("load", hide);
  window.setTimeout(hide, MAX_WAIT_MS);

  document.addEventListener(
    "click",
    (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.origin !== location.origin) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      window.setTimeout(() => {
        if (document.visibilityState === "visible" && !e.defaultPrevented) {
          hidden = false;
          setFlag(true);
          show();
          window.setTimeout(hide, 12000);
        }
      }, NAV_SHOW_AFTER_MS);
    },
    true,
  );

  window.addEventListener("pageshow", (e: PageTransitionEvent) => {
    if (!e.persisted) return;
    setFlag(false);
    document.getElementById("av-boot")?.remove();
    overlay = null;
  });
})();
