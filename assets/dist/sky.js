"use strict";
(function () {
    function rand(min, max) {
        return min + Math.random() * (max - min);
    }
    function start(layer, opts = {}) {
        const density = opts.density ?? 7500;
        const maxStars = opts.maxStars ?? 220;
        const minStars = opts.minStars ?? 70;
        const shotMin = opts.shotMinMs ?? 1400;
        const shotMax = opts.shotMaxMs ?? 3800;
        const dprCap = opts.dprCap ?? 2;
        const canvas = document.createElement("canvas");
        canvas.className = "av-sky-canvas";
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
        layer.insertBefore(canvas, layer.firstChild);
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return null;
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
            const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
            w = rect.width;
            h = rect.height;
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            const wanted = Math.min(maxStars, Math.max(minStars, Math.round((w * h) / density)));
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
            g.fillStyle = "#fff";
            g.beginPath();
            g.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
            g.fill();
        }
        let last = performance.now();
        let nextShot = last + 700;
        let running = false;
        let visible = true;
        function frame(now) {
            if (!running)
                return;
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            const t = now / 1000;
            g.clearRect(0, 0, w, h);
            stars.forEach((s) => drawStar(s, t));
            if (now >= nextShot) {
                spawnShooter();
                nextShot = now + rand(shotMin, shotMax);
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
        function play() {
            if (running || !visible || document.hidden)
                return;
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }
        function pause() {
            running = false;
        }
        resize();
        if (typeof ResizeObserver !== "undefined") {
            new ResizeObserver(() => resize()).observe(layer);
        }
        else {
            window.addEventListener("resize", resize);
        }
        if (typeof IntersectionObserver !== "undefined") {
            new IntersectionObserver((entries) => {
                visible = entries.some((e) => e.isIntersecting);
                if (visible)
                    play();
                else
                    pause();
            }).observe(layer);
        }
        document.addEventListener("visibilitychange", () => {
            if (document.hidden)
                pause();
            else
                play();
        });
        play();
        return {
            burst(count) {
                for (let i = 0; i < count; i++)
                    window.setTimeout(spawnShooter, i * 140);
            },
        };
    }
    window.AviorSky = { start };
})();
