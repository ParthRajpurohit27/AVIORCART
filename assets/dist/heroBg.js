"use strict";
(function () {
    const ICONS = [
        '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
        '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.2"/>',
        '<circle cx="12" cy="12" r="6"/><path d="M12 9v3l1.5 1.5"/><path d="M16.5 17.5l-.5 3.5h-8l-.5-3.5"/><path d="M7.5 6.5L8 3h8l.5 3.5"/>',
        '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
        '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
        '<path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
        '<path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3L8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
        '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    ];
    function rand(min, max) {
        return min + Math.random() * (max - min);
    }
    function spawn(layer, rise) {
        const node = document.createElement("span");
        node.className = "hero-float";
        const size = Math.round(rand(26, 54));
        node.style.left = `${rand(0, 96)}%`;
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        node.style.setProperty("--o", rand(0.16, 0.38).toFixed(2));
        node.style.setProperty("--dur", `${rand(18, 36).toFixed(1)}s`);
        node.style.setProperty("--rise", `-${rise}px`);
        node.style.setProperty("--sway", `${rand(-50, 50).toFixed(0)}px`);
        node.style.setProperty("--spin", `${rand(-40, 40).toFixed(0)}deg`);
        node.style.animationDelay = `-${rand(0, 36).toFixed(1)}s`;
        const icon = ICONS[Math.floor(Math.random() * ICONS.length)] ?? ICONS[0] ?? "";
        node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;
        layer.appendChild(node);
    }
    document.addEventListener("DOMContentLoaded", () => {
        const layer = document.getElementById("hero-bg");
        if (!layer)
            return;
        const mobile = window.innerWidth < 768;
        window.AviorSky?.start(layer, mobile
            ? { density: 9000, maxStars: 70, minStars: 40, dprCap: 1.5, shotMinMs: 2500, shotMaxMs: 5500 }
            : { density: 8000, maxStars: 160, minStars: 60, shotMinMs: 2000, shotMaxMs: 4800 });
        const rise = Math.round(layer.getBoundingClientRect().height || 420) + 120;
        const count = mobile ? 7 : 13;
        for (let i = 0; i < count; i++)
            spawn(layer, rise);
    });
})();
