import { useEffect, useRef } from "react";

const W = 384;
const H = 216;

export type SkyMood = "cycle" | "play" | "flood" | "clear";

function cycleProgress(t: number) {
  const period = 960;
  const p = (t % period) / period;
  if (p < 0.2) return 0.04;
  if (p < 0.4) return (p - 0.2) / 0.2;
  if (p < 0.66) return 1;
  if (p < 0.86) return 1 - (p - 0.66) / 0.2;
  return 0.04;
}

function mix(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${r} ${g} ${b})`;
}

export function paintScene(ctx: CanvasRenderingContext2D, t: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < 28; i++) {
    const k = i / 27;
    const r = mix(mix(120, 70, k), mix(18, 10, k), p);
    const g = mix(mix(186, 150, k), mix(28, 18, k), p);
    const b = mix(mix(232, 214, k), mix(52, 36, k), p);
    ctx.fillStyle = rgb(r, g, b);
    ctx.fillRect(0, i * 4, W, 4);
  }

  const sunA = 1 - p;
  if (sunA > 0.04) {
    const sx = 300;
    const sy = 36 + p * 18;
    ctx.globalAlpha = sunA;
    ctx.fillStyle = "#ffe98a";
    ctx.fillRect(sx - 6, sy - 16, 4, 6);
    ctx.fillRect(sx + 10, sy - 16, 4, 6);
    ctx.fillRect(sx - 16, sy - 2, 6, 4);
    ctx.fillRect(sx + 18, sy - 2, 6, 4);
    ctx.fillStyle = "#fff4c4";
    ctx.fillRect(sx - 2, sy - 10, 12, 12);
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(sx, sy - 8, 8, 8);
    ctx.globalAlpha = 1;
  }

  const clouds = [
    [18, 18],
    [70, 30],
    [140, 14],
    [210, 34],
    [280, 16],
  ] as const;
  for (const [x, y] of clouds) {
    const drift = (t * (0.15 + p * 0.35) + x) % 40;
    cloud(ctx, x + drift * 0.15, y, p);
  }

  if (p > 0.55) {
    ctx.globalAlpha = (p - 0.55) * 1.4;
    ctx.fillStyle = "#141820";
    ctx.fillRect(150, 8, 70, 16);
    ctx.fillRect(168, 2, 40, 10);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = p > 0.5 ? "#243044" : "#6ea35a";
  ctx.fillRect(0, 96, W, 18);
  for (let x = 0; x < W; x += 16) {
    const h = 10 + ((x * 3) % 14);
    ctx.fillStyle = p > 0.55 ? "#1c3040" : x % 32 === 0 ? "#3d7a42" : "#2f6a38";
    ctx.fillRect(x, 104 - h, 14, h);
  }

  ctx.fillStyle = p > 0.45 ? "#314838" : "#3f8a45";
  ctx.fillRect(0, 108, W, 70);

  school(ctx, 6, 78, p);
  tree(ctx, 78, 96, 1);
  house(ctx, 98, 92, 34, "#f3d7b0", "#c44738", "#6b3e26", p > 0.4);
  house(ctx, 136, 86, 30, "#f7f1e4", "#3d6ea8", "#243044", p > 0.4);
  kiosco(ctx, 170, 100);
  house(ctx, 196, 90, 36, "#f0c9a0", "#e2a317", "#5c3318", p > 0.4);
  tree(ctx, 236, 98, 0.85);
  house(ctx, 252, 94, 28, "#efe6cf", "#8c4a3a", "#1a120c", p > 0.4);
  church(ctx, 284, 70);
  hospital(ctx, 328, 84);
  lamp(ctx, 92, 108, p);
  lamp(ctx, 230, 110, p);
  lamp(ctx, 360, 108, p);

  ctx.fillStyle = "#8d8474";
  ctx.fillRect(0, 148, W, 6);
  ctx.fillStyle = p > 0.6 ? "#3a4450" : "#5c6570";
  ctx.fillRect(0, 154, W, 16);
  ctx.fillStyle = "#d8d2c4";
  for (let x = 8; x < W; x += 22) ctx.fillRect(x, 160, 8, 2);
  ctx.fillStyle = "#8d8474";
  ctx.fillRect(0, 170, W, 4);

  ctx.fillStyle = "#2f6a38";
  ctx.fillRect(0, 174, W, 42);
  ctx.fillStyle = "#1d4e28";
  for (let x = 4; x < W; x += 10) ctx.fillRect(x, 176, 2, 4);

  if (p > 0.28) {
    const drops = Math.floor(30 + p * 90);
    for (let i = 0; i < drops; i++) {
      const x = (i * 47 + t * (3 + p * 2)) % W;
      const y = (i * 29 + t * (5 + p * 3)) % 200;
      ctx.fillStyle = i % 4 === 0 ? "#e7f7ff" : "#9fd4ee";
      ctx.fillRect(x, y, 1, 4 + (i % 3));
    }
  }

  const waterY = Math.floor(198 - p * 92);
  for (let x = 0; x < W; x++) {
    const wave = Math.sin(x * 0.18 + t * 0.08) * (2 + p * 2) + Math.sin(x * 0.05 - t * 0.04) * 1.4;
    const sy = Math.max(0, Math.floor(waterY + wave));
    ctx.fillStyle = (x + Math.floor(t / 5)) % 8 < 4 ? "#1f6fbe" : "#1860a8";
    ctx.fillRect(x, sy, 1, H - sy);
    ctx.fillStyle = "#d9f4ff";
    if ((x + Math.floor(t / 2)) % 5 === 0) ctx.fillRect(x, sy, 1, 1);
    ctx.fillStyle = "#2f8ed6";
    ctx.fillRect(x, sy + 3, 1, 2);
  }

  if (p > 0.35) {
    const floats: Array<[number, number, string, number]> = [
      [20, 0.6, "#6b4428", 8],
      [90, 0.9, "#cbb892", 6],
      [160, 1.3, "#e25b45", 5],
      [240, 0.7, "#217a3a", 7],
      [310, 1.1, "#f7f1e4", 6],
    ];
    for (const [seed, speed, color, w] of floats) {
      const x = Math.floor((seed + t * speed) % (W + 16)) - 8;
      const y = Math.floor(waterY + 8 + Math.sin(t * 0.06 + seed) * 2);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, 3);
    }
  }

  if (p > 0.72 && t % 150 < 8) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff4c2";
    ctx.fillRect(168, 8, 3, 28);
    ctx.fillRect(158, 20, 18, 3);
    ctx.fillRect(164, 28, 3, 16);
  }

  if (p < 0.25) {
    for (let i = 0; i < 3; i++) {
      const x = (40 + i * 120 + t * 0.45) % (W + 20) - 10;
      const y = 28 + i * 10 + Math.sin(t * 0.05 + i) * 3;
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x + 3, y - 1, 2, 2);
    }
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, p: number) {
  const dark = p > 0.45;
  ctx.fillStyle = dark ? "#4e5c70" : "#f4f7fb";
  ctx.fillRect(x, y + 8, 46, 12);
  ctx.fillRect(x + 8, y + 2, 22, 10);
  ctx.fillRect(x + 24, y, 16, 10);
  ctx.fillStyle = dark ? "#2c3848" : "#d5e2ef";
  ctx.fillRect(x + 4, y + 12, 28, 6);
}

function lamp(ctx: CanvasRenderingContext2D, x: number, y: number, p: number) {
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x, y, 2, 28);
  ctx.fillStyle = p > 0.35 ? "#ffe27a" : "#fff6cf";
  ctx.fillRect(x - 4, y - 4, 10, 5);
  if (p > 0.35) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffe27a";
    ctx.fillRect(x - 8, y, 18, 10);
    ctx.globalAlpha = 1;
  }
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const s = scale;
  ctx.fillStyle = "#6b4428";
  ctx.fillRect(x + 8 * s, y + 18 * s, 4, 16 * s);
  ctx.fillStyle = "#1d6338";
  ctx.fillRect(x, y + 8 * s, 20 * s, 14 * s);
  ctx.fillStyle = "#2f9a4a";
  ctx.fillRect(x + 4 * s, y, 12 * s, 12 * s);
  ctx.fillStyle = "#8dce6a";
  ctx.fillRect(x + 6 * s, y + 4 * s, 4, 4);
}

function house(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  wall: string,
  roof: string,
  door: string,
  lit: boolean,
) {
  ctx.fillStyle = roof;
  ctx.fillRect(x - 2, y + 6, w + 4, 4);
  ctx.fillRect(x + 2, y + 2, w - 4, 4);
  ctx.fillRect(x + 6, y - 2, w - 12, 4);
  ctx.fillStyle = "#6b3a32";
  ctx.fillRect(x + w - 12, y - 10, 6, 12);
  ctx.fillStyle = "#3a241c";
  ctx.fillRect(x + w - 12, y - 12, 8, 3);
  ctx.fillStyle = wall;
  ctx.fillRect(x, y + 10, w, 38);
  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.fillRect(x + w - 3, y + 10, 3, 38);
  const glass = lit ? "#ffe27a" : "#9fd4ee";
  ctx.fillStyle = glass;
  ctx.fillRect(x + 4, y + 16, 8, 8);
  ctx.fillRect(x + w - 14, y + 16, 8, 8);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 7, y + 16, 1, 8);
  ctx.fillRect(x + 4, y + 19, 8, 1);
  ctx.fillRect(x + w - 11, y + 16, 1, 8);
  ctx.fillStyle = door;
  ctx.fillRect(x + w / 2 - 4, y + 30, 8, 18);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x + w / 2 + 1, y + 38, 2, 2);
  ctx.fillStyle = "#3e9a48";
  ctx.fillRect(x + 3, y + 25, 10, 3);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + 5, y + 23, 2, 3);
  ctx.fillRect(x + 9, y + 23, 2, 3);
  ctx.fillStyle = "#cbb892";
  ctx.fillRect(x - 2, y + 44, w + 6, 4);
}

function school(ctx: CanvasRenderingContext2D, x: number, y: number, p: number) {
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + 4, y + 16, 58, 6);
  ctx.fillRect(x + 10, y + 12, 46, 4);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 30, y, 2, 16);
  ctx.fillStyle = p > 0.5 ? "#8ea4c0" : "#ffd23f";
  ctx.fillRect(x + 32, y + 2, 10, 6);
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(x + 6, y + 22, 54, 40);
  ctx.fillStyle = "#d7c9a4";
  ctx.fillRect(x + 6, y + 22, 54, 4);
  ctx.fillStyle = "#7ec8ea";
  for (let col = 0; col < 4; col++) ctx.fillRect(x + 12 + col * 12, y + 30, 7, 8);
  ctx.fillStyle = "#6b3e26";
  ctx.fillRect(x + 28, y + 44, 10, 18);
  ctx.fillStyle = "#3e9a48";
  ctx.fillRect(x, y + 58, 66, 6);
  ctx.fillStyle = "#f0c9a0";
  ctx.fillRect(x + 16, y + 50, 4, 8);
  ctx.fillRect(x + 46, y + 50, 4, 8);
  ctx.fillStyle = "#3d7ec4";
  ctx.fillRect(x + 16, y + 52, 4, 4);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + 46, y + 52, 4, 4);
}

function kiosco(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x - 2, y, 26, 5);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 2, y + 1, 8, 2);
  ctx.fillStyle = "#3d7ec4";
  ctx.fillRect(x, y + 5, 22, 20);
  ctx.fillStyle = "#d9f4ff";
  ctx.fillRect(x + 2, y + 8, 18, 8);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x + 4, y + 10, 3, 4);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + 9, y + 10, 3, 4);
  ctx.fillStyle = "#3e9a48";
  ctx.fillRect(x + 14, y + 10, 3, 4);
}

function church(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 16, y, 3, 16);
  ctx.fillRect(x + 12, y + 4, 11, 3);
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(x + 10, y + 16, 16, 18);
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(x + 2, y + 30, 36, 6);
  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(x + 4, y + 36, 32, 28);
  ctx.fillStyle = "#7ec8ea";
  ctx.fillRect(x + 14, y + 20, 8, 8);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x + 8, y + 42, 6, 8);
  ctx.fillRect(x + 26, y + 42, 6, 8);
  ctx.fillStyle = "#6b3e26";
  ctx.fillRect(x + 16, y + 48, 8, 16);
}

function hospital(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(x, y + 8, 48, 52);
  ctx.fillStyle = "#d4534a";
  ctx.fillRect(x, y + 8, 48, 6);
  ctx.fillStyle = "#ff5a4e";
  ctx.fillRect(x + 20, y + 20, 8, 18);
  ctx.fillRect(x + 14, y + 26, 20, 6);
  ctx.fillStyle = "#7ec8ea";
  ctx.fillRect(x + 4, y + 36, 8, 8);
  ctx.fillRect(x + 36, y + 36, 8, 8);
  ctx.fillRect(x + 4, y + 50, 8, 6);
  ctx.fillRect(x + 36, y + 50, 8, 6);
  ctx.fillStyle = "#e8eef2";
  ctx.fillRect(x + 6, y + 58, 22, 10);
  ctx.fillStyle = "#d4534a";
  ctx.fillRect(x + 8, y + 60, 16, 4);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 8, y + 66, 3, 4);
  ctx.fillRect(x + 22, y + 66, 3, 4);
}

export function WorldBackdrop({ mood }: { mood: SkyMood }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    let progress = mood === "flood" ? 0.4 : mood === "clear" ? 0.9 : 0.05;

    const frame = () => {
      t += 1;
      const mode = moodRef.current;
      if (mode === "cycle") progress = cycleProgress(t);
      else if (mode === "play") progress += (0.2 - progress) * 0.05;
      else if (mode === "flood") progress += (1 - progress) * 0.02;
      else progress += (0.02 - progress) * 0.02;
      paintScene(ctx, t, progress);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [mood]);

  return (
    <div className="world-bg" aria-hidden="true">
      <canvas ref={ref} className="town" />
      <div className="world-dim" />
    </div>
  );
}

export function FinaleScene({ won }: { won: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let t = 0;
    let progress = won ? 0.92 : 0.2;
    const target = won ? 0 : 1;
    const frame = () => {
      t += 1;
      progress += (target - progress) * (won ? 0.012 : 0.016);
      paintScene(ctx, t + 200, progress);
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, [won]);

  return <canvas ref={ref} className="finale-view" aria-hidden="true" />;
}
