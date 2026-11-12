export type ScoreRow = {
  name: string;
  score: number;
  rounds: number;
  at: number;
  time?: number;
};

type Save = {
  board: ScoreRow[];
  learnBest: number;
  mute: boolean;
  musicOn: boolean;
  lastName: string;
  bestByName: Record<string, number>;
};

const KEY = "barrio-alerta-v1";
const EMPTY: Save = { board: [], learnBest: 0, mute: false, musicOn: true, lastName: "", bestByName: {} };

function validRow(row: ScoreRow): boolean {
  return (
    !!row &&
    typeof row.name === "string" &&
    typeof row.score === "number" &&
    typeof row.rounds === "number" &&
    typeof row.at === "number"
  );
}

function normalizeBest(raw: unknown, board: ScoreRow[]): Record<string, number> {
  const best: Record<string, number> = {};
  if (raw && typeof raw === "object") {
    for (const [name, score] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof score === "number" && Number.isFinite(score)) best[name.toLowerCase()] = score;
    }
  }
  for (const row of board) {
    const key = row.name.toLowerCase();
    best[key] = Math.max(best[key] ?? 0, row.score);
  }
  return best;
}

function read(): Save {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Save>;
    const board = Array.isArray(parsed.board) ? parsed.board.filter(validRow).slice(0, 20) : [];
    const last = typeof parsed.lastName === "string" ? cleanName(parsed.lastName) : null;
    return {
      board,
      learnBest: typeof parsed.learnBest === "number" ? parsed.learnBest : 0,
      mute: Boolean(parsed.mute),
      musicOn: parsed.musicOn !== false,
      lastName: last ?? "",
      bestByName: normalizeBest(parsed.bestByName, board),
    };
  } catch {
    return EMPTY;
  }
}

function write(save: Save) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(save));
}

export function loadSave(): Save {
  return read();
}

export function cleanName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, 14);
  if (name.length < 2) return null;
  if (!/^[\p{L}\p{N} ]+$/u.test(name)) return null;
  return name;
}

export function personalBest(name: string): number {
  const save = read();
  return save.bestByName[name.toLowerCase()] ?? 0;
}

export function pushArcade(row: ScoreRow): { board: ScoreRow[]; rank: number; previous: number; best: number } {
  const save = read();
  const key = row.name.toLowerCase();
  const previous = save.bestByName[key] ?? 0;
  const best = Math.max(previous, row.score);
  const board = [...save.board, row].sort((a, b) => b.score - a.score || b.rounds - a.rounds).slice(0, 20);
  write({ ...save, board, bestByName: { ...save.bestByName, [key]: best } });
  const rank = board.findIndex((r) => r.at === row.at) + 1;
  return { board, rank, previous, best };
}

export function setLearnBest(score: number): number {
  const save = read();
  const learnBest = Math.max(save.learnBest, score);
  write({ ...save, learnBest });
  return learnBest;
}

export function setMuteSaved(mute: boolean) {
  const save = read();
  write({ ...save, mute });
}

export function setMusicSaved(musicOn: boolean) {
  const save = read();
  write({ ...save, musicOn });
}

export function setLastName(name: string) {
  const save = read();
  write({ ...save, lastName: name });
}
