/* tracking page background: shared sky + floating parcels/products */

(function (): void {
  interface FloatItem {
    icon: string;
    weight: number;
  }

  const ITEMS: readonly FloatItem[] = [
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

  const FLOAT_COUNT = window.innerWidth < 640 ? 10 : 20;

  function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  function pickIcon(): string {
    const total = ITEMS.reduce((sum, i) => sum + i.weight, 0);
    let r = Math.random() * total;
    for (const item of ITEMS) {
      r -= item.weight;
      if (r <= 0) return item.icon;
    }
    return "📦";
  }

  function spawnFloat(layer: HTMLElement): void {
    const node = document.createElement("span");
    node.className = "track-float";
    node.textContent = pickIcon();
    const depth = rand(0, 1);
    node.style.left = `${rand(-2, 98)}%`;
    node.style.fontSize = `${Math.round(18 + depth * 32)}px`;
    node.style.opacity = (0.16 + depth * 0.3).toFixed(2);
    node.style.setProperty("--dur", `${rand(16, 34).toFixed(1)}s`);
    node.style.setProperty("--sway", `${rand(-60, 60).toFixed(0)}px`);
    node.style.setProperty("--spin", `${rand(-200, 200).toFixed(0)}deg`);
    node.style.animationDelay = `-${rand(0, 34).toFixed(1)}s`;
    layer.appendChild(node);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const layer = document.getElementById("track-bg");
    if (!layer) return;
    const mobile = window.innerWidth < 640;
    const sky = window.AviorSky?.start(layer, mobile ? { density: 11000, maxStars: 90, dprCap: 1.5 } : {});
    window.addEventListener("track:delivered", () => sky?.burst(12));
    for (let i = 0; i < FLOAT_COUNT; i++) spawnFloat(layer);
  });
})();
