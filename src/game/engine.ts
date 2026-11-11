import {
  CATALOG,
  EVENTS,
  QUESTIONS,
  SUIT_NAME,
  ZONE_IDS,
  ZONES,
  type CardDef,
  type EventId,
  type Mode,
  type Suit,
  type ZoneId,
} from "./content";

export type Card = CardDef & { uid: string };

export type Waters = Record<ZoneId, number>;

export type Hits = Partial<Record<ZoneId, number>>;

export type Forecast = {
  id: EventId;
  title: string;
  blurb: string;
  hits: Hits;
};

export type Fx = { id: number; zone: ZoneId; text: string; up: boolean };

export type QuizState = {
  q: number;
  options: number[];
  picked: number | null;
  correct: boolean;
};

export type Phase = "turn" | "cast" | "quiz" | "quizDone" | "rising" | "over";

export type Game = {
  mode: Mode;
  name: string;
  runId: string;
  round: number;
  water: Waters;
  deck: Card[];
  hand: Card[];
  last: Card | null;
  score: number;
  streak: number;
  forecast: Forecast;
  phase: Phase;
  won: boolean;
  overReason: string;
  focus: number;
  armedUid: string | null;
  message: string;
  quiz: QuizState | null;
  queue: number[];
  fx: Fx[];
  fxId: number;
  shake: number;
  coach: boolean;
  spilled: boolean;
};

export type Action =
  | { type: "boot"; mode: Mode; name: string }
  | { type: "focus"; dir?: number; index?: number }
  | { type: "arm" }
  | { type: "play"; zone: ZoneId }
  | { type: "draw" }
  | { type: "hint" }
  | { type: "quiz-pick"; choice: number }
  | { type: "quiz-continue" }
  | { type: "apply-weather" }
  | { type: "finish-weather" };

const HAND_CAP = 7;

let uidSeq = 1;

export function shuffle<T>(list: readonly T[], rng: () => number = Math.random): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

export function emptyWater(): Waters {
  return {
    colegio: 0,
    plaza: 0,
    casas: 0,
    hospital: 0,
    parroquia: 0,
    arroyo: 0,
  };
}

export function makeDeck(rng: () => number = Math.random): Card[] {
  const cards: Card[] = [];
  for (const def of CATALOG) {
    const copies = def.suit === "wild" ? 4 : 3;
    for (let i = 0; i < copies; i++) {
      cards.push({ ...def, uid: `c${uidSeq++}` });
    }
  }
  return shuffle(cards, rng);
}

export function canPlay(card: Card, last: Card | null): boolean {
  if (!last) return true;
  if (card.suit === "wild") return true;
  return card.suit === last.suit || card.n === last.n;
}

export function reduction(card: Card, zone: ZoneId): { total: number; bonus: boolean } {
  const bonus = card.suit !== "wild" && card.suit === zoneSuit(zone);
  return { total: card.n + (bonus ? 1 : 0), bonus };
}

function zoneSuit(zone: ZoneId): Suit {
  return ZONES.find((z) => z.id === zone)?.suit ?? "azul";
}

export function lossReason(water: Waters): string | null {
  if (water.colegio >= 3) return "El colegio se inundó.";
  if (water.hospital >= 3) return "El hospital se inundó.";
  const flooded = ZONE_IDS.filter((z) => water[z] >= 3).length;
  if (flooded >= 3) return "Tres zonas quedaron bajo el agua.";
  return null;
}

function collapse(pairs: Array<[ZoneId, number]>): Hits {
  const hits: Hits = {};
  for (const [zone, n] of pairs) {
    hits[zone] = Math.min(3, (hits[zone] ?? 0) + n);
  }
  return hits;
}

function roll(id: EventId, rng: () => number): Array<[ZoneId, number]> {
  const pick = (n: number) => shuffle(ZONE_IDS, rng).slice(0, n);
  switch (id) {
    case "lluvia":
      return pick(2).map((z) => [z, 1]);
    case "sudestada":
      return [
        ["arroyo", 2],
        ["casas", 1],
      ];
    case "desborde":
      return [
        ["arroyo", 1],
        ["parroquia", 1],
        ["casas", 1],
      ];
    case "tormenta":
      return [
        ["colegio", 1],
        ["hospital", 1],
      ];
    case "calma":
      return [];
    case "nino":
      return ZONE_IDS.map((z) => [z, 1]);
    case "granizo":
      return [
        ["colegio", 1],
        ["plaza", 1],
        ["casas", 1],
      ];
    case "basura":
      return [
        ["casas", 2],
        ["plaza", 1],
      ];
    case "nocturno":
      return [
        ["hospital", 1],
        ["parroquia", 1],
        ["arroyo", 1],
      ];
    default:
      return [];
  }
}

const LEARN_POOL: EventId[] = [
  "lluvia",
  "lluvia",
  "sudestada",
  "desborde",
  "tormenta",
  "calma",
  "calma",
];

export function forecastFor(
  round: number,
  mode: Mode,
  rng: () => number = Math.random,
): Forecast {
  let id: EventId;
  if (mode === "learn") {
    id = round === 7 || round === 10 ? "nino" : LEARN_POOL[Math.floor(rng() * LEARN_POOL.length)]!;
  } else {
    const heat = Math.min(1, (round - 1) / 14);
    if (round >= 5 && rng() < 0.08 + heat * 0.3) id = "nino";
    else if (rng() < Math.max(0.04, 0.2 - heat * 0.16)) id = "calma";
    else {
      const pool: EventId[] = [
        "lluvia",
        "lluvia",
        "sudestada",
        "desborde",
        "tormenta",
        "granizo",
        "basura",
        "nocturno",
      ];
      if (round >= 8) pool.push("desborde", "basura", "sudestada", "nocturno", "granizo");
      id = pool[Math.floor(rng() * pool.length)]!;
    }
  }

  const pairs = roll(id, rng);
  if (mode === "arcade" && id !== "calma" && id !== "nino" && round >= 6) {
    if (rng() < Math.min(0.7, (round - 5) * 0.07)) {
      pairs.push([shuffle(ZONE_IDS, rng)[0]!, 1]);
    }
  }
  if (mode === "arcade" && round >= 12 && id !== "calma" && pairs.length && rng() < 0.45) {
    const [z, n] = pairs[0]!;
    pairs[0] = [z, n + 1];
  }

  const ev = EVENTS[id];
  return { id, title: ev.title, blurb: ev.blurb, hits: collapse(pairs) };
}

export function applyStorm(
  water: Waters,
  hits: Hits,
): { water: Waters; spilled: boolean; deltas: Hits } {
  const next: Waters = { ...water };
  for (const z of ZONE_IDS) {
    const n = hits[z] ?? 0;
    if (n) next[z] = Math.min(3, next[z] + n);
  }
  let spilled = false;
  if (next.arroyo >= 3) {
    spilled = true;
    for (const z of ["plaza", "casas", "parroquia"] as const) {
      next[z] = Math.min(3, next[z] + 1);
    }
  }
  const deltas: Hits = {};
  for (const z of ZONE_IDS) {
    const d = next[z] - water[z];
    if (d) deltas[z] = d;
  }
  return { water: next, spilled, deltas };
}

function pull(deck: Card[]): { card: Card; deck: Card[] } {
  const d = deck.length ? deck : makeDeck();
  const card = d[d.length - 1]!;
  return { card, deck: d.slice(0, -1) };
}

function drawTo(hand: Card[], deck: Card[], n: number): { hand: Card[]; deck: Card[] } {
  let h = hand;
  let d = deck;
  while (h.length < n) {
    const got = pull(d);
    h = [...h, got.card];
    d = got.deck;
  }
  return { hand: h, deck: d };
}

function withFx(fxId: number, items: Array<{ zone: ZoneId; text: string; up: boolean }>): {
  fx: Fx[];
  fxId: number;
} {
  let id = fxId;
  const fx = items.map((item) => ({ ...item, id: ++id }));
  return { fx, fxId: id };
}

function openQuiz(state: Game, hand: Card[]): Game {
  let queue = state.queue;
  if (!queue.length) queue = shuffle(QUESTIONS.map((_, i) => i));
  const q = queue[0]!;
  const rest = queue.slice(1);
  return {
    ...state,
    hand,
    last: null,
    phase: "quiz",
    armedUid: null,
    coach: false,
    focus: Math.max(0, Math.min(state.focus, Math.max(0, hand.length - 1))),
    queue: rest,
    quiz: { q, options: shuffle([0, 1, 2]), picked: null, correct: false },
    message: "Comodín: si acertás, baja 1 de agua en todo el barrio.",
  };
}

export function boot(mode: Mode, name: string): Game {
  const deck0 = makeDeck();
  const dealt = drawTo([], deck0, 5);
  const water = emptyWater();
  water.arroyo = 1;
  return {
    mode,
    name,
    runId: `r${uidSeq}-${Math.floor(Math.random() * 1e9)}`,
    round: 1,
    water,
    deck: dealt.deck,
    hand: dealt.hand,
    last: null,
    score: 0,
    streak: 0,
    forecast: forecastFor(1, mode),
    phase: "turn",
    won: false,
    overReason: "",
    focus: 0,
    armedUid: null,
    message: "El pronóstico marca por dónde va a subir el agua.",
    quiz: null,
    queue: shuffle(QUESTIONS.map((_, i) => i)),
    fx: [],
    fxId: 0,
    shake: 0,
    coach: true,
    spilled: false,
  };
}

export function reducer(state: Game, action: Action): Game {
  switch (action.type) {
    case "boot":
      return boot(action.mode, action.name);
    case "focus": {
      if (state.phase !== "turn" || state.hand.length === 0) return state;
      const len = state.hand.length;
      let index = state.focus;
      if (typeof action.dir === "number") index = (index + action.dir + len) % len;
      else if (typeof action.index === "number") index = Math.max(0, Math.min(len - 1, action.index));
      if (index === state.focus) return state;
      return { ...state, focus: index, armedUid: null };
    }
    case "arm": {
      if (state.phase !== "turn") return state;
      const card = state.hand[state.focus];
      if (!card) return state;
      if (!canPlay(card, state.last)) {
        return {
          ...state,
          shake: state.shake + 1,
          armedUid: null,
          message: "No coincide. Tiene que ser el mismo color o el mismo número que la mesa.",
        };
      }
      if (card.suit === "wild") return openQuiz(state, state.hand.filter((c) => c.uid !== card.uid));
      const armed = state.armedUid === card.uid ? null : card.uid;
      return {
        ...state,
        armedUid: armed,
        message: armed
          ? "En verde, cuánto baja el agua en cada zona."
          : "Carta suelta.",
      };
    }
    case "play": {
      if (state.phase !== "turn") return state;
      const card =
        state.hand.find((c) => c.uid === state.armedUid) ?? state.hand[state.focus];
      if (!card || !canPlay(card, state.last)) {
        return {
          ...state,
          shake: state.shake + 1,
          message: "Esa jugada no vale. Mirá la carta de la mesa.",
        };
      }
      if (card.suit === "wild") {
        return openQuiz(state, state.hand.filter((c) => c.uid !== card.uid));
      }
      const { total, bonus } = reduction(card, action.zone);
      const before = state.water[action.zone];
      const actual = Math.min(before, total);
      const water: Waters = { ...state.water, [action.zone]: before - actual };
      const streak = actual > 0 ? state.streak + 1 : 0;
      const gain = actual * 10 + (actual > 0 ? streak * 5 : 0);
      const hand = state.hand.filter((c) => c.uid !== card.uid);
      const zoneName = ZONES.find((z) => z.id === action.zone)?.name ?? "";
      let message = `${card.title} en ${zoneName}: baja ${actual} de agua`;
      if (bonus && actual > 0) message += " (bonus de color)";
      if (actual === 0) message = `${zoneName} ya estaba seca. Igual dejaste ${SUIT(card)} en la mesa.`;
      else if (actual < total) message += ". No había más agua ahí.";
      else message += ".";
      const fx = withFx(
        state.fxId,
        actual > 0 ? [{ zone: action.zone, text: `−${actual}`, up: false }] : [],
      );
      return {
        ...state,
        water,
        hand,
        deck: state.deck,
        last: card,
        streak,
        score: state.score + gain,
        phase: "cast",
        armedUid: null,
        coach: false,
        focus: Math.max(0, Math.min(state.focus, Math.max(0, hand.length - 1))),
        message,
        ...fx,
      };
    }
    case "hint": {
      if (state.phase !== "turn") return state;
      return {
        ...state,
        message: state.armedUid ? "Elegí la zona en el mapa." : "Primero elegí la carta del medio.",
      };
    }
    case "draw": {
      if (state.phase !== "turn") return state;
      let hand = state.hand;
      let deck = state.deck;
      let message = "Pasaste el turno y robaste una carta boca abajo.";
      if (hand.length >= HAND_CAP) {
        message = "La mano está llena: pasaste el turno sin robar.";
      } else {
        const got = pull(deck);
        hand = [...hand, got.card];
        deck = got.deck;
      }
      return {
        ...state,
        hand,
        deck,
        phase: "cast",
        streak: 0,
        armedUid: null,
        coach: false,
        focus: Math.max(0, hand.length - 1),
        message,
      };
    }
    case "quiz-pick": {
      if (state.phase !== "quiz" || !state.quiz || state.quiz.picked !== null) return state;
      const question = QUESTIONS[state.quiz.q];
      if (!question) return state;
      const correct = action.choice === question.answer;
      const drops: Array<{ zone: ZoneId; text: string; up: boolean }> = [];
      const water: Waters = { ...state.water };
      if (correct) {
        for (const z of ZONE_IDS) {
          if (water[z] > 0) {
            water[z] -= 1;
            drops.push({ zone: z, text: "−1", up: false });
          }
        }
      }
      const fx = withFx(state.fxId, drops);
      return {
        ...state,
        phase: "quizDone",
        water,
        score: state.score + (correct ? 40 : 0),
        quiz: { ...state.quiz, picked: action.choice, correct },
        message: correct
          ? "¡Correcto! Bajó 1 de agua en todo el barrio."
          : "Casi. La alerta no llegó a tiempo.",
        ...fx,
      };
    }
    case "quiz-continue": {
      if (state.phase !== "quizDone") return state;
      return { ...state, phase: "cast", quiz: state.quiz };
    }
    case "apply-weather": {
      if (state.phase !== "cast") return state;
      const storm = applyStorm(state.water, state.forecast.hits);
      const fx = withFx(
        state.fxId,
        ZONE_IDS.filter((z) => storm.deltas[z]).map((z) => ({
          zone: z,
          text: `+${storm.deltas[z]}`,
          up: true,
        })),
      );
      const calm = Object.keys(storm.deltas).length === 0;
      let message = calm
        ? `${state.forecast.title}: no subió el agua.`
        : `${state.forecast.title}: el agua subió.`;
      if (storm.spilled) message += " El arroyo se desbordó hacia la plaza, las casas y la parroquia.";
      return {
        ...state,
        phase: "rising",
        water: storm.water,
        spilled: storm.spilled,
        shake: state.shake + (storm.spilled ? 2 : 1),
        message,
        ...fx,
      };
    }
    case "finish-weather": {
      if (state.phase !== "rising") return state;
      const reason = lossReason(state.water);
      if (reason) {
        return {
          ...state,
          phase: "over",
          won: false,
          overReason: reason,
          fx: [],
        };
      }
      if (state.mode === "learn" && state.round >= 10) {
        const bonus = ZONE_IDS.filter((z) => state.water[z] === 0).length * 20;
        return {
          ...state,
          phase: "over",
          won: true,
          score: state.score + bonus,
          overReason: "El barrio resistió las 10 rondas.",
          fx: [],
        };
      }
      const survive = 50 + (state.mode === "arcade" ? state.round * 8 : 0);
      const round = state.round + 1;
      const refilled = drawTo(state.hand, state.deck, Math.min(5, HAND_CAP));
      return {
        ...state,
        phase: "turn",
        round,
        score: state.score + survive,
        hand: refilled.hand,
        deck: refilled.deck,
        forecast: forecastFor(round, state.mode),
        focus: Math.max(0, Math.min(state.focus, refilled.hand.length - 1)),
        armedUid: null,
        spilled: false,
        fx: [],
        message: "Nueva ronda. Mirá qué zonas se van a mojar y recién ahí jugá.",
      };
    }
    default:
      return state;
  }
}

function SUIT(card: Card): string {
  return card.suit === "wild" ? "el comodín" : SUIT_NAME[card.suit];
}

export function survivedRounds(game: Game): number {
  if (game.won) return game.mode === "learn" ? 10 : game.round;
  return Math.max(0, game.round - 1);
}
