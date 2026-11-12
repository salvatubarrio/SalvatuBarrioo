import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Maximize2, Minimize2, Music, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { audio } from "@/game/audio";
import { submitArcadeBest, type RankRow, type RankSnapshot } from "@/game/ranking";
import { ArcadeRankList } from "@/components/barrio/rank-list";
import {
  createSkyWorld,
  extendSkyWorld,
  skyScore,
  updateMovingPlatforms,
  type SkyPlatform,
  type SkyPickup,
  type SkyWorld,
} from "@/game/sky-jump";

type EndCause = "water" | "glass";
type GameEnd = {
  score: number;
  height: number;
  time: number;
  previous: number;
  best: number;
  rank: number;
  pending: boolean;
  failed: boolean;
  isRecord: boolean;
  cause: EndCause;
};
type Player = { x: number; y: number; vx: number; vy: number; highest: number; shield: boolean; bonus: number };
type GameState = {
  world: SkyWorld;
  player: Player;
  camera: number;
  flood: number;
  elapsed: number;
  score: number;
  started: boolean;
  dead: boolean;
};

const W = 320;
const H = 480;
const GRAVITY = 980;
const BOUNCE = 560;
const PLAYER_W = 25;
const PLAYER_H = 30;

function createGame(seed = Math.floor(Math.random() * 0xffffffff)): GameState {
  return {
    world: createSkyWorld(seed),
    player: { x: 160, y: 0, vx: 0, vy: BOUNCE, highest: 0, shield: false, bonus: 0 },
    camera: 0,
    flood: -108,
    elapsed: 0,
    score: 0,
    started: true,
    dead: false,
  };
}

function pixel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawSkyline(ctx: CanvasRenderingContext2D, time: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#18243b");
  sky.addColorStop(0.48, "#566477");
  sky.addColorStop(1, "#9aa0a0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Buenos Aires lejana: el desenfoque queda en el horizonte, no en las plataformas.
  ctx.save();
  ctx.filter = "blur(3px)";
  const buildings = [
    [0, 188, 42, 160], [34, 160, 38, 190], [65, 196, 48, 150], [105, 145, 44, 205],
    [143, 184, 46, 165], [182, 154, 48, 195], [222, 176, 44, 175], [258, 142, 62, 210],
  ];
  for (let i = 0; i < buildings.length; i++) {
    const [x, y, width, height] = buildings[i]!;
    pixel(ctx, x, y, width, height, i % 2 ? "#27364a" : "#344358");
    pixel(ctx, x + 4, y + 8, width - 8, 5, "#586274");
    for (let wy = y + 22; wy < y + height - 8; wy += 19) {
      for (let wx = x + 7; wx < x + width - 5; wx += 12) {
        pixel(ctx, wx, wy, 4, 7, ((wx + wy + i) % 3 === 0) ? "#d4ba83" : "#72808b");
      }
    }
    if (i % 3 === 0) pixel(ctx, x + width / 2 - 1, y - 12, 2, 13, "#28364b");
  }
  // Obelisco como silueta, apenas visible entre edificios.
  pixel(ctx, 244, 104, 8, 80, "#d7d1bd");
  pixel(ctx, 246, 88, 4, 18, "#d7d1bd");
  pixel(ctx, 242, 106, 12, 3, "#b4b5ae");
  // Cúpula de un edificio porteño.
  pixel(ctx, 77, 177, 26, 16, "#6b7780");
  pixel(ctx, 82, 168, 16, 10, "#879197");
  pixel(ctx, 88, 161, 5, 8, "#a7aaa3");
  ctx.restore();

  // Nubes de tormenta en capas.
  for (let i = 0; i < 7; i++) {
    const x = ((i * 61 - time * (5 + i)) % (W + 100)) - 50;
    const y = 28 + (i % 3) * 34;
    ctx.fillStyle = i % 2 ? "rgba(21,31,49,.35)" : "rgba(33,42,59,.48)";
    ctx.fillRect(x, y + 8, 74, 15);
    ctx.fillRect(x + 10, y, 42, 23);
    ctx.fillRect(x + 23, y - 5, 26, 28);
  }
  const glow = 0.035 + Math.max(0, Math.sin(time * 0.19)) * 0.025;
  ctx.fillStyle = `rgba(226,235,244,${glow})`;
  ctx.fillRect(0, 0, W, H);
}

function drawPlatform(ctx: CanvasRenderingContext2D, p: SkyPlatform, sy: number, _time: number) {
  const x = Math.round(p.x);
  const y = Math.round(sy);
  const w = Math.round(p.width);
  if (p.kind === "airplane") {
    pixel(ctx, x + 5, y + 10, w - 10, 7, "#283c57");
    pixel(ctx, x + 12, y + 5, w - 25, 10, "#e7e3d6");
    pixel(ctx, x + w * 0.36, y + 1, w * 0.34, 5, "#b9c7ce");
    pixel(ctx, x + w * 0.18, y + 11, w * 0.64, 5, "#e7e3d6");
    pixel(ctx, x + w * 0.46, y - 3, 8, 8, "#e7e3d6");
    pixel(ctx, x + 12, y + 5, 9, 3, "#69a1c7");
    pixel(ctx, x + w - 19, y + 5, 9, 3, "#69a1c7");
    pixel(ctx, x + 8, y + 16, w - 16, 2, "#ffd34e");
    return;
  }

  pixel(ctx, x + 3, y + 9, w - 6, 7, "rgba(8,16,26,.45)");
  if (p.kind === "taxi") {
    pixel(ctx, x + 1, y + 5, w - 2, 9, "#252d39");
    pixel(ctx, x + 4, y + 2, w - 8, 8, "#e8bd45");
    pixel(ctx, x + 10, y + 3, 12, 5, "#9dc0d2");
    pixel(ctx, x + 29, y + 3, 12, 5, "#9dc0d2");
    for (let cx = x + 7; cx < x + w - 7; cx += 10) pixel(ctx, cx, y + 10, 5, 2, "#31323a");
    pixel(ctx, x + 2, y + 11, w - 4, 3, "#f4d45e");
  } else if (p.kind === "colectivo") {
    pixel(ctx, x + 1, y + 6, w - 2, 9, "#d9d7c8");
    pixel(ctx, x + 3, y + 2, w - 6, 7, "#f0e5cd");
    pixel(ctx, x + 5, y + 3, w - 10, 4, "#7da7b5");
    pixel(ctx, x + 1, y + 9, w - 2, 3, "#c94c43");
    pixel(ctx, x + 1, y + 13, w - 2, 3, "#4c5c6b");
    for (let bx = x + 8; bx < x + w - 5; bx += 15) pixel(ctx, bx, y + 15, 7, 2, "#252d39");
  } else if (p.kind === "balcony") {
    pixel(ctx, x, y + 5, w, 10, "#8e5947");
    pixel(ctx, x + 2, y + 2, w - 4, 5, "#e8c8a1");
    pixel(ctx, x + 5, y + 5, w - 10, 2, "#f2e5c9");
    for (let bx = x + 7; bx < x + w - 5; bx += 9) pixel(ctx, bx, y + 7, 2, 7, "#35434c");
    pixel(ctx, x + 2, y + 13, w - 4, 3, "#6f4b3f");
  } else if (p.kind === "awning") {
    pixel(ctx, x + 1, y + 8, w - 2, 7, "#603f3a");
    pixel(ctx, x + 2, y + 3, w - 4, 7, "#e1e0d2");
    for (let ax = x + 3; ax < x + w - 3; ax += 12) {
      pixel(ctx, ax, y + 3, 6, 7, "#ba4c45");
      pixel(ctx, ax + 6, y + 3, 6, 7, "#f0d8b8");
    }
    pixel(ctx, x + 1, y + 10, w - 2, 2, "#f4d8b1");
  } else {
    pixel(ctx, x, y + 7, w, 8, "#555d63");
    pixel(ctx, x + 2, y + 3, w - 4, 7, "#b9b5a7");
    pixel(ctx, x + 6, y + 4, w - 12, 2, "#d8d4c4");
    for (let tx = x + 15; tx < x + w - 10; tx += 21) {
      pixel(ctx, tx, y + 9, 9, 2, "#878b83");
    }
    pixel(ctx, x + 1, y + 13, w - 2, 3, "#4a5157");
  }

  if (p.hazard) {
    // Vidrios rotos: reflejos celestes y puntas claramente visibles.
    for (let gx = x + 9; gx < x + w - 8; gx += 15) {
      ctx.fillStyle = "#bce8f0";
      ctx.beginPath();
      ctx.moveTo(gx, y + 2);
      ctx.lineTo(gx + 4, y - 6);
      ctx.lineTo(gx + 7, y + 2);
      ctx.closePath();
      ctx.fill();
      pixel(ctx, gx + 3, y - 1, 1, 4, "#f3fbff");
    }
    pixel(ctx, x + 4, y + 1, w - 8, 2, "#d4f2f4");
  }
}

function drawPickup(ctx: CanvasRenderingContext2D, p: SkyPickup, sx: number, sy: number, t: number) {
  const bob = Math.sin(t * 4 + p.id) * 3;
  const x = Math.round(sx);
  const y = Math.round(sy + bob);
  if (p.kind === "balloon") {
    pixel(ctx, x - 2, y + 12, 4, 9, "#e4d7bd");
    pixel(ctx, x - 8, y - 8, 16, 18, "#e65e68");
    pixel(ctx, x - 5, y - 12, 10, 5, "#f07c7c");
    pixel(ctx, x - 4, y - 5, 3, 5, "#ffc0a6");
    pixel(ctx, x - 2, y + 10, 4, 3, "#b94758");
  } else {
    for (let a = 0; a < 8; a++) {
      const angle = a * Math.PI / 4;
      const rx = Math.cos(angle) * 14;
      const ry = Math.sin(angle) * 14;
      pixel(ctx, x + rx - 2, y + ry - 2, 4, 4, "#ffd34c");
    }
    pixel(ctx, x - 10, y - 10, 20, 20, "#f7c943");
    pixel(ctx, x - 7, y - 7, 14, 14, "#f9e48a");
    pixel(ctx, x - 4, y - 3, 2, 2, "#63472c");
    pixel(ctx, x + 3, y - 3, 2, 2, "#63472c");
    pixel(ctx, x - 4, y + 3, 8, 2, "#b56b3d");
  }
}

function drawTurtle(ctx: CanvasRenderingContext2D, x: number, footY: number, t: number, shield: boolean) {
  const y = Math.round(footY - PLAYER_H);
  const step = Math.sin(t * 13) > 0 ? 1 : 0;
  if (shield) {
    ctx.strokeStyle = "rgba(255,211,76,.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 15, 22 + Math.sin(t * 7) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Caparazón y patitas.
  pixel(ctx, x - 13, y + 10, 14, 14, "#574335");
  pixel(ctx, x - 11, y + 8, 13, 14, "#7c593d");
  pixel(ctx, x - 8, y + 11, 8, 8, "#9b7750");
  pixel(ctx, x - 10, y + 20, 6, 7, "#558e58");
  pixel(ctx, x + 3, y + 20 + step, 6, 7, "#558e58");
  // Piloto amarillo, pañuelo rojo y cabeza de tortuga original.
  pixel(ctx, x - 5, y + 14, 15, 12, "#d8a83c");
  pixel(ctx, x - 4, y + 17, 13, 7, "#efc65c");
  pixel(ctx, x + 4, y + 5, 12, 12, "#57975d");
  pixel(ctx, x + 8, y + 2, 7, 7, "#6bac68");
  pixel(ctx, x + 10, y + 7, 2, 3, "#f4f0cf");
  pixel(ctx, x + 11, y + 8, 1, 1, "#182535");
  pixel(ctx, x + 14, y + 12, 3, 2, "#e6a17e");
  pixel(ctx, x + 1, y + 13, 11, 3, "#bb4746");
  pixel(ctx, x + 6, y + 14, 4, 5, "#d85b50");
  pixel(ctx, x - 2, y + 24, 6, 4, "#4a8050");
  pixel(ctx, x + 6, y + 24, 6, 4, "#4a8050");
}

function drawRain(ctx: CanvasRenderingContext2D, time: number, intensity: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(210,229,239,.36)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 54; i++) {
    const x = (i * 67 + Math.floor(time * 190 * (1 + (i % 3) * 0.2))) % W;
    const y = (i * 43 + Math.floor(time * 255)) % H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3, y + 9 + intensity * 5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlood(ctx: CanvasRenderingContext2D, surfaceY: number, time: number) {
  const y = Math.max(0, Math.min(H, surfaceY));
  if (y >= H) return;
  const water = ctx.createLinearGradient(0, y, 0, H);
  water.addColorStop(0, "rgba(69,158,185,.92)");
  water.addColorStop(0.35, "rgba(33,109,151,.97)");
  water.addColorStop(1, "#143d68");
  ctx.fillStyle = water;
  ctx.fillRect(0, y, W, H - y);
  ctx.fillStyle = "rgba(203,241,243,.75)";
  for (let x = 0; x < W; x += 24) {
    const wave = Math.sin(x * 0.075 + time * 4) * 3;
    pixel(ctx, x, y + wave, 13, 2, "rgba(220,248,247,.75)");
    pixel(ctx, x + 12, y + wave + 3, 6, 1, "rgba(135,215,224,.55)");
  }
  for (let i = 0; i < 13; i++) {
    const fx = (i * 41 + time * 22) % W;
    const fy = y + 20 + ((i * 29) % Math.max(25, H - y - 15));
    pixel(ctx, fx, fy, 4, 2, "rgba(183,228,233,.38)");
  }
}

function drawScene(ctx: CanvasRenderingContext2D, game: GameState, time: number) {
  drawSkyline(ctx, time);
  const camera = game.camera;
  for (const p of game.world.platforms) {
    const sy = 440 - (p.height - camera);
    if (sy < -35 || sy > H + 24) continue;
    drawPlatform(ctx, p, sy, time);
  }
  for (const pickup of game.world.pickups) {
    if (pickup.collected) continue;
    const sy = 440 - (pickup.height - camera);
    if (sy < -35 || sy > H + 30) continue;
    drawPickup(ctx, pickup, pickup.x, sy, time);
  }
  const playerY = 440 - (game.player.y - camera);
  drawTurtle(ctx, game.player.x, playerY, time, game.player.shield);
  const floodY = 440 - (game.flood - camera);
  drawFlood(ctx, floodY, time);
  const intensity = Math.min(1.8, 0.65 + game.elapsed / 42);
  drawRain(ctx, time, intensity);
  if (Math.sin(time * 0.23) > 0.998) {
    ctx.fillStyle = "rgba(236,244,255,.28)";
    ctx.fillRect(0, 0, W, H);
  }
}

function formatTime(total: number): string {
  const seconds = Math.max(0, Math.floor(total));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ArcadeScreen({
  name,
  best,
  mute,
  musicOn,
  ranking,
  onMute,
  onMusic,
  paused,
  onMenu,
  onLeave,
  onRank,
}: {
  name: string;
  best: number;
  mute: boolean;
  musicOn: boolean;
  ranking: RankRow[];
  onMute: () => void;
  onMusic: () => void;
  paused: boolean;
  onMenu: () => void;
  onReplay: () => void;
  onLeave: () => void;
  onRank: (snapshot: RankSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(createGame(7));
  const pausedRef = useRef(paused);
  const overRef = useRef(false);
  const savedRef = useRef(false);
  const previousBestRef = useRef(best);
  const targetXRef = useRef<number | null>(null);
  const keyLeftRef = useRef(false);
  const keyRightRef = useRef(false);
  const rankCallbackRef = useRef(onRank);
  const endGameRef = useRef<(cause: EndCause) => void>(() => {});
  const [started, setStarted] = useState(false);
  const [pauseMenu, setPauseMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [full, setFull] = useState(false);
  const [hud, setHud] = useState({ score: 0, height: 0, best, time: 0, shield: false });
  const [over, setOver] = useState<GameEnd | null>(null);
  rankCallbackRef.current = onRank;
  previousBestRef.current = Math.max(previousBestRef.current, best);
  pausedRef.current = paused || pauseMenu || help || !started;

  function publish(score: number) {
    return submitArcadeBest({ data: { name, score } });
  }

  function endGame(cause: EndCause) {
    if (savedRef.current || overRef.current) return;
    savedRef.current = true;
    overRef.current = true;
    const game = gameRef.current;
    game.dead = true;
    const score = skyScore(game.player.highest, game.player.bonus);
    game.score = score;
    audio.lose();
    audio.setRain(0.62);
    if (cause === "water") audio.splash();
    else audio.wrong();
    setOver({
      score,
      height: Math.floor(game.player.highest),
      time: game.elapsed,
      previous: previousBestRef.current,
      best: Math.max(previousBestRef.current, score),
      rank: 0,
      pending: true,
      failed: false,
      isRecord: score > previousBestRef.current,
      cause,
    });
    void publish(score)
      .then((result) => {
        previousBestRef.current = result.best;
        rankCallbackRef.current(result);
        setHud((current) => ({ ...current, score, best: result.best }));
        setOver((current) => current ? {
          ...current,
          previous: result.previous,
          best: result.best,
          rank: result.mine?.place ?? 0,
          isRecord: result.improved,
          pending: false,
          failed: false,
        } : current);
      })
      .catch(() => {
        setOver((current) => current ? { ...current, pending: false, failed: true } : current);
      });
  }

  endGameRef.current = endGame;

  function startGame() {
    audio.unlock();
    audio.startArcadeTrack();
    audio.setRain(0.23);
    gameRef.current = createGame((Math.floor(Math.random() * 0xffffffff) ^ name.length * 997) >>> 0);
    savedRef.current = false;
    overRef.current = false;
    targetXRef.current = 160;
    setHud({ score: 0, height: 0, best: previousBestRef.current, time: 0, shield: false });
    setOver(null);
    setPauseMenu(false);
    setHelp(false);
    setStarted(true);
    audio.whoosh();
  }

  async function toggleFull() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // Algunos navegadores móviles no permiten pantalla completa.
    }
    setFull(Boolean(document.fullscreenElement));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    let last = performance.now();
    let visualTime = 0;
    let hudClock = 0;
    let soundClock = 0;
    const visibility = () => {
      if (document.visibilityState === "visible") audio.resume();
    };
    document.addEventListener("visibilitychange", visibility);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.035, Math.max(0, (now - last) / 1000));
      last = now;
      const game = gameRef.current;
      const sim = started && !pausedRef.current && !overRef.current && document.visibilityState !== "hidden";
      if (sim && game.started && !game.dead) {
        game.elapsed += dt;
        visualTime += dt;
        const p = game.player;
        const oldY = p.y;
        updateMovingPlatforms(game.world, dt);

        const keyboard = (keyRightRef.current ? 1 : 0) - (keyLeftRef.current ? 1 : 0);
        if (keyboard !== 0) {
          p.vx += keyboard * 1450 * dt;
          targetXRef.current = null;
        } else if (targetXRef.current !== null) {
          const delta = targetXRef.current - p.x;
          p.vx += (Math.max(-1500, Math.min(1500, delta * 16)) - p.vx * 7.5) * dt;
        } else {
          p.vx *= Math.pow(0.045, dt);
        }
        p.vx = Math.max(-335, Math.min(335, p.vx));
        p.x += p.vx * dt;
        if (p.x < -PLAYER_W / 2) p.x = W + PLAYER_W / 2;
        if (p.x > W + PLAYER_W / 2) p.x = -PLAYER_W / 2;

        p.vy -= GRAVITY * dt;
        p.y += p.vy * dt;
        p.highest = Math.max(p.highest, p.y);
        game.camera = Math.max(game.camera, p.highest - 270);
        extendSkyWorld(game.world, p.highest + 160);

        if (p.vy < 0) {
          const crossed = game.world.platforms
            .filter((platform) => oldY >= platform.height && p.y <= platform.height && p.x + PLAYER_W / 2 > platform.x && p.x - PLAYER_W / 2 < platform.x + platform.width)
            .sort((a, b) => b.height - a.height)[0];
          if (crossed) {
            p.y = crossed.height;
            if (crossed.hazard && !p.shield) {
              endGameRef.current("glass");
            } else {
              if (crossed.hazard && p.shield) {
                p.shield = false;
                crossed.hazard = false;
                p.bonus += 18;
                audio.record();
              } else {
                audio.place(false);
              }
              p.vy = crossed.kind === "airplane" ? BOUNCE + 30 : BOUNCE;
            }
          }
        }

        for (const pickup of game.world.pickups) {
          if (pickup.collected) continue;
          if (Math.abs(p.x - pickup.x) < 19 && Math.abs(p.y + 8 - pickup.height) < 24) {
            pickup.collected = true;
            if (pickup.kind === "balloon") {
              p.vy = Math.max(p.vy, 790);
              p.bonus += 25;
              audio.whoosh();
            } else {
              p.shield = true;
              p.bonus += 12;
              audio.record();
            }
            audio.place(true);
          }
        }

        const floodSpeed = 13.5 + Math.min(15, p.highest * 0.009);
        game.flood += floodSpeed * dt;
        if (!overRef.current && game.flood >= p.y - 20) endGameRef.current("water");
        game.score = skyScore(p.highest, p.bonus);

        // Elimina piezas que quedaron muy abajo para mantener liviana la partida.
        if (game.world.platforms.length > 45) {
          game.world.platforms = game.world.platforms.filter((platform) => platform.height > game.camera - 170);
        }
        if (game.world.pickups.length > 30) {
          game.world.pickups = game.world.pickups.filter((pickup) => !pickup.collected && pickup.height > game.camera - 150);
        }
        hudClock += dt;
        soundClock += dt;
        if (soundClock > 1.2) {
          soundClock = 0;
          audio.setRain(Math.min(0.58, 0.19 + game.elapsed * 0.006));
          if (game.elapsed > 15 && Math.random() < 0.11) audio.storm(game.elapsed > 38);
        }
        if (hudClock > 0.12) {
          hudClock = 0;
          setHud({
            score: game.score,
            height: Math.floor(p.highest),
            best: Math.max(previousBestRef.current, game.score),
            time: game.elapsed,
            shield: p.shield,
          });
        }
      } else {
        if (pausedRef.current || document.visibilityState === "hidden") audio.setRain(0);
        visualTime += dt * 0.25;
      }

      ctx.imageSmoothingEnabled = false;
      drawScene(ctx, gameRef.current, visualTime);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [started]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keyLeftRef.current = true;
        event.preventDefault();
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keyRightRef.current = true;
        event.preventDefault();
      }
      if (event.key === "Escape" && started && !overRef.current) setPauseMenu((value) => !value);
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keyLeftRef.current = false;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keyRightRef.current = false;
    };
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [started]);

  function aimAt(clientX: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    targetXRef.current = Math.max(10, Math.min(W - 10, (clientX - rect.left) / rect.width * W));
  }

  return (
    <div className="arcade-root sky-jump-root">
      <canvas
        ref={canvasRef}
        className="sky-jump-canvas"
        aria-label="Sky Jump del barrio. Deslizá para mover a la tortuga."
        onPointerDown={(event: ReactPointerEvent<HTMLCanvasElement>) => {
          if (!started || pauseMenu || help || over) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          aimAt(event.clientX);
          audio.unlock();
        }}
        onPointerMove={(event: ReactPointerEvent<HTMLCanvasElement>) => {
          if (event.pointerType === "mouse" && event.buttons === 0 && started) return;
          if (event.buttons !== 0 || event.pointerType === "touch" || event.pointerType === "pen") aimAt(event.clientX);
        }}
      />

      <div className="arcade-hud arcade-ui sky-jump-hud">
        <div className="arcade-top">
          <div>
            <b>{hud.score} PTS</b>
            <span>Altura {hud.height} m · Récord {Math.max(hud.best, previousBestRef.current)}</span>
            {hud.shield && <span className="sky-shield-tag">☀ Escudo activo</span>}
          </div>
          <div className="arcade-tools">
            <button className="icon-btn arcade-pause" type="button" onClick={() => setPauseMenu(true)} aria-label="Pausar partida">
              <Pause size={19} />
            </button>
          </div>
        </div>
        {started && !over && !pauseMenu && !help && <p className="sky-swipe-hint">DESLIZÁ ← → PARA MOVERTE</p>}
      </div>

      {!started && (
        <div className="sky-overlay sky-intro arcade-ui">
          <div className="sky-card">
            <p className="kicker">ARCADE · BUENOS AIRES</p>
            <h1>SKY JUMP<br />DEL BARRIO</h1>
            <p className="sky-lead">La ciudad se está inundando. ¡Saltá cada vez más alto!</p>
            <div className="sky-hero">
              <div className="sky-hero-sprite"><span className="sky-turtle-mini"><i /></span></div>
              <div><b>Mora, la tortuga viajera</b><small>Tu compañera en esta tormenta porteña.</small></div>
            </div>
            <p>Saltá por veredas, balcones, techos de taxis y colectivos, y hasta aviones. Agarrá globos para elevarte y el Sol de Mayo para protegerte de los vidrios.</p>
            <p className="sky-controls-copy">En celular: deslizá el dedo a izquierda y derecha. En computadora: usá ← → o A / D.</p>
            <button className="tap sky-start" type="button" onClick={startGame}><Play size={17} /> EMPEZAR A SALTAR</button>
          </div>
        </div>
      )}

      {pauseMenu && !over && (
        <div className="modal arcade-ui arcade-pause-modal" role="dialog" aria-modal="true" aria-labelledby="arcade-pause-title">
          <div className="dialog">
            <p className="kicker">Arcade · Sky Jump</p>
            <h2 id="arcade-pause-title">Partida en pausa</h2>
            <p>La tormenta y el agua esperan mientras descansás.</p>
            <div className="arcade-pause-actions">
              <button className="tap" type="button" onClick={() => setPauseMenu(false)}><Play size={16} /> Reanudar</button>
              <button className="tap alt" type="button" onClick={startGame}><RotateCcw size={16} /> Reiniciar</button>
              <button className="tap alt" type="button" onClick={onMusic} aria-pressed={musicOn}><Music size={16} /> Música: {musicOn ? "activada" : "desactivada"}</button>
              <button className="tap alt" type="button" onClick={onMute} aria-pressed={!mute}>{mute ? <VolumeX size={16} /> : <Volume2 size={16} />} Sonidos: {mute ? "desactivados" : "activados"}</button>
              <button className="tap alt" type="button" onClick={() => void toggleFull()}>{full ? <Minimize2 size={16} /> : <Maximize2 size={16} />} {full ? "Salir de pantalla completa" : "Pantalla completa"}</button>
              <button className="tap alt" type="button" onClick={() => { setPauseMenu(false); setHelp(true); }}>Cómo se juega</button>
              <button className="tap alt" type="button" onClick={onLeave}>Volver al menú principal</button>
            </div>
          </div>
        </div>
      )}

      {help && (
        <div className="modal arcade-ui" role="dialog" aria-modal="true">
          <div className="dialog sky-help-dialog">
            <p className="kicker">SKY JUMP</p>
            <h2>Cómo se juega</h2>
            <p>Mora rebota sola. Vos solamente la guiás de izquierda a derecha; también puede salir por un lado y aparecer por el otro.</p>
            <p>Las veredas, balcones, techos de taxis y colectivos, y aviones sirven de plataformas. Algunas tienen vidrios rotos: el Sol de Mayo te protege de una caída peligrosa.</p>
            <p>Los globos dan un impulso extra. La inundación sube cada vez más rápido: no te quedes abajo.</p>
            <button className="tap" type="button" onClick={() => { setHelp(false); setPauseMenu(true); }}>Volver a la pausa</button>
          </div>
        </div>
      )}

      {over && (
        <div className={over.isRecord ? "modal finale flood arcade-ui record-finale" : "modal finale flood arcade-ui"}>
          <div className="dialog sky-over-dialog">
            {over.isRecord ? <><p className="kicker">ARCADE · SKY JUMP</p><h2 className="record-title">¡NUEVO RÉCORD!</h2><p>¡Bien ahí, {name}! Llegaste más alto que nunca.</p></> : <><p className="kicker">ARCADE · SKY JUMP</p><h2>{over.cause === "glass" ? "¡Cuidado con los vidrios!" : "La inundación te alcanzó"}</h2><p>{over.cause === "glass" ? "El Sol de Mayo no llegó a protegerte esta vez." : "La tormenta porteña ganó esta ronda. ¡Probá subir más rápido!"}</p></>}
            <ul className="arcade-stats">
              <li><span>Puntuación</span><b>{over.score}</b></li>
              <li><span>Altura máxima</span><b>{over.height} m</b></li>
              <li><span>Récord personal</span><b>{over.best}</b></li>
              <li><span>Tiempo</span><b>{formatTime(over.time)}</b></li>
            </ul>
            {over.pending && <p>Guardando tu puesto en el ranking…</p>}
            {over.failed && <p className="err">No se pudo guardar el ranking.</p>}
            {!over.pending && !over.failed && over.rank > 0 && <p>Puesto #{over.rank} en el ranking.</p>}
            {!over.pending && <ArcadeRankList rows={ranking} me={name} mine={over.rank > 0 ? { place: over.rank, name, score: over.best } : null} compact />}
            <div className="actions">
              <button className="tap" type="button" onClick={startGame}><RotateCcw size={16} /> Jugar de nuevo</button>
              <button className="tap alt" type="button" onClick={onMenu}>Menú</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
