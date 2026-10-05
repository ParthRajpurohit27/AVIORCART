/* AVIORCART storefront: live theme + seasonal overlay from dashboard (Supabase store_settings) */

(function (): void {
  const URL_BASE = "https://pgcsmotbkzrnnfuduaje.supabase.co";
  const ANON = "sb_publishable_58zPiYnUzw3E8ZizcctkVw_MGgtVZwi";
  const CACHE_KEY = "av_theme_v1";
  const STYLE_ID = "av-live-theme";

  type Overlay = "none" | "snowfall" | "sparkles" | "sakura";

  interface LiveTheme {
    name: string;
    variables: Record<string, string>;
    customCSS: string;
    overlay: Overlay;
  }

  function isOverlay(v: unknown): v is Overlay {
    return v === "none" || v === "snowfall" || v === "sparkles" || v === "sakura";
  }

  function parse(raw: unknown): LiveTheme | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const vars: Record<string, string> = {};
    if (o.variables && typeof o.variables === "object") {
      const src = o.variables as Record<string, unknown>;
      Object.keys(src).forEach(function (k) {
        const val = src[k];
        if (/^--[a-z0-9-]+$/i.test(k) && typeof val === "string") vars[k] = val;
      });
    }
    return {
      name: typeof o.name === "string" ? o.name : "theme",
      variables: vars,
      customCSS: typeof o.customCSS === "string" ? o.customCSS : "",
      overlay: isOverlay(o.overlay) ? o.overlay : "none",
    };
  }

  function applyCss(t: LiveTheme): void {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    let css = ":root{";
    Object.keys(t.variables).forEach(function (k) {
      css += k + ":" + t.variables[k] + ";";
    });
    css += "}\n" + t.customCSS;
    el.textContent = css;
  }

  /* ---------- overlays ---------- */
  interface P {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
    a: number;
    ph: number;
  }

  let canvas: HTMLCanvasElement | null = null;
  let raf = 0;
  let running: Overlay = "none";

  function stopOverlay(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    running = "none";
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
  }

  function startOverlay(kind: Overlay): void {
    if (kind === running) return;
    stopOverlay();
    if (kind === "none") return;
    if (/checkout|order-success|order-failure/.test(location.pathname)) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9990";
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    canvas = c;
    running = kind;

    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mobile = window.innerWidth < 700;
    const count = kind === "snowfall" ? (mobile ? 45 : 90) : (mobile ? 28 : 55);
    const parts: P[] = [];

    function size(): void {
      W = window.innerWidth;
      H = window.innerHeight;
      c.width = Math.floor(W * dpr);
      c.height = Math.floor(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function make(initial: boolean): P {
      const r = kind === "snowfall" ? 1.2 + Math.random() * 2.6 : kind === "sakura" ? 4 + Math.random() * 4 : 1 + Math.random() * 2.4;
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : -10,
        r,
        vx: (Math.random() - 0.5) * 0.6,
        vy: kind === "sparkles" ? 0.2 + Math.random() * 0.6 : 0.5 + Math.random() * 1.1,
        a: 0.4 + Math.random() * 0.6,
        ph: Math.random() * Math.PI * 2,
      };
    }
    size();
    for (let i = 0; i < count; i++) parts.push(make(true));
    window.addEventListener("resize", size);

    let t = 0;
    function frame(): void {
      if (running !== kind) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      t += 0.016;
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.y += p.vy;
        p.x += p.vx + Math.sin(t + p.ph) * 0.4;
        if (p.y > H + 12 || p.x < -20 || p.x > W + 20) parts[i] = make(false);
        if (kind === "snowfall") {
          ctx!.beginPath();
          ctx!.fillStyle = "rgba(255,255,255," + p.a.toFixed(2) + ")";
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        } else if (kind === "sparkles") {
          const tw = 0.5 + 0.5 * Math.sin(t * 3 + p.ph);
          ctx!.fillStyle = "rgba(251,191,36," + (p.a * tw).toFixed(2) + ")";
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y - p.r * 2);
          ctx!.lineTo(p.x + p.r * 0.5, p.y - p.r * 0.5);
          ctx!.lineTo(p.x + p.r * 2, p.y);
          ctx!.lineTo(p.x + p.r * 0.5, p.y + p.r * 0.5);
          ctx!.lineTo(p.x, p.y + p.r * 2);
          ctx!.lineTo(p.x - p.r * 0.5, p.y + p.r * 0.5);
          ctx!.lineTo(p.x - p.r * 2, p.y);
          ctx!.lineTo(p.x - p.r * 0.5, p.y - p.r * 0.5);
          ctx!.closePath();
          ctx!.fill();
        } else {
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(t + p.ph);
          ctx!.fillStyle = "rgba(244,114,182," + (p.a * 0.85).toFixed(2) + ")";
          ctx!.beginPath();
          ctx!.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
      }
    }
    frame();
  }

  function apply(t: LiveTheme): void {
    applyCss(t);
    const go = function (): void {
      startOverlay(t.overlay);
    };
    if (document.body) go();
    else document.addEventListener("DOMContentLoaded", go);
  }

  /* cached first (instant), then refresh from cloud */
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const t = parse(JSON.parse(cached));
      if (t) apply(t);
    }
  } catch (_e) {
    /* ignore */
  }

  fetch(URL_BASE + "/rest/v1/store_settings?key=eq.active_theme&select=value", {
    headers: { apikey: ANON, Authorization: "Bearer " + ANON },
  })
    .then(function (r) {
      return r.ok ? r.json() : [];
    })
    .then(function (rows: unknown) {
      if (!Array.isArray(rows) || !rows.length) return;
      const row = rows[0] as { value?: unknown };
      const t = parse(row.value);
      if (!t) return;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(t));
      } catch (_e) {
        /* ignore */
      }
      apply(t);
    })
    .catch(function () {
      /* offline: cached theme stays */
    });
})();
