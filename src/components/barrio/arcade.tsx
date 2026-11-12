import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Maximize2, Minimize2, Music, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { audio } from "@/game/audio";
import { submitArcadeBest, type RankRow, type RankSnapshot } from "@/game/ranking";
import { ArcadeRankList } from "@/components/barrio/rank-list";
import {
  createSkyWorld,
  extendSkyWorld,
  skyScore,
  skyZone,
  updateMovingPlatforms,
  type SkyWorld,
} from "@/game/sky-jump";
import {
  drawHijitus,
  drawSkyBackdrop,
  drawSkyBolt,
  drawSkyFlood,
  drawSkyPickup,
  drawSkyPlatform,
  drawSkyPortrait,
  drawSkyRain,
} from "@/game/sky-art";

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

function drawScene(ctx: CanvasRenderingContext2D, game: GameState, time: number) {
  const altitude = game.player.highest;
  drawSkyBackdrop(ctx, altitude, time);
  const camera = game.camera;
  const platforms = game.world.platforms;
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i]!;
    const sy = (440 - (platform.height - camera)) | 0;
    if (sy < -40 || sy > H + 36) continue;
    drawSkyPlatform(ctx, platform, sy, time);
  }
  const pickups = game.world.pickups;
  for (let i = 0; i < pickups.length; i++) {
    const pickup = pickups[i]!;
    if (pickup.collected) continue;
    const sy = (440 - (pickup.height - camera)) | 0;
    if (sy < -36 || sy > H + 36) continue;
    drawSkyPickup(ctx, pickup, sy, time);
  }
  drawSkyRain(ctx, time, altitude);
  drawSkyBolt(ctx, time, altitude);
  drawHijitus(
    ctx,
    game.player.x,
    (440 - (game.player.y - camera)) | 0,
    time,
    game.player.vx,
    game.player.vy,
    game.player.shield,
  );
  drawSkyFlood(ctx, 440 - (game.flood - camera), time);
}

function HijitusPortrait() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    drawSkyPortrait(ctx);
  }, []);
  return <canvas ref={ref} className="sky-hero-sprite" width={64} height={64} aria-hidden="true" />;
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
          const plats = game.world.platforms;
          let crossed: (typeof plats)[number] | undefined;
          for (let i = plats.length - 1; i >= 0; i--) {
            const platform = plats[i]!;
            if (platform.height > oldY) continue;
            if (platform.height < p.y) break;
            if (p.x + PLAYER_W / 2 > platform.x && p.x - PLAYER_W / 2 < platform.x + platform.width) {
              crossed = platform;
              break;
            }
          }
          if (crossed) {
            p.y = crossed.height;
            if (crossed.hazard && !p.shield) {
              endGameRef.current("glass");
            } else {
              if (crossed.hazard && p.shield) {
                p.shield = false;
                crossed.hazard = false;
                audio.record();
              } else {
                audio.place(false);
              }
              p.vy = crossed.kind === "airplane" ? BOUNCE + 30 : BOUNCE;
            }
          }
        }

        const pickups = game.world.pickups;
        for (let i = 0; i < pickups.length; i++) {
          const pickup = pickups[i]!;
          if (pickup.collected) continue;
          if (Math.abs(p.x - pickup.x) < 19 && Math.abs(p.y + 8 - pickup.height) < 24) {
            pickup.collected = true;
            if (pickup.kind === "balloon") {
              p.vy = Math.max(p.vy, 790);
              audio.whoosh();
            } else {
              p.shield = true;
              audio.record();
            }
            audio.place(true);
          }
        }

        const floodSpeed = 13.5 + Math.min(15, p.highest * 0.009);
        game.flood += floodSpeed * dt;
        if (!overRef.current && game.flood >= p.y - 20) endGameRef.current("water");
        game.score = skyScore(p.highest, p.bonus);

        const floorH = game.camera - 180;
        const plats = game.world.platforms;
        if (plats.length > 48 && plats[0]!.height < floorH) {
          let cut = 0;
          while (cut < plats.length - 16 && plats[cut]!.height < floorH) cut++;
          if (cut > 0) plats.splice(0, cut);
        }
        if (pickups.length > 28) {
          let write = 0;
          for (let i = 0; i < pickups.length; i++) {
            const item = pickups[i]!;
            if (!item.collected && item.height > floorH) pickups[write++] = item;
          }
          pickups.length = write;
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
        aria-label="Sky Jump. Hijitus salta por Buenos Aires."
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
            <span>{skyZone(hud.score).label} · Récord {Math.max(hud.best, previousBestRef.current)}</span>
            {hud.shield && <span className="sky-shield-tag">Sol de Mayo</span>}
          </div>
          <div className="arcade-tools">
            <button className="icon-btn arcade-pause" type="button" onClick={() => setPauseMenu(true)} aria-label="Pausar partida">
              <Pause size={19} />
            </button>
          </div>
        </div>
        {started && !over && !pauseMenu && !help && hud.time < 4 && <p className="sky-swipe-hint">← →</p>}
      </div>

      {!started && (
        <div className="sky-overlay sky-intro arcade-ui">
          <div className="sky-card">
            <p className="kicker">ARCADE · BUENOS AIRES</p>
            <h1>SKY JUMP</h1>
            <div className="sky-hero">
              <HijitusPortrait />
              <div><b>Hijitus</b><small>De la vereda al espacio.</small></div>
            </div>
            <p className="sky-lead">Saltá. Solo sumás si subís.</p>
            <button className="tap sky-start" type="button" onClick={startGame}><Play size={17} /> EMPEZAR</button>
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
            <p>Hijitus rebota solo. Movelo con ← → o A / D, o deslizá el dedo. Puede salir por un costado y entrar por el otro.</p>
            <p>Vereda, techo, taxi, colectivo, balcón y avión se pisan. Los vidrios celestes cortan el salto, salvo con el Sol de Mayo. El globo impulsa.</p>
            <p>La inundación sube. El cielo cambia con los puntos: calle, techos, cielo y espacio.</p>
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
              <li><span>Zona</span><b>{skyZone(over.score).label}</b></li>
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
