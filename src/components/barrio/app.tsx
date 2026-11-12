import { useEffect, useReducer, useRef, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CloudLightning,
  CloudRain,
  Snowflake,
  Maximize2,
  Minimize2,
  SunMedium,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import {
  QUESTIONS,
  SUIT_NAME,
  type EventId,
  type Mode,
  type Suit,
  type ZoneId,
} from "@/game/content";
import { audio } from "@/game/audio";
import {
  applyStorm,
  canPlay,
  boot,
  reduction,
  reducer,
  survivedRounds,
  type Action,
  type Game,
} from "@/game/engine";
import { cleanName, loadSave, setLastName, setLearnBest, setMuteSaved, setMusicSaved } from "@/game/storage";
import { getArcadeRanking, type RankMine, type RankRow } from "@/game/ranking";
import { MonopolyBoard } from "@/components/barrio/board";
import { FinaleScene, WorldBackdrop, type SkyMood } from "@/components/barrio/backdrop";
import { CardArt } from "@/components/barrio/pixel";
import { ArcadeScreen } from "@/components/barrio/arcade";
import { ArcadeRankList } from "@/components/barrio/rank-list";

function gameReducer(state: Game | null, action: Action): Game | null {
  if (action.type === "boot") return boot(action.mode, action.name);
  if (!state) return null;
  return reducer(state, action);
}

const EVENT_ICON: Record<EventId, typeof CloudRain> = {
  lluvia: CloudRain,
  sudestada: Wind,
  desborde: Waves,
  tormenta: CloudLightning,
  calma: SunMedium,
  nino: CloudLightning,
  granizo: Snowflake,
  basura: Trash2,
  nocturno: CloudRain,
};

const recordedTokens = new Set<string>();

export function BarrioApp() {
  const [screen, setScreen] = useState<"menu" | "naming" | "play">("menu");
  const [arcadeRun, setArcadeRun] = useState(0);
  const [curtain, setCurtain] = useState<{ kicker: string; title: string } | null>(null);
  const [game, dispatch] = useReducer(gameReducer, null);
  const [board, setBoard] = useState<RankRow[]>([]);
  const [mine, setMine] = useState<RankMine | null>(null);
  const [rankError, setRankError] = useState(false);
  const [knownBest, setKnownBest] = useState(0);
  const [learnBest, setLearnBestState] = useState(0);
  const [mute, setMute] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [draft, setDraft] = useState("");
  const [nick, setNick] = useState("");
  const [nameError, setNameError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [hoverZone, setHoverZone] = useState<ZoneId | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; title: string; suit: Suit } | null>(null);
  const [tilt, setTilt] = useState<Record<string, string>>({});
  const reduced = useReduced();
  const gameRef = useRef(game);
  const screenRef = useRef(screen);
  const arcadeRef = useRef(0);
  const phaseRef = useRef<string | null>(null);
  const shakeRef = useRef(0);
  const hoverRef = useRef<ZoneId | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const musicToken = useRef(0);
  gameRef.current = game;
  screenRef.current = screen;
  arcadeRef.current = arcadeRun;

  useEffect(() => {
    const save = loadSave();
    setLearnBestState(save.learnBest);
    setMute(save.mute);
    setMusicOn(save.musicOn);
    audio.setMuted(save.mute);
    audio.setTrackEnabled(save.musicOn);
    if (save.lastName) {
      setNick(save.lastName);
      setDraft(save.lastName);
    }
    let cancel = false;
    getArcadeRanking({ data: save.lastName })
      .then((res) => {
        if (cancel) return;
        setBoard(res.rows);
        setMine(res.mine);
        setRankError(false);
        if (res.mine) setKnownBest(res.mine.score);
      })
      .catch(() => {
        if (!cancel) setRankError(true);
      });
    const onVis = () => {
      if (document.visibilityState === "visible") audio.resume();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancel = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    const inArcade = screen === "play" && arcadeRun > 0;
    if (!inArcade) return;
    const token = ++musicToken.current;
    const onVis = () => {
      if (document.visibilityState === "hidden") audio.pauseArcadeTrack();
      else {
        audio.resume();
        audio.resumeArcadeTrack();
      }
    };
    const onHide = () => audio.pauseArcadeTrack();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
      queueMicrotask(() => {
        if (musicToken.current === token) audio.stopArcadeTrack();
      });
    };
  }, [screen, arcadeRun]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      audio.unlock();
      const where = screenRef.current;
      if ((where === "menu" || where === "naming") && !audio.wantsArcadeTrack()) audio.startMenu();
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest(".tap, .mode, .opt, .chev, .icon-btn")) audio.click();
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    if (!game) return;
    if (game.phase === "cast") {
      const t = window.setTimeout(() => dispatch({ type: "apply-weather" }), reduced ? 180 : 620);
      return () => window.clearTimeout(t);
    }
    if (game.phase === "rising") {
      document.body.classList.add("storming");
      const t = window.setTimeout(() => dispatch({ type: "finish-weather" }), reduced ? 220 : 1080);
      return () => {
        window.clearTimeout(t);
        document.body.classList.remove("storming");
      };
    }
    document.body.classList.remove("storming");
    return;
  }, [game?.phase, game?.round, reduced]);

  useEffect(() => {
    if (!game) return;
    if (phaseRef.current !== game.phase) {
      if (game.phase === "rising") audio.storm(game.spilled || game.forecast.id === "nino");
      if (game.phase === "over") {
        if (game.won) audio.win();
        else audio.lose();
      }
      if (game.phase === "quizDone") {
        if (game.quiz?.correct) audio.quizOk();
        else audio.wrong();
      }
      phaseRef.current = game.phase;
    }
    if (game.shake > shakeRef.current && game.phase === "turn") audio.wrong();
    shakeRef.current = game.shake;
  }, [game]);

  useEffect(() => {
    if (!game || game.phase !== "over") return;
    const token = game.runId;
    if (recordedTokens.has(token)) return;
    recordedTokens.add(token);
    if (game.mode !== "arcade") {
      setLearnBestState(setLearnBest(game.score));
    }
  }, [game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (arcadeRef.current) return;
      if (!g || g.phase !== "turn") return;
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        dispatch({ type: "focus", dir: 1 });
        audio.flip();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        dispatch({ type: "focus", dir: -1 });
        audio.flip();
      } else if (e.key === "Enter") {
        dispatch({ type: "arm" });
        audio.flip();
      } else if (e.key === "d" || e.key === "D") {
        dispatch({ type: "draw" });
        audio.whoosh();
      } else {
        const zones: Record<string, ZoneId> = {
          "1": "colegio",
          "2": "plaza",
          "3": "casas",
          "4": "hospital",
          "5": "parroquia",
          "6": "arroyo",
        };
        const zone = zones[e.key];
        if (zone && g.armedUid) {
          const card = g.hand.find((c) => c.uid === g.armedUid);
          if (card) audio.place(reduction(card, zone).bonus);
          dispatch({ type: "play", zone });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleMute() {
    const next = !mute;
    setMute(next);
    audio.unlock();
    audio.setMuted(next);
    setMuteSaved(next);
  }

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    audio.unlock();
    audio.setTrackEnabled(next);
    setMusicSaved(next);
  }

  function takeRank(res: { rows: RankRow[]; mine: RankMine | null; best?: number }) {
    setBoard(res.rows);
    setMine(res.mine);
    setRankError(false);
    if (typeof res.best === "number") setKnownBest(res.best);
    else if (res.mine) setKnownBest(res.mine.score);
  }

  function refreshRanking(name: string) {
    return getArcadeRanking({ data: name })
      .then((res) => {
        takeRank(res);
        return res;
      })
      .catch(() => {
        setRankError(true);
        return null;
      });
  }

  function startPlay(mode: Mode, playerName: string) {
    audio.unlock();
    audio.stopMenu();
    if (mode === "arcade") {
      audio.startArcadeTrack();
    } else {
      audio.stopArcadeTrack();
      audio.startBed();
    }
    audio.whoosh();
    setLeaving(false);
    phaseRef.current = null;
    shakeRef.current = 0;
    setCurtain(
      mode === "learn"
        ? { kicker: "Aprendizaje", title: "Diez rondas" }
        : { kicker: "Arcade", title: "Sky Jump" },
    );
    window.setTimeout(() => {
      if (mode === "arcade") {
        setArcadeRun(Date.now());
        setScreen("play");
        return;
      }
      setArcadeRun(0);
      dispatch({ type: "boot", mode, name: playerName });
      setScreen("play");
    }, reduced ? 40 : 360);
    window.setTimeout(() => setCurtain(null), reduced ? 160 : 960);
  }

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const name = cleanName(draft);
    if (!name) {
      setNameError("Poné un nombre de 2 a 14 letras o números.");
      audio.wrong();
      return;
    }
    setNameError("");
    setNick(name);
    setLastName(name);
    audio.unlock();
    audio.startArcadeTrack();
    void refreshRanking(name).then((res) => {
      setKnownBest(res?.mine?.score ?? 0);
      startPlay("arcade", name);
    });
  }

  function tiltMove(id: string, e: React.PointerEvent<HTMLButtonElement>) {
    if (reduced || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setTilt((prev) => ({
      ...prev,
      [id]: `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`,
    }));
  }

  const preview = game && game.phase !== "over" && game.phase !== "rising" ? applyStorm(game.water, game.forecast.hits) : null;
  const sky: SkyMood =
    screen !== "play" ? "cycle" : game?.phase === "over" ? (game.won ? "clear" : "flood") : "play";

  return (
    <div className={screen === "play" ? (game?.phase === "over" ? "world is-play is-finale" : "world is-play") : "world"}>
      <WorldBackdrop mood={sky} />
      <main className="shell">
      {screen === "menu" && (
        <Menu
          board={board}
          mine={mine}
          me={nick}
          rankError={rankError}
          learnBest={learnBest}
          mute={mute}
          onMute={toggleMute}
          tilt={tilt}
          onTilt={tiltMove}
          onClearTilt={(id) => setTilt((p) => ({ ...p, [id]: "" }))}
          onLearn={() => {
            audio.unlock();
            startPlay("learn", "");
          }}
          onArcade={() => {
            audio.unlock();
            audio.preloadArcadeTrack();
            audio.whoosh();
            setScreen("naming");
          }}
        />
      )}

      {screen === "naming" && (
        <section className="dialog" style={{ margin: "12vh auto 0" }}>
          <p className="kicker">Arcade</p>
          <h1>¿Cómo te llamás?</h1>
          <p>Tu nombre queda en el ranking.</p>
          <form onSubmit={submitName}>
            <label className="sr" htmlFor="nick">
              Nombre
            </label>
            <input
              id="nick"
              className="field"
              autoFocus
              maxLength={14}
              autoComplete="nickname"
              placeholder="Tu nombre"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            {nameError && <p className="err">{nameError}</p>}
            <div className="actions">
              <button className="tap" type="submit">
                Entrar al barrio
              </button>
              <button className="tap alt" type="button" onClick={() => setScreen("menu")}>
                Volver
              </button>
            </div>
          </form>
          <ArcadeRankList rows={board} me={nick || draft} mine={mine} error={rankError} compact />
        </section>
      )}

      {screen === "play" && arcadeRun > 0 && (
        <ArcadeScreen
          key={arcadeRun}
          name={nick || "Vecino"}
          best={knownBest}
          mute={mute}
          musicOn={musicOn}
          ranking={board}
          onMute={toggleMute}
          onMusic={toggleMusic}
          paused={leaving}
          onRank={takeRank}
          onReplay={() => {
            audio.whoosh();
            audio.startArcadeTrack();
            setLeaving(false);
            setArcadeRun(Date.now());
          }}
          onMenu={() => {
            audio.stopArcadeTrack();
            setArcadeRun(0);
            setLeaving(false);
            setScreen("menu");
            audio.startMenu();
            void refreshRanking(nick);
          }}
          onLeave={() => setLeaving(true)}
        />
      )}

      {screen === "play" && arcadeRun === 0 && game && (
        <PlayTable
          game={game}
          mute={mute}
          onMute={toggleMute}
          previewDeltas={preview?.deltas ?? {}}
          previewWater={preview?.water ?? game.water}
          spilledSoon={preview?.spilled ?? false}
          hoverZone={hoverZone}
          onLeave={() => setLeaving(true)}
          onCardPointerDown={(e, index) => {
            if (game.phase !== "turn" || index !== game.focus) return;
            drag.current = { x: e.clientX, y: e.clientY, moved: false };
            const move = (ev: PointerEvent) => {
              const d = drag.current;
              const current = gameRef.current;
              if (!d || !current || current.phase !== "turn") return;
              const dx = ev.clientX - d.x;
              const dy = ev.clientY - d.y;
              if (!d.moved && Math.hypot(dx, dy) > 14) d.moved = true;
              if (!d.moved) return;
              const held = current.hand[current.focus];
              if (!held || held.suit === "wild" || !canPlay(held, current.last)) return;
              if (Math.abs(dx) > Math.abs(dy) && dy > -24) {
                setGhost(null);
                hoverRef.current = null;
                setHoverZone(null);
                return;
              }
              setGhost({ x: ev.clientX, y: ev.clientY, title: held.title, suit: held.suit });
              const el = document.elementFromPoint(ev.clientX, ev.clientY);
              const zone = el?.closest("[data-zone]")?.getAttribute("data-zone") as ZoneId | null;
              hoverRef.current = zone;
              setHoverZone(zone);
            };
            const up = (ev: PointerEvent) => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
              const d = drag.current;
              drag.current = null;
              const current = gameRef.current;
              if (!d || !current) return;
              const dx = ev.clientX - d.x;
              const dy = ev.clientY - d.y;
              const el = document.elementFromPoint(ev.clientX, ev.clientY);
              const zone = el?.closest("[data-zone]")?.getAttribute("data-zone") as ZoneId | null;
              const horizontal = Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy);
              if (d.moved && horizontal) {
                suppressClick.current = true;
                dispatch({ type: "focus", dir: dx < 0 ? 1 : -1 });
                audio.flip();
              } else if (d.moved && zone && current.phase === "turn") {
                suppressClick.current = true;
                const held = current.hand[current.focus];
                if (held && held.suit !== "wild" && canPlay(held, current.last)) {
                  audio.place(reduction(held, zone).bonus);
                  dispatch({ type: "play", zone });
                }
              }
              setGhost(null);
              hoverRef.current = null;
              setHoverZone(null);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
          onCardPointerMove={() => {}}
          onCardPointerUp={() => {}}
          onCardClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            if (game.phase !== "turn") return;
            const card = game.hand[game.focus];
            if (!card) return;
            if (!canPlay(card, game.last)) {
              dispatch({ type: "arm" });
              return;
            }
            audio.flip();
            dispatch({ type: "arm" });
          }}
          onZone={(zone) => {
            if (game.phase !== "turn") return;
            if (!game.armedUid) {
              dispatch({ type: "hint" });
              return;
            }
            const card = game.hand.find((c) => c.uid === game.armedUid);
            if (!card) return;
            if (canPlay(card, game.last) && card.suit !== "wild") audio.place(reduction(card, zone).bonus);
            dispatch({ type: "play", zone });
          }}
          onDraw={() => {
            if (game.phase !== "turn") return;
            audio.whoosh();
            dispatch({ type: "draw" });
          }}
          onFocusDir={(dir) => {
            if (game.phase !== "turn") return;
            audio.flip();
            dispatch({ type: "focus", dir });
          }}
          onFocusIndex={(index) => {
            if (game.phase !== "turn") return;
            audio.flip();
            dispatch({ type: "focus", index });
          }}
        />
      )}

      {screen === "play" && arcadeRun === 0 && game?.phase === "quiz" && game.quiz && (
        <QuizModal game={game} dispatch={dispatch} locked={false} />
      )}
      {screen === "play" && arcadeRun === 0 && game?.phase === "quizDone" && game.quiz && (
        <QuizModal game={game} dispatch={dispatch} locked />
      )}

      {screen === "play" && arcadeRun === 0 && game?.phase === "over" && (
        <Over
          game={game}
          learnBest={learnBest}
          onAgain={() => startPlay(game.mode, game.name)}
          onMenu={() => {
            setScreen("menu");
            audio.startMenu();
          }}
        />
      )}

      {leaving && (
        <div className="modal">
          <div className="dialog">
            <h2>¿Salir del barrio?</h2>
            <p>
              {arcadeRun > 0
                ? "Si salís ahora, este puntaje no entra a la tabla."
                : "Podés volver a empezar cuando quieras."}
            </p>
            <div className="actions">
              <button
                className="tap"
                type="button"
                onClick={() => {
                  audio.stopArcadeTrack();
                  setLeaving(false);
                  setArcadeRun(0);
                  setScreen("menu");
                  audio.startMenu();
                  void refreshRanking(nick);
                }}
              >
                Salir
              </button>
              <button className="tap alt" type="button" onClick={() => setLeaving(false)}>
                Seguir
              </button>
            </div>
          </div>
        </div>
      )}

      {curtain && (
        <div className="curtain" role="status">
          <p className="kicker">{curtain.kicker}</p>
          <strong>{curtain.title}</strong>
        </div>
      )}

      {ghost && (
        <div
          className="ghost"
          style={{
            left: ghost.x,
            top: ghost.y,
            background: `var(--suit-${ghost.suit})`,
            color: ghost.suit === "amarillo" ? "var(--color-amber-ink)" : "white",
          }}
        >
          {ghost.title}
        </div>
      )}

      {game && game.phase === "turn" && game.shake > 0 && <div key={game.shake} className="vignette" />}
        <SchoolBrand />
      </main>
    </div>
  );
}

function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function Menu({
  board,
  mine,
  me,
  rankError,
  learnBest,
  mute,
  onMute,
  tilt,
  onTilt,
  onClearTilt,
  onLearn,
  onArcade,
}: {
  board: RankRow[];
  mine: RankMine | null;
  me: string;
  rankError: boolean;
  learnBest: number;
  mute: boolean;
  onMute: () => void;
  tilt: Record<string, string>;
  onTilt: (id: string, e: React.PointerEvent<HTMLButtonElement>) => void;
  onClearTilt: (id: string) => void;
  onLearn: () => void;
  onArcade: () => void;
}) {
  return (
    <>
      <header className="hero">
        <div className="sky-chip" aria-hidden="true">
          <span className="sun" />
          <span className="cloud fair" />
          <span className="cloud storm" />
          <span className="drops" />
        </div>
        <p className="kicker">Secundaria 26 · María Elena Walsh</p>
        <h1 className="game-title">
          <span>Salva</span>
          <span>tu barrio</span>
        </h1>
        <div className="hero-tools">
          <HelpButton />
          <Mute mute={mute} onMute={onMute} />
          <FullscreenButton />
        </div>
      </header>
      <div className="modes">
        <button
          className="mode"
          type="button"
          style={{ transform: tilt.learn || undefined }}
          onPointerMove={(e) => onTilt("learn", e)}
          onPointerLeave={() => onClearTilt("learn")}
          onClick={onLearn}
        >
          <span className="eyebrow">
            <BookOpen size={16} /> Aprendizaje
          </span>
          <h2>Barrio tranquilo</h2>
          <p>Protege el Barrio</p>
        </button>
        <button
          className="mode go"
          type="button"
          style={{ transform: tilt.arcade || undefined }}
          onPointerMove={(e) => onTilt("arcade", e)}
          onPointerLeave={() => onClearTilt("arcade")}
          onClick={onArcade}
        >
          <span className="eyebrow">
            <Zap size={16} /> Arcade
          </span>
          <h2>Sky Jump</h2>
          <p>Saltá con Hijitus. Solo sumás si subís.</p>
        </button>
      </div>
      <ArcadeRankList rows={board} me={me} mine={mine} error={rankError} />
      {learnBest > 0 && (
        <p className="help">
          Mejor en aprendizaje: <b>{learnBest}</b>
        </p>
      )}
    </>
  );
}

function Mute({ mute, onMute }: { mute: boolean; onMute: () => void }) {
  return (
    <button className="icon-btn" type="button" onClick={onMute} aria-label={mute ? "Activar sonido" : "Silenciar"}>
      {mute ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}

function FullscreenButton() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => {
      setOn(Boolean(document.fullscreenElement) || document.body.classList.contains("app-fullscreen"));
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = async () => {
    const native = document.fullscreenElement;
    const fitted = document.body.classList.contains("app-fullscreen");
    if (native || fitted) {
      document.body.classList.remove("app-fullscreen");
      if (native) {
        try {
          await document.exitFullscreen();
        } catch {
          /* el navegador ya salió */
        }
      }
      setOn(false);
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
      setOn(true);
    } catch {
      document.body.classList.add("app-fullscreen");
      setOn(true);
    }
  };

  return (
    <button
      className="icon-btn"
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Salir de pantalla completa" : "Pantalla completa"}
    >
      {on ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
    </button>
  );
}

function PlayTable({
  game,
  mute,
  onMute,
  previewDeltas,
  previewWater,
  spilledSoon,
  hoverZone,
  onLeave,
  onCardPointerDown,
  onCardPointerMove,
  onCardPointerUp,
  onCardClick,
  onZone,
  onDraw,
  onFocusDir,
  onFocusIndex,
}: {
  game: Game;
  mute: boolean;
  onMute: () => void;
  previewDeltas: Partial<Record<ZoneId, number>>;
  previewWater: Record<ZoneId, number>;
  spilledSoon: boolean;
  hoverZone: ZoneId | null;
  onLeave: () => void;
  onCardPointerDown: (e: React.PointerEvent, index: number) => void;
  onCardPointerMove: (e: React.PointerEvent) => void;
  onCardPointerUp: (e: React.PointerEvent) => void;
  onCardClick: () => void;
  onZone: (zone: ZoneId) => void;
  onDraw: () => void;
  onFocusDir: (dir: number) => void;
  onFocusIndex: (index: number) => void;
}) {
  const Icon = EVENT_ICON[game.forecast.id];
  const card = game.hand[game.focus];
  const legalAny = game.hand.some((c) => canPlay(c, game.last));
  const busy = game.phase !== "turn";
  const armed = game.hand.find((c) => c.uid === game.armedUid) ?? null;

  return (
    <>
      <header className="topbar">
        <div className="hud">
          <span className="pill">
            {game.mode === "learn" ? `Ronda ${game.round}/10` : `Ronda ${game.round}`}
          </span>
          <span className="pill">
            <strong>{game.score}</strong> pts
          </span>
          {game.streak > 1 && <span className="pill">racha {game.streak}</span>}
          {game.mode === "arcade" && <span className="pill">{game.name}</span>}
        </div>
        <div className="hud">
          <HelpButton />
          <Mute mute={mute} onMute={onMute} />
          <FullscreenButton />
          <button className="tap alt" type="button" onClick={onLeave}>
            Salir
          </button>
        </div>
      </header>

      <section className="panel forecast">
        <Icon size={22} aria-hidden="true" />
        <div>
          <b>
            Pronóstico: {game.forecast.title}
          </b>
          <div>{game.forecast.blurb}</div>
          {spilledSoon && (
            <div>El arroyo se va a desbordar: +1 extra en plaza, casas y parroquia.</div>
          )}
        </div>
      </section>

      <MonopolyBoard
        game={game}
        previewDeltas={previewDeltas}
        previewWater={previewWater}
        hoverZone={hoverZone}
        busy={busy}
        armed={armed}
        onZone={onZone}
      />

      <p className="msg" aria-live="polite">
        {game.message}
      </p>

      <div className="mesa-row">
        <div className="mesa">
          <div className="deck" aria-hidden="true">
            <span className="deck-stack">
              <i />
              <i />
              <i />
            </span>
          </div>
          <span>{game.deck.length} en el mazo</span>
        </div>
        <div className="mesa">
          {game.last ? (
            <>
              <span>Mesa</span>
              <span
                className="mini"
                data-suit={game.last.suit}
                style={{ background: `var(--suit-${game.last.suit})` }}
              >
                <b>{game.last.suit === "wild" ? "★" : game.last.n}</b>
                <span>{game.last.suit === "wild" ? "Comodín" : game.last.suit}</span>
              </span>
            </>
          ) : (
            <span>Mesa libre: vale cualquier carta</span>
          )}
        </div>
      </div>

      <div className="fan-perspective">
        <div
          className="fan-stage"
          onPointerMove={onCardPointerMove}
          onPointerUp={onCardPointerUp}
          onPointerCancel={onCardPointerUp}
        >
          <button className="chev left" type="button" aria-label="Carta anterior" disabled={busy} onClick={() => onFocusDir(-1)}>
            <ChevronLeft size={20} />
          </button>
          {game.hand.map((c, index) => {
            const offset = index - game.focus;
            const hidden = Math.abs(offset) > 2;
            return (
              <button
                key={c.uid}
                type="button"
                className={[
                  "playing-card",
                  offset === 0 ? "is-focus" : "",
                  c.uid === game.armedUid ? "armed" : "",
                ].join(" ")}
                style={cardStyle(offset, c.uid === game.armedUid, hidden)}
                aria-hidden={offset !== 0}
                tabIndex={offset === 0 ? 0 : -1}
                onPointerDown={(e) => onCardPointerDown(e, index)}
                onClick={() => {
                  if (offset !== 0) {
                    onFocusIndex(index);
                    return;
                  }
                  onCardClick();
                }}
              >
                <span className="face front" data-suit={c.suit} style={{ ["--suit" as string]: `var(--suit-${c.suit})` }}>
                  <span className="card-frame">
                    <span className="rank">{c.suit === "wild" ? "★" : `−${c.n}`}</span>
                    <span className="artwell">
                      <CardArt id={c.key} />
                    </span>
                    <span className="ct">{c.title}</span>
                    <span className="cd">{c.detail}</span>
                    <span className="ribbon">
                      {c.suit === "wild" ? "Comodín con pregunta" : SUIT_NAME[c.suit]}
                    </span>
                  </span>
                </span>
                <span className="face back">
                  <span className="monogram">SB</span>
                </span>
              </button>
            );
          })}
          <button className="chev right" type="button" aria-label="Carta siguiente" disabled={busy} onClick={() => onFocusDir(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <p className="kicker">
        {card
          ? `Carta ${game.focus + 1} de ${game.hand.length}${
              canPlay(card, game.last) ? "" : " · no coincide"
            }`
          : "Sin cartas"}
      </p>
      <div className="actions">
        <button className="tap" type="button" disabled={busy || !card} onClick={onCardClick}>
          {card?.suit === "wild" ? "Lanzar comodín" : game.armedUid ? "Elegí la zona" : "Usar esta carta"}
        </button>
        <button className={legalAny ? "tap alt" : "tap alt pulse"} type="button" disabled={busy} onClick={onDraw}>
          Robar y pasar
        </button>
      </div>
    </>
  );
}

function SchoolBrand() {
  return (
    <a className="school" href="https://www.instagram.com/secundaria26sanfer/" target="_blank" rel="noreferrer">
      <img className="school-logo" src="/logo-secundaria.png" alt="Escudo de la Secundaria 26, María Elena Walsh" />
      <span>@secundaria26sanfer</span>
    </a>
  );
}

function HelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="icon-btn help-btn"
        type="button"
        aria-expanded={open}
        aria-label="Cómo se juega"
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      {open && (
        <div className="help-pop" role="dialog" aria-label="Cómo se juega">
          <b>Cómo se juega</b>
          <p>Pasá las cartas con las flechas o deslizando. Solo se lee la del medio.</p>
          <p>Tocá el medio de la carta y después la zona del barrio donde la querés usar.</p>
          <p>Tiene que coincidir en color o en número con la carta de la mesa.</p>
          <p>Si el color coincide con la franja de la zona, baja un punto más. La estrella es una pregunta.</p>
          <p>Si el arroyo llega a 3, se desborda. Perdés si el colegio o el hospital llegan a 3, o si tres zonas se inundan.</p>
          <button className="tap alt" type="button" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}

function cardStyle(offset: number, armed: boolean, hidden: boolean): React.CSSProperties {
  const abs = Math.abs(offset);
  let transform: string;
  if (offset === 0) {
    transform = `translateX(0px) translateZ(72px) rotateY(0deg) scale(1.05)${armed ? " translateY(-16px)" : ""}`;
  } else {
    const dir = Math.sign(offset);
    transform = `translateX(${offset * 30}px) translateZ(${-24 - abs * 14}px) rotateY(${dir * 168}deg) rotateZ(${offset * -2}deg)`;
  }
  return {
    transform,
    zIndex: 20 - abs,
    opacity: hidden ? 0 : 1,
    pointerEvents: abs > 2 ? "none" : "auto",
  };
}

function QuizModal({
  game,
  dispatch,
  locked,
}: {
  game: Game;
  dispatch: React.Dispatch<Action>;
  locked: boolean;
}) {
  const quiz = game.quiz;
  if (!quiz) return null;
  const question = QUESTIONS[quiz.q];
  if (!question) return null;
  return (
    <div className="modal">
      <div className="dialog">
        <p className="kicker">Alerta meteorológica</p>
        <h2>{question.q}</h2>
        {quiz.options.map((opt) => {
          const isAnswer = opt === question.answer;
          const picked = quiz.picked === opt;
          const cls = !locked ? "opt" : isAnswer ? "opt ok" : picked ? "opt bad" : "opt";
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              disabled={locked}
              onClick={() => dispatch({ type: "quiz-pick", choice: opt })}
            >
              {question.options[opt]}
            </button>
          );
        })}
        {locked && (
          <>
            <p>
              <b>{quiz.correct ? "Bien." : "Casi."}</b> {question.info}
            </p>
            <button className="tap" type="button" onClick={() => dispatch({ type: "quiz-continue" })}>
              Seguir con la tormenta
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Over({
  game,
  learnBest,
  onAgain,
  onMenu,
}: {
  game: Game;
  learnBest: number;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const rounds = survivedRounds(game);
  return (
    <div className={game.won ? "modal finale clear" : "modal finale flood"}>
      <FinaleScene won={game.won} />
      <div className="dialog">
        <h2>{game.won ? "El barrio se salvó" : "El barrio se inundó"}</h2>
        <p>
          {game.won
            ? "Combinaste infraestructura, naturaleza y comunidad. Prevenir sale menos que reparar."
            : `${game.overReason} En la próxima, cuidá primero el colegio y el hospital, y usá el pronóstico antes de jugar.`}
        </p>
        <p>
          <b>{game.score} pts</b>
          {game.mode === "learn" ? ` · mejor aprendizaje ${learnBest}` : ` · ${rounds} rondas`}
        </p>
        <div className="actions">
          <button className="tap" type="button" onClick={onAgain}>
            {game.mode === "arcade" ? "Jugar otra vez" : "Otra vez"}
          </button>
          <button className="tap alt" type="button" onClick={onMenu}>
            Modos
          </button>
        </div>
      </div>
    </div>
  );
}
