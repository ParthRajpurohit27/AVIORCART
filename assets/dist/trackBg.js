"use strict";
(function () {
    const ITEMS = [
        { icon: "📦", weight: 6 },
        { icon: "🛍️", weight: 2 },
        { icon: "👗", weight: 1 },
        { icon: "⌚", weight: 1 },
        { icon: "💄", weight: 1 },
        { icon: "👟", weight: 1 },
        { icon: "💍", weight: 1 },
        { icon: "🔋", weight: 1 },
        { icon: "🏠", weight: 1 },
        { icon: "🚚", weight: 2 },
    ];
    const FLOAT_COUNT = window.innerWidth < 640 ? 12 : 22;
    function rand(min, max) {
        return min + Math.random() * (max - min);
    }
    function pickIcon() {
        const total = ITEMS.reduce((sum, i) => sum + i.weight, 0);
        let r = Math.random() * total;
        for (const item of ITEMS) {
            r -= item.weight;
            if (r <= 0)
                return item.icon;
        }
        return "📦";
    }
    function spawnFloat(layer) {
        const node = document.createElement("span");
        node.className = "track-float";
        node.textContent = pickIcon();
        const depth = rand(0, 1);
        node.style.left = `${rand(-2, 98)}%`;
        node.style.fontSize = `${Math.round(18 + depth * 32)}px`;
        node.style.opacity = (0.16 + depth * 0.3).toFixed(2);
        node.style.filter = `blur(${((1 - depth) * 1.5).toFixed(1)}px)`;
        node.style.setProperty("--dur", `${rand(16, 34).toFixed(1)}s`);
        node.style.setProperty("--sway", `${rand(-60, 60).toFixed(0)}px`);
        node.style.setProperty("--spin", `${rand(-200, 200).toFixed(0)}deg`);
        node.style.animationDelay = `-${rand(0, 34).toFixed(1)}s`;
        layer.appendChild(node);
    }
    function startSky(layer) {
        const canvas = document.createElement("canvas");
        canvas.className = "track-canvas";
        layer.insertBefore(canvas, layer.firstChild);
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        const g = ctx;
        let w = 0;
        let h = 0;
        const stars = [];
        const shooters = [];
        function newStar() {
            const big = Math.random() < 0.12;
            return {
                x: Math.random(),
                y: Math.random(),
                r: big ? rand(1.4, 2.2) : rand(0.4, 1.3),
                a: rand(0.35, 1),
                speed: rand(0.8, 3),
                phase: rand(0, Math.PI * 2),
                spark: big,
                warm: Math.random() < 0.25,
            };
        }
        function resize() {
            const rect = layer.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            const wanted = Math.min(220, Math.max(70, Math.round((w * h) / 7500)));
            while (stars.length < wanted)
                stars.push(newStar());
        }
        function spawnShooter() {
            const angle = rand(18, 38) * (Math.PI / 180);
            const speed = rand(520, 900);
            shooters.push({
                x: rand(w * 0.25, w * 1.05),
                y: rand(-40, h * 0.4),
                vx: -Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                len: rand(110, 220),
                gold: Math.random() < 0.55,
            });
        }
        function drawStar(s, t) {
            const tw = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
            const alpha = s.a * tw;
            const x = s.x * w;
            const y = s.y * h;
            g.fillStyle = s.warm ? `rgba(253,224,130,${alpha})` : `rgba(255,255,255,${alpha})`;
            g.beginPath();
            g.arc(x, y, s.r, 0, Math.PI * 2);
            g.fill();
            if (s.spark) {
                const L = s.r * 4.5 * tw;
                g.strokeStyle = s.warm ? `rgba(251,191,36,${alpha * 0.8})` : `rgba(255,255,255,${alpha * 0.7})`;
                g.lineWidth = 0.8;
                g.beginPath();
                g.moveTo(x - L, y);
                g.lineTo(x + L, y);
                g.moveTo(x, y - L);
                g.lineTo(x, y + L);
                g.stroke();
            }
        }
        function drawShooter(s) {
            const speed = Math.hypot(s.vx, s.vy);
            const tx = s.x - (s.vx / speed) * s.len;
            const ty = s.y - (s.vy / speed) * s.len;
            const grad = g.createLinearGradient(s.x, s.y, tx, ty);
            const c = s.gold ? "251,191,36" : "255,255,255";
            grad.addColorStop(0, `rgba(${c},0.95)`);
            grad.addColorStop(1, `rgba(${c},0)`);
            g.strokeStyle = grad;
            g.lineWidth = 2;
            g.lineCap = "round";
            g.beginPath();
            g.moveTo(s.x, s.y);
            g.lineTo(tx, ty);
            g.stroke();
            g.save();
            g.shadowColor = s.gold ? "#fbbf24" : "#ffffff";
            g.shadowBlur = 10;
            g.fillStyle = "#fff";
            g.beginPath();
            g.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
        let last = performance.now();
        let nextShot = last + 700;
        function frame(now) {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            const t = now / 1000;
            g.clearRect(0, 0, w, h);
            stars.forEach((s) => drawStar(s, t));
            if (now >= nextShot) {
                spawnShooter();
                nextShot = now + rand(1400, 3800);
            }
            for (let i = shooters.length - 1; i >= 0; i--) {
                const s = shooters[i];
                if (!s)
                    continue;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                if (s.x < -s.len || s.y > h + s.len) {
                    shooters.splice(i, 1);
                    continue;
                }
                drawShooter(s);
            }
            requestAnimationFrame(frame);
        }
        resize();
        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(() => resize()).observe(layer);
        }
        else {
            window.addEventListener("resize", resize);
        }
        window.addEventListener("track:delivered", () => {
            for (let i = 0; i < 12; i++)
                window.setTimeout(spawnShooter, i * 140);
        });
        requestAnimationFrame(frame);
    }
    document.addEventListener("DOMContentLoaded", () => {
        const layer = document.getElementById("track-bg");
        if (!layer)
            return;
        startSky(layer);
        for (let i = 0; i < FLOAT_COUNT; i++)
            spawnFloat(layer);
    });
})();
