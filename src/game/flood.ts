
/** Arcade infinito: deslizarse por las calles de Virreyes mientras sube el arroyo. */

export const COLS = 11;
export const SECTOR_H = 17;
export const STREET_COLS = [2, 5, 8] as const;

export type Kind =
  | "casa"
  | "comercio"
  | "colegio"
  | "hospital"
  | "iglesia"
  | "street"
  | "plaza"
  | "tree"
  | "fountain"
  | "auto"
  | "obra"
  | "escombro"
  | "orb"
  | "power";

export type Tile = { kind: Kind; v: number };

export type Landmark = {
  id: string;
  row: number;
  col: number;
  name: string;
  points: number;
};

export type Collectible = {
  id: string;
  row: number;
  col: number;
  kind: "orb" | "power";
  points: number;
  power?: "speed" | "shield" | "magnet";
};

export type Sector = {
  tiles: Tile[][];
  exitCol: number;
  landmarks: Landmark[];
  collectibles: Collectible[];
  avenue: boolean;
};

export type World = { seed: number; sectors: Sector[] };

export type Dir = "n" | "s" | "e" | "w";

export const DIR_DELTA: Record<Dir, { dc: number; dr: number }> = {
  n: { dc: 0, dr: 1 },
  s: { dc: 0, dr: -1 },
  e: { dc: 1, dr: 0 },
  w: { dc: -1, dr: 0 },
};

export type FloodEvent =
  | { type: "slide"; dir: Dir }
  | { type: "bump" }
  | { type: "landmark"; name: string; points: number }
  | { type: "orb"; points: number }
  | { type: "power"; power: "speed" | "shield" | "magnet"; points: number }
  | { type: "record"; surplus: number }
  | { type: "dead" };

export type ActivePower = {
  kind: "speed" | "shield" | "magnet";
  remaining: number;
};

export type Run = {
  col: number;
  row: number;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  t: number;
  moving: boolean;
  dir: Dir | null;
  intent: Dir | null;
  water: number;
  alive: boolean;
  elapsed: number;
  maxRow: number;
  score: number;
  bonus: number;
  got: Set<string>;
  scan: number;
  previousBest: number;
  celebrated: boolean;
  surplus: number;
  holdingWall: boolean;
  power: ActivePower | null;
  orbCount: number;
};

const SHOP_NAMES = ["KIOSCO", "ALMACEN", "FARMACIA", "PANADERIA", "VERDULERIA", "CAFETERIA", "LIBRERIA"] as const;
const BLOCKERS: Kind[] = ["auto", "obra", "escombro"];

function walkable(kind: Kind): boolean {
  return kind === "street" || kind === "plaza" || kind === "orb" || kind === "power";
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function opposite(a: Dir, b: Dir): boolean {
  return (
    (a === "n" && b === "s") ||
    (a === "s" && b === "n") ||
    (a === "e" && b === "w") ||
    (a === "w" && b === "e")
  );
}

export function dirFromCode(code: string): Dir | null {
  switch (code) {
    case "ArrowUp":
    case "KeyW":
      return "n";
    case "ArrowDown":
    case "KeyS":
      return "s";
    case "ArrowLeft":
    case "KeyA":
      return "w";
    case "ArrowRight":
    case "KeyD":
      return "e";
    default:
      return null;
  }
}

/** Norte en pantalla es arriba: A y flecha izquierda bajan la columna. */
export function screenSign(dir: Dir): { x: number; y: number } {
  if (dir === "w") return { x: -1, y: 0 };
  if (dir === "e") return { x: 1, y: 0 };
  if (dir === "n") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function variant(col: number, row: number, index: number): number {
  return Math.abs((col * 13 + row * 47 + index * 91) % 8);
}

function shortest(open: boolean[][], startC: number, goalRow: number): number {
  const H = open.length;
  const W = open[0]?.length ?? 0;
  if (!open[0]?.[startC]) return Infinity;
  const q: { r: number; c: number; d: number }[] = [{ r: 0, c: startC, d: 0 }];
  const seen = new Uint8Array(H * W);
  seen[startC] = 1;
  let head = 0;
  while (head < q.length) {
    const cur = q[head++]!;
    if (cur.r === goalRow) return cur.d;
    const next = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dc, dr] of next) {
      const nc = cur.c + dc!;
      const nr = cur.r + dr!;
      if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
      if (!open[nr]![nc]) continue;
      const k = nr * W + nc;
      if (seen[k]) continue;
      seen[k] = 1;
      q.push({ r: nr, c: nc, d: cur.d + 1 });
    }
  }
  return Infinity;
}

/** Velocidad de deslizamiento del jugador (más rápida con power speed). */
export function slideSpeed(row: number, power?: ActivePower | null): number {
  const sector = Math.max(0, row) / SECTOR_H;
  const base = Math.min(16.4, 12.6 + sector * 0.04);
  if (power?.kind === "speed") return base * 1.38;
  return base;
}

export function waterSpeed(row: number, gap = 8): number {
  const sector = Math.max(0, row) / SECTOR_H;
  // Progresión más marcada en etapas avanzadas
  const base = Math.min(6.2, 1.05 + sector * 0.072 + Math.max(0, sector - 8) * 0.04);
  const pressure = gap > 16 ? 1.55 : gap > 9 ? 1.18 : gap < 3.2 ? 0.55 : 1;
  return base * pressure;
}

/**
 * Generación urbana mejorada:
 * - Manzanas de distinto tamaño
 * - Calles principales + pasajes laterales
 * - Bifurcaciones y rutas alternativas
 * - Validación de transitabilidad
 * - Orbes y power-ups estratégicos
 */
function makeSector(index: number, seed: number, entryCol: number): Sector {
  const rng = mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  const H = SECTOR_H;
  const W = COLS;
  const open = Array.from({ length: H }, () => Array<boolean>(W).fill(false));
  const forced = Array.from({ length: H }, () => Array<Kind | null>(W).fill(null));

  // Calles verticales principales (siempre)
  const vCols = [2, 5, 8];
  // Horizontales base + variación por sector
  const horizBase = [0, 4, 8, 12, 16];
  // Ocasionalmente agregar una calle horizontal intermedia (pasaje)
  const extraHoriz: number[] = [];
  if (rng() < 0.45 && index > 0) {
    const candidates = [2, 6, 10, 14];
    const pick = candidates[Math.floor(rng() * candidates.length)]!;
    if (!horizBase.includes(pick)) extraHoriz.push(pick);
  }
  const horiz = [...horizBase, ...extraHoriz].sort((a, b) => a - b);

  for (const c of vCols) {
    for (let r = 0; r < H; r++) open[r]![c] = true;
  }
  for (const r of horiz) {
    for (let c = 1; c <= W - 2; c++) open[r]![c] = true;
  }

  // Pasajes laterales estrechos (callejones) — dan rutas alternativas
  if (index > 0 && rng() < 0.55) {
    const alleyCol = rng() < 0.5 ? 1 : 9;
    const alleyR0 = horiz[Math.floor(rng() * (horiz.length - 1))]! + 1;
    const alleyR1 = Math.min(H - 2, alleyR0 + 2 + Math.floor(rng() * 3));
    for (let r = alleyR0; r <= alleyR1; r++) {
      open[r]![alleyCol] = true;
      // conectar al vertical más cercano
      const nearV = alleyCol === 1 ? 2 : 8;
      if (rng() < 0.7) open[r]![nearV] = true;
    }
    // puerta de acceso al callejón
    const connectR = alleyR0 + Math.floor((alleyR1 - alleyR0) / 2);
    for (let c = Math.min(alleyCol, 2); c <= Math.max(alleyCol, 2); c++) {
      open[connectR]![c] = true;
    }
    if (alleyCol === 9) {
      for (let c = 8; c <= 9; c++) open[connectR]![c] = true;
    }
  }

  // Bifurcación corta entre verticales (atajo horizontal)
  if (index > 1 && rng() < 0.4) {
    const br = 3 + Math.floor(rng() * 10);
    if (!horiz.includes(br)) {
      const c0 = 2 + Math.floor(rng() * 2) * 3; // 2 o 5
      const c1 = c0 + 3;
      for (let c = c0; c <= c1; c++) open[br]![c] = true;
    }
  }

  const avenue = index % 3 === 2;
  const plaza = index % 5 === 3 && !avenue;

  if (plaza) {
    for (let r = 5; r <= 7; r++) {
      for (let c = 3; c <= 7; c++) {
        open[r]![c] = true;
        forced[r]![c] = "plaza";
      }
    }
    const trees = [
      [3, 5],
      [7, 5],
      [3, 7],
      [7, 7],
    ];
    for (const [c, r] of trees) {
      open[r]![c] = false;
      forced[r]![c] = "tree";
    }
    open[6]![5] = false;
    forced[6]![5] = "fountain";
  }

  if (avenue) {
    for (const r of [7, 8, 9]) {
      for (let c = 1; c <= W - 2; c++) {
        open[r]![c] = true;
        if (forced[r]![c] === "tree" || forced[r]![c] === "fountain") forced[r]![c] = null;
      }
    }
  }

  // Densidad de obstáculos según dificultad (sector)
  const difficulty = Math.min(1, index / 18);
  const blockChance = 0.55 + difficulty * 0.28;

  let blocker = 0;
  let gate: number = (vCols as readonly number[]).includes(entryCol) ? entryCol : 5;
  for (let g = 0; g < horiz.length - 1; g++) {
    const r0 = horiz[g]! + 1;
    const r1 = horiz[g + 1]! - 1;
    if (r1 < r0) continue;
    const openCols = vCols.filter((c) => {
      for (let r = r0; r <= r1; r++) if (!open[r]![c]) return false;
      return true;
    });
    if (!openCols.length) continue;
    if (!(index === 0 && g === 0)) {
      const shift = openCols.filter((c) => c !== gate);
      if (shift.length && rng() < 0.82) gate = shift[Math.floor(rng() * shift.length)]!;
    }
    if (!openCols.includes(gate)) gate = openCols[Math.floor(rng() * openCols.length)]!;

    for (const c of openCols) {
      if (c === gate) continue;
      if (rng() > blockChance) continue;
      const cells: { r: number; c: number }[] = [];
      for (let r = r0; r <= r1; r++) {
        if (avenue && (r === 7 || r === 9)) continue;
        if (open[r]![c] && !forced[r]![c]) cells.push({ r, c });
      }
      if (!cells.length) continue;
      // Bloquear solo una parte del tramo (deja espacio para orbes en bordes)
      const take = Math.max(1, Math.floor(cells.length * (0.55 + difficulty * 0.25)));
      const start = Math.floor(rng() * Math.max(1, cells.length - take + 1));
      const slice = cells.slice(start, start + take);
      const prev = slice.map((cell) => open[cell.r]![cell.c]);
      for (const cell of slice) open[cell.r]![cell.c] = false;
      const dist = shortest(open, Math.min(W - 2, Math.max(1, entryCol)), H - 1);
      if (!Number.isFinite(dist) || dist > 90) {
        slice.forEach((cell, i) => {
          open[cell.r]![cell.c] = prev[i]!;
        });
      } else {
        const kind = BLOCKERS[blocker++ % BLOCKERS.length]!;
        for (const cell of slice) forced[cell.r]![cell.c] = kind;
      }
    }
  }

  // Garantizar path desde entry hasta el final del sector
  if (!Number.isFinite(shortest(open, entryCol, H - 1))) {
    for (let r = 0; r < H; r++) {
      open[r]![entryCol] = true;
      forced[r]![entryCol] = null;
    }
  }

  // Garantizar que exit también sea alcanzable
  let exit = entryCol;
  if (rng() < 0.48) {
    const choices = vCols.filter((c) => c !== entryCol);
    const candidate = choices[Math.floor(rng() * choices.length)] ?? entryCol;
    // verificar que se pueda llegar al exit desde entry
    if (Number.isFinite(shortest(open, entryCol, H - 1))) {
      // forzar última fila abierta en exit
      open[H - 1]![candidate] = true;
      forced[H - 1]![candidate] = null;
      exit = candidate;
    }
  }
  open[H - 1]![exit] = true;
  forced[H - 1]![exit] = null;

  const tiles: Tile[][] = Array.from({ length: H }, (_, r) =>
    Array.from({ length: W }, (_, c) => {
      const tag = forced[r]![c];
      if (tag && tag !== "plaza") return { kind: tag, v: variant(c, r, index) };
      if (open[r]![c]) return { kind: tag === "plaza" ? "plaza" : "street", v: variant(c, r, index) };
      return { kind: "casa", v: variant(c, r, index) };
    }),
  );

  const paintBlock = (c0: number, c1: number, r0: number, r1: number, kind: Kind) => {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!open[r]![c] && tiles[r]![c]!.kind === "casa") tiles[r]![c] = { kind, v: variant(c, r, index) };
      }
    }
  };

  if (!plaza && index % 4 === 1) paintBlock(3, 4, 1, 3, "colegio");
  if (!plaza && index % 4 === 2) paintBlock(6, 7, 9, 11, "hospital");
  if (!plaza && index % 4 === 0 && index > 0) paintBlock(3, 4, 13, 15, "iglesia");

  // Variedad de fachadas: comercios en avenidas y algunas manzanas
  if (avenue) {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        if (tiles[r]![c]!.kind !== "casa" && tiles[r]![c]!.kind !== "colegio") continue;
        const near =
          (r > 0 && tiles[r - 1]![c]!.kind === "street" && (r - 1 === 7 || r - 1 === 8 || r - 1 === 9)) ||
          (r + 1 < H && tiles[r + 1]![c]!.kind === "street" && (r + 1 === 7 || r + 1 === 8 || r + 1 === 9));
        if (near) tiles[r]![c] = { kind: "comercio", v: variant(c, r, index) };
      }
    }
  } else if (index % 2 === 0) {
    for (let c = 3; c <= 7; c++) {
      if (tiles[3]![c]?.kind === "casa") tiles[3]![c] = { kind: "comercio", v: variant(c, 3, index) };
    }
  }
  // Más comercios en bordes de calles en sectores medios+
  if (index > 2 && rng() < 0.5) {
    for (let r = 1; r < H - 1; r++) {
      for (const c of [1, 3, 4, 6, 7, 9]) {
        if (tiles[r]![c]?.kind === "casa" && (open[r]![c - 1] || open[r]![c + 1])) {
          if (rng() < 0.18) tiles[r]![c] = { kind: "comercio", v: variant(c, r, index) };
        }
      }
    }
  }

  const landmarks: Landmark[] = [];
  if (plaza) landmarks.push({ id: `${index}-plaza`, row: 6, col: 5, name: "PLAZA", points: 40 });
  if (avenue) landmarks.push({ id: `${index}-av`, row: 8, col: 5, name: "AV. VIRREYES", points: 25 });
  if (!plaza && index % 4 === 1) landmarks.push({ id: `${index}-esc`, row: 2, col: 4, name: "SEC. 26", points: 40 });
  if (!plaza && index % 4 === 2) landmarks.push({ id: `${index}-hos`, row: 10, col: 6, name: "HOSPITAL", points: 40 });
  if (!plaza && index % 4 === 0 && index > 0) {
    landmarks.push({ id: `${index}-igl`, row: 14, col: 4, name: "IGLESIA", points: 40 });
  }

  // ——— Orbes y power-ups ———
  const collectibles: Collectible[] = [];
  const used = new Set<string>();
  const markUsed = (r: number, c: number) => used.add(`${r},${c}`);

  // Orbes en rutas transitables, con preferencia por caminos secundarios y bordes
  const walkCells: { r: number; c: number }[] = [];
  for (let r = 1; r < H - 1; r++) {
    for (let c = 1; c < W - 1; c++) {
      if (open[r]![c] && (!forced[r]![c] || forced[r]![c] === "plaza")) {
        walkCells.push({ r, c });
      }
    }
  }

  const orbTarget = Math.min(7, 3 + Math.floor(difficulty * 4) + (plaza ? 2 : 0));
  let orbsPlaced = 0;
  // Mezclar con sesgo hacia columnas no-gate (rutas más arriesgadas)
  const shuffled = walkCells.slice().sort(() => rng() - 0.5);
  for (const cell of shuffled) {
    if (orbsPlaced >= orbTarget) break;
    const key = `${cell.r},${cell.c}`;
    if (used.has(key)) continue;
    // Menos probabilidad en la calle principal de entrada
    const isMain = cell.c === entryCol || cell.c === gate;
    if (isMain && rng() < 0.55) continue;
    if (rng() > 0.38) continue;
    markUsed(cell.r, cell.c);
    const points = isMain ? 8 : 15 + Math.floor(rng() * 10);
    collectibles.push({
      id: `${index}-orb-${orbsPlaced}`,
      row: cell.r,
      col: cell.c,
      kind: "orb",
      points,
    });
    orbsPlaced++;
  }

  // Power-up ocasional (más frecuente en sectores difíciles)
  if (index > 1 && rng() < 0.22 + difficulty * 0.18) {
    const free = walkCells.filter((c) => !used.has(`${c.r},${c.c}`));
    if (free.length) {
      const cell = free[Math.floor(rng() * free.length)]!;
      markUsed(cell.r, cell.c);
      const powers: Array<"speed" | "shield" | "magnet"> = ["speed", "shield", "magnet"];
      const power = powers[Math.floor(rng() * powers.length)]!;
      collectibles.push({
        id: `${index}-pwr-${cell.r}-${cell.c}`,
        row: cell.r,
        col: cell.c,
        kind: "power",
        points: 20,
        power,
      });
    }
  }

  return { tiles, exitCol: exit, landmarks, collectibles, avenue };
}

export function createWorld(seed: number): World {
  const world: World = { seed, sectors: [] };
  ensureWorld(world, 0);
  return world;
}

export function ensureWorld(world: World, row: number) {
  const need = Math.max(0, row) + SECTOR_H * 2;
  let guard = 0;
  while (world.sectors.length * SECTOR_H <= need && world.sectors.length < 8000 && guard++ < 80) {
    const i = world.sectors.length;
    const entry = i === 0 ? 5 : world.sectors[i - 1]!.exitCol;
    world.sectors.push(makeSector(i, world.seed, entry));
  }
}

export function tileAt(world: World, col: number, row: number): Tile | null {
  if (row < 0 || col < 0 || col >= COLS) return null;
  const si = Math.floor(row / SECTOR_H);
  const lr = row - si * SECTOR_H;
  return world.sectors[si]?.tiles[lr]?.[col] ?? null;
}

export function isWalk(world: World, col: number, row: number): boolean {
  const tile = tileAt(world, col, row);
  return !!tile && walkable(tile.kind);
}

export function sectorAt(world: World, row: number): Sector | null {
  if (row < 0) return null;
  return world.sectors[Math.floor(row / SECTOR_H)] ?? null;
}

export function createRun(previousBest: number): Run {
  return {
    col: 5,
    row: 0,
    fromCol: 5,
    fromRow: 0,
    toCol: 5,
    toRow: 0,
    t: 1,
    moving: false,
    dir: null,
    intent: null,
    water: -6.4,
    alive: true,
    elapsed: 0,
    maxRow: 0,
    score: 0,
    bonus: 0,
    got: new Set(),
    scan: 0,
    previousBest,
    celebrated: false,
    surplus: 0,
    holdingWall: false,
    power: null,
    orbCount: 0,
  };
}

export function playerCenter(run: Run): { col: number; row: number } {
  if (!run.moving) return { col: run.col + 0.5, row: run.row + 0.5 };
  return {
    col: run.fromCol + (run.toCol - run.fromCol) * run.t + 0.5,
    row: run.fromRow + (run.toRow - run.fromRow) * run.t + 0.5,
  };
}

function recompute(run: Run) {
  run.score = Math.floor(Math.max(0, run.maxRow) * 12 + run.elapsed * 5 + run.bonus);
  if (run.celebrated) run.surplus = run.score - run.previousBest;
}

function collect(world: World, run: Run, events: FloodEvent[]) {
  while (run.scan < world.sectors.length) {
    const sector = world.sectors[run.scan]!;
    let pending = false;
    for (const lm of sector.landmarks) {
      const wr = run.scan * SECTOR_H + lm.row;
      if (run.maxRow + 0.01 >= wr) {
        if (!run.got.has(lm.id)) {
          run.got.add(lm.id);
          run.bonus += lm.points;
          events.push({ type: "landmark", name: lm.name, points: lm.points });
        }
      } else pending = true;
    }
    // Collectibles (orbs / powers) por proximidad del jugador
    for (const item of sector.collectibles ?? []) {
      if (run.got.has(item.id)) continue;
      const wr = run.scan * SECTOR_H + item.row;
      const pc = playerCenter(run);
      const dist = Math.hypot(pc.col - (item.col + 0.5), pc.row - (wr + 0.5));
      const magnetRange = run.power?.kind === "magnet" ? 1.85 : 0.55;
      if (dist <= magnetRange) {
        run.got.add(item.id);
        run.bonus += item.points;
        if (item.kind === "orb") {
          run.orbCount += 1;
          events.push({ type: "orb", points: item.points });
        } else if (item.kind === "power" && item.power) {
          run.power = { kind: item.power, remaining: 12 };
          events.push({ type: "power", power: item.power, points: item.points });
        }
      } else if (wr > run.maxRow + 2) {
        pending = true;
      }
    }
    const sectorEnd = run.scan * SECTOR_H + SECTOR_H - 1;
    if (pending || run.maxRow < sectorEnd) break;
    run.scan += 1;
  }
}

export function stepRun(world: World, run: Run, dtIn: number): FloodEvent[] {
  const events: FloodEvent[] = [];
  if (!run.alive) return events;
  const dt = Math.max(0, Math.min(0.05, dtIn));
  run.elapsed += dt;
  ensureWorld(world, Math.floor(run.row) + 24);

  // Power-up timer
  if (run.power) {
    run.power.remaining -= dt;
    if (run.power.remaining <= 0) run.power = null;
  }

  const gapNow = (run.moving ? run.fromRow + (run.toRow - run.fromRow) * run.t : run.row) - run.water;
  // Shield reduce un poco la presión del agua
  const waterMul = run.power?.kind === "shield" ? 0.72 : 1;
  run.water += waterSpeed(run.maxRow, gapNow) * waterMul * dt;

  if (run.moving && run.dir && run.intent && opposite(run.dir, run.intent)) {
    const fc = run.fromCol;
    const fr = run.fromRow;
    run.fromCol = run.toCol;
    run.fromRow = run.toRow;
    run.toCol = fc;
    run.toRow = fr;
    run.t = 1 - run.t;
    run.dir = run.intent;
    events.push({ type: "slide", dir: run.intent });
  }

  let remaining = run.intent ? slideSpeed(run.maxRow, run.power) * dt : 0;
  let guard = 0;
  while (remaining > 0 && run.alive && guard++ < 48) {
    if (!run.moving) {
      if (!run.intent) break;
      const d = DIR_DELTA[run.intent];
      const nc = run.col + d.dc;
      const nr = run.row + d.dr;
      if (!isWalk(world, nc, nr)) break;
      run.fromCol = run.col;
      run.fromRow = run.row;
      run.toCol = nc;
      run.toRow = nr;
      run.t = 0;
      run.moving = true;
      run.dir = run.intent;
      run.holdingWall = false;
      events.push({ type: "slide", dir: run.intent });
    }
    const left = 1 - run.t;
    if (remaining < left) {
      run.t += remaining;
      remaining = 0;
    } else {
      remaining -= left;
      run.t = 1;
      run.col = run.toCol;
      run.row = run.toRow;
      run.moving = false;
      run.dir = null;
    }
  }

  if (!run.moving && run.intent) {
    const d = DIR_DELTA[run.intent];
    if (!isWalk(world, run.col + d.dc, run.row + d.dr)) {
      if (!run.holdingWall) {
        run.holdingWall = true;
        events.push({ type: "bump" });
      }
    } else run.holdingWall = false;
  } else if (!run.intent) run.holdingWall = false;

  const south = run.moving ? run.fromRow + (run.toRow - run.fromRow) * run.t : run.row;
  if (south > run.maxRow) run.maxRow = south;
  collect(world, run, events);
  recompute(run);

  if (!run.celebrated && run.previousBest > 0 && run.score > run.previousBest) {
    run.celebrated = true;
    run.surplus = run.score - run.previousBest;
    events.push({ type: "record", surplus: run.surplus });
  }

  // Shield da un pequeño margen extra antes de morir
  const drownMargin = run.power?.kind === "shield" ? 0.42 : 0.18;
  if (run.water >= south + drownMargin) {
    run.alive = false;
    events.push({ type: "dead" });
  }
  return events;
}

export function shopName(col: number, row: number, sector: number): string {
  const i = Math.abs(col * 3 + row * 5 + sector) % SHOP_NAMES.length;
  return SHOP_NAMES[i]!;
}
