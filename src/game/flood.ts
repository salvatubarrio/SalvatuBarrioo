
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
  | "contenedor"
  | "bache"
  | "poste"
  | "escalera"
  | "pasarela"
  | "azotea";

export type Tile = { kind: Kind; v: number };

export type TrafficVehicle = {
  id: string;
  row: number;
  x: number;
  direction: -1 | 1;
  speed: number;
  variant: number;
};

export type Orb = {
  id: string;
  row: number;
  col: number;
  points: number;
};

export type Landmark = {
  id: string;
  row: number;
  col: number;
  name: string;
  points: number;
};

export type Sector = {
  tiles: Tile[][];
  exitCol: number;
  landmarks: Landmark[];
  orbs: Orb[];
  traffic: TrafficVehicle[];
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
  | { type: "orb"; points: number; row: number; col: number }
  | { type: "crash" }
  | { type: "record"; surplus: number }
  | { type: "dead" };

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
  deathCause: "water" | "traffic" | null;
};

type TrafficMotion = {
  vehicle: TrafficVehicle;
  sectorIndex: number;
  fromX: number;
  toX: number;
};

const SHOP_NAMES = ["KIOSCO", "ALMACEN", "FARMACIA", "PANADERIA", "VERDULERIA"] as const;
const BLOCKERS: Kind[] = ["auto", "obra", "escombro", "contenedor", "bache", "poste"];

function walkable(kind: Kind): boolean {
  return kind === "street" || kind === "plaza" || kind === "escalera" || kind === "pasarela" || kind === "azotea";
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
  return Math.abs((col * 13 + row * 47 + index * 91) % 6);
}

type Seg = { cells: { r: number; c: number }[]; vertical: boolean; col: number };

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

/** Todas las celdas transitables conectadas con la entrada del sector. */
function reachableCells(open: boolean[][], startC: number): { r: number; c: number }[] {
  const H = open.length;
  const W = open[0]?.length ?? 0;
  if (!open[0]?.[startC]) return [];
  const q = [{ r: 0, c: startC }];
  const seen = new Uint8Array(H * W);
  seen[startC] = 1;
  const cells: { r: number; c: number }[] = [];
  for (let head = 0; head < q.length; head++) {
    const cur = q[head]!;
    cells.push(cur);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = cur.c + dc!;
      const nr = cur.r + dr!;
      if (nr < 0 || nc < 0 || nr >= H || nc >= W || !open[nr]![nc]) continue;
      const key = nr * W + nc;
      if (seen[key]) continue;
      seen[key] = 1;
      q.push({ r: nr, c: nc });
    }
  }
  return cells;
}

export function slideSpeed(row: number): number {
  const sector = Math.max(0, row) / SECTOR_H;
  return Math.min(15.2, 12.4 + sector * 0.035);
}

export function waterSpeed(row: number, gap = 8): number {
  const sector = Math.max(0, row) / SECTOR_H;
  const base = Math.min(5.4, 1.05 + sector * 0.065);
  const pressure = gap > 16 ? 1.5 : gap > 9 ? 1.15 : gap < 3.5 ? 0.58 : 1;
  return base * pressure;
}

function makeSector(index: number, seed: number, entryCol: number): Sector {
  const rng = mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  const H = SECTOR_H;
  const W = COLS;
  const open = Array.from({ length: H }, () => Array<boolean>(W).fill(false));
  const forced = Array.from({ length: H }, () => Array<Kind | null>(W).fill(null));
  const horiz = [0, 4, 8, 12, 16];
  // Variar el ancho de las manzanas sin perder la retícula urbana ni las conexiones.
  const laneLayouts = [[2, 5, 8], [1, 5, 9], [1, 4, 8], [2, 6, 9]] as const;
  const vCols: number[] = [...laneLayouts[Math.floor(rng() * laneLayouts.length)]!];

  for (const c of vCols) {
    for (let r = 0; r < H; r++) open[r]![c] = true;
  }
  for (const r of horiz) {
    for (let c = 1; c <= W - 2; c++) open[r]![c] = true;
  }

  const avenue = index % 3 === 2;
  const plaza = index % 4 === 3 && !avenue;

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

  let blocker = 0;
  let gate: number = (vCols as readonly number[]).includes(entryCol) ? entryCol : 5;
  const gateAtRow = new Map<number, number>();
  for (let g = 0; g < horiz.length - 1; g++) {
    const r0 = horiz[g]! + 1;
    const r1 = horiz[g + 1]! - 1;
    const openCols = vCols.filter((c) => {
      for (let r = r0; r <= r1; r++) if (!open[r]![c]) return false;
      return true;
    });
    if (!openCols.length) continue;
    if (!(index === 0 && g === 0)) {
      const shift = openCols.filter((c) => c !== gate);
      if (shift.length && rng() < 0.85) gate = shift[Math.floor(rng() * shift.length)]!;
    }
    if (!openCols.includes(gate)) gate = openCols[Math.floor(rng() * openCols.length)]!;
    gateAtRow.set(horiz[g + 1]!, gate);
    for (const c of openCols) {
      if (c === gate) continue;
      const cells: { r: number; c: number }[] = [];
      for (let r = r0; r <= r1; r++) {
        if (avenue && (r === 7 || r === 9)) continue;
        if (open[r]![c] && !forced[r]![c]) cells.push({ r, c });
      }
      if (!cells.length) continue;
      const prev = cells.map((cell) => open[cell.r]![cell.c]);
      for (const cell of cells) open[cell.r]![cell.c] = false;
      const dist = shortest(open, Math.min(W - 2, Math.max(1, entryCol)), H - 1);
      if (!Number.isFinite(dist) || dist > 72) {
        cells.forEach((cell, i) => {
          open[cell.r]![cell.c] = prev[i]!;
        });
      } else {
        const kind = BLOCKERS[blocker++ % BLOCKERS.length]!;
        for (const cell of cells) forced[cell.r]![cell.c] = kind;
      }
    }
  }

  if (!Number.isFinite(shortest(open, entryCol, H - 1))) {
    for (let r = 0; r < H; r++) {
      open[r]![entryCol] = true;
      forced[r]![entryCol] = null;
    }
  }

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

  const landmarks: Landmark[] = [];
  if (plaza) landmarks.push({ id: `${index}-plaza`, row: 6, col: 5, name: "PLAZA", points: 40 });
  if (avenue) landmarks.push({ id: `${index}-av`, row: 8, col: 5, name: "AV. VIRREYES", points: 25 });
  if (!plaza && index % 4 === 1) landmarks.push({ id: `${index}-esc`, row: 2, col: 4, name: "SEC. 26", points: 40 });
  if (!plaza && index % 4 === 2) landmarks.push({ id: `${index}-hos`, row: 10, col: 6, name: "HOSPITAL", points: 40 });
  if (!plaza && index % 4 === 0 && index > 0) {
    landmarks.push({ id: `${index}-igl`, row: 14, col: 4, name: "IGLESIA", points: 40 });
  }

  // Atajo opcional por azoteas: conecta dos calles a través de los techos.
  // Es un mini-puzzle legible: subir una escalera, cruzar la azotea y bajar por la otra.
  for (let attempt = 0; attempt < 4; attempt++) {
    const g = (index + attempt) % 4;
    const bottomRow = horiz[g]!;
    const topRow = horiz[g + 1]!;
    const roofRow = bottomRow + 2;
    const startCol = g === 0 ? entryCol : (gateAtRow.get(bottomRow) ?? entryCol);
    let endCol = gateAtRow.get(topRow) ?? startCol;
    if (endCol === startCol) {
      endCol = vCols
        .filter((c) => c !== startCol)
        .sort((a, b) => Math.abs(a - startCol) - Math.abs(b - startCol))[0] ?? startCol;
    }
    const left = Math.min(startCol, endCol);
    const right = Math.max(startCol, endCol);
    const pathHasLandmark = landmarks.some((item) => item.row === roofRow && item.col >= left && item.col <= right);
    const specialKinds: Kind[] = ["colegio", "hospital", "iglesia", "plaza", "tree", "fountain"];
    const pathHitsSpecial = Array.from({ length: right - left + 1 }, (_, i) => tiles[roofRow]![left + i]!.kind)
      .some((kind) => specialKinds.includes(kind));
    const stairRowsSafe = ![roofRow - 1, roofRow + 1].some((r, i) => {
      const c = i === 0 ? startCol : endCol;
      return specialKinds.includes(tiles[r]![c]!.kind);
    });
    if (startCol === endCol || pathHasLandmark || pathHitsSpecial || !stairRowsSafe) continue;

    for (const [r, c] of [[roofRow - 1, startCol], [roofRow + 1, endCol]] as const) {
      open[r]![c] = true;
      forced[r]![c] = "escalera";
      tiles[r]![c] = { kind: "escalera", v: variant(c, r, index) };
    }
    for (let c = left; c <= right; c++) {
      open[roofRow]![c] = true;
      forced[roofRow]![c] = "azotea";
      tiles[roofRow]![c] = { kind: "azotea", v: variant(c, roofRow, index) };
    }
    break;
  }

  // Tránsito horizontal. Cada avenida con autos incluye una pasarela elevada
  // de punta a punta: ningún coche puede tapar la única salida de un sector.
  const availableTrafficRows = [4, 8, 12].filter((r) => !landmarks.some((item) => item.row === r));
  const trafficCount = index < 3 ? 1 : index < 8 ? 2 : 3;
  const trafficRows = availableTrafficRows.slice();
  for (let i = trafficRows.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [trafficRows[i], trafficRows[j]] = [trafficRows[j]!, trafficRows[i]!];
  }
  const activeTrafficRows = trafficRows.slice(0, trafficCount);
  activeTrafficRows.sort((a, b) => a - b);
  for (const roadRow of activeTrafficRows) {
    const entryGate = gateAtRow.get(roadRow) ?? entryCol;
    const exitGate = gateAtRow.get(roadRow + 4) ?? entryGate;
    // Escaleras incrustadas entre las fachadas y pasarela por encima del tránsito.
    for (const [r, c] of [[roadRow - 1, entryGate], [roadRow + 1, exitGate]] as const) {
      open[r]![c] = true;
      forced[r]![c] = "escalera";
      tiles[r]![c] = { kind: "escalera", v: variant(c, r, index) };
    }
    for (let c = 1; c <= W - 2; c++) {
      open[roadRow]![c] = true;
      forced[roadRow]![c] = "pasarela";
      tiles[roadRow]![c] = { kind: "pasarela", v: variant(c, roadRow, index) };
    }
  }

  const traffic: TrafficVehicle[] = activeTrafficRows.map((row, i) => ({
    id: `${index}-traffic-${i}`,
    row,
    x: 1.7 + rng() * 7.6,
    direction: rng() < 0.5 ? -1 : 1,
    // Más ágiles para que el tránsito no parezca congelado; la ruta segura es la pasarela.
    speed: Math.min(6.2, 3.6 + index * 0.085 + rng() * 0.8),
    variant: Math.floor(rng() * 6),
  }));

  // La salida siempre pertenece a la misma componente conectada que la entrada.
  const reachable = reachableCells(open, entryCol);
  const reachableExits = vCols.filter((c) => reachable.some((cell) => cell.r === H - 1 && cell.c === c));
  const exitChoices = reachableExits.filter((c) => c !== entryCol);
  const exit = rng() < 0.4 && exitChoices.length
    ? exitChoices[Math.floor(rng() * exitChoices.length)]!
    : (reachableExits.includes(entryCol) ? entryCol : reachableExits[0] ?? entryCol);

  // Los coleccionables se ubican únicamente en calles alcanzables desde la entrada.
  // No aparecen en los carriles por los que circulan los vehículos.
  const landmarkCells = new Set(landmarks.map((item) => `${item.row}:${item.col}`));
  const trafficRowSet = new Set(trafficRows.slice(0, trafficCount));
  const candidates = reachable
    .filter(({ r, c }) => r >= 2 && r <= H - 2 && !trafficRowSet.has(r) && tiles[r]![c]!.kind === "street" && !landmarkCells.has(`${r}:${c}`))
    .sort((a, b) => (a.r - b.r) || (a.c - b.c));
  const shuffled = candidates.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const orbCount = Math.min(4, Math.max(2, Math.floor(candidates.length / 8)));
  const selected: { r: number; c: number }[] = [];
  for (const candidate of shuffled) {
    if (selected.every((other) => Math.abs(other.r - candidate.r) + Math.abs(other.c - candidate.c) >= 3)) {
      selected.push(candidate);
      if (selected.length >= orbCount) break;
    }
  }
  const orbs: Orb[] = selected.map((cell, i) => ({
    id: `${index}-orb-${i}`,
    row: cell.r,
    col: cell.c,
    points: i === 0 ? 10 : i === 1 ? 15 : 20,
  }));

  return { tiles, exitCol: exit, landmarks, orbs, traffic, avenue };
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
    deathCause: null,
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
  const center = playerCenter(run);
  const sectorIndex = Math.floor(Math.max(0, center.row) / SECTOR_H);
  for (let si = Math.max(0, sectorIndex - 1); si <= Math.min(world.sectors.length - 1, sectorIndex + 1); si++) {
    const sector = world.sectors[si]!;
    for (const orb of sector.orbs) {
      if (run.got.has(orb.id)) continue;
      const worldRow = si * SECTOR_H + orb.row;
      if (Math.hypot(center.col - (orb.col + 0.5), center.row - (worldRow + 0.5)) <= 0.48) {
        run.got.add(orb.id);
        run.bonus += orb.points;
        events.push({ type: "orb", points: orb.points, row: worldRow, col: orb.col });
      }
    }
  }
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
    const sectorEnd = run.scan * SECTOR_H + SECTOR_H - 1;
    if (pending || run.maxRow < sectorEnd) break;
    run.scan += 1;
  }
}

function advanceTraffic(world: World, row: number, dt: number): TrafficMotion[] {
  const centerSector = Math.floor(Math.max(0, row) / SECTOR_H);
  const first = Math.max(0, centerSector - 1);
  const last = Math.min(world.sectors.length - 1, centerSector + 1);
  const motions: TrafficMotion[] = [];
  for (let sectorIndex = first; sectorIndex <= last; sectorIndex++) {
    const sector = world.sectors[sectorIndex]!;
    for (const vehicle of sector.traffic) {
      const fromX = vehicle.x;
      let nextX = fromX + vehicle.direction * vehicle.speed * dt;
      if (nextX < 1.5) {
        nextX = 3 - nextX;
        vehicle.direction = 1;
      } else if (nextX > 9.5) {
        nextX = 19 - nextX;
        vehicle.direction = -1;
      }
      vehicle.x = Math.max(1.5, Math.min(9.5, nextX));
      motions.push({ vehicle, sectorIndex, fromX, toX: vehicle.x });
    }
  }
  return motions;
}

/** Colisión continua: evita que el jugador o un vehículo atraviesen al otro entre frames. */
function hitsTraffic(
  world: World,
  from: { col: number; row: number },
  to: { col: number; row: number },
  motions: TrafficMotion[],
): boolean {
  for (const motion of motions) {
    const vehicleRow = motion.sectorIndex * SECTOR_H + motion.vehicle.row + 0.5;
    const relativeTravel = Math.max(
      Math.abs(to.col - from.col) + Math.abs(to.row - from.row),
      Math.abs(motion.toX - motion.fromX),
    );
    const samples = Math.max(4, Math.ceil(relativeTravel * 12));
    for (let sample = 0; sample <= samples; sample++) {
      const t = sample / samples;
      const playerCol = from.col + (to.col - from.col) * t;
      const playerRow = from.row + (to.row - from.row) * t;
      const vehicleX = motion.fromX + (motion.toX - motion.fromX) * t;
      // La pasarela está elevada sobre los autos: cruzar por ella nunca provoca choque.
      const underpassTile = tileAt(world, Math.floor(playerCol), Math.floor(playerRow));
      if (underpassTile?.kind === "pasarela") continue;
      // Caja de choque pequeña para la persona y rectangular para el auto.
      if (Math.abs(playerCol - vehicleX) <= 0.56 && Math.abs(playerRow - vehicleRow) <= 0.39) return true;
    }
  }
  return false;
}

export function stepRun(world: World, run: Run, dtIn: number): FloodEvent[] {
  const events: FloodEvent[] = [];
  if (!run.alive) return events;
  const dt = Math.max(0, Math.min(0.05, dtIn));
  run.elapsed += dt;
  ensureWorld(world, Math.floor(run.row) + 24);
  const trafficMotions = advanceTraffic(world, run.row, dt);
  const playerBefore = playerCenter(run);
  const gapNow = (run.moving ? run.fromRow + (run.toRow - run.fromRow) * run.t : run.row) - run.water;
  run.water += waterSpeed(run.maxRow, gapNow) * dt;

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

  // Si se suelta la dirección, termina el paso actual y frena en la baldosa siguiente.
  let remaining = (run.intent || run.moving) ? slideSpeed(run.maxRow) * dt : 0;
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
  const playerAfter = playerCenter(run);
  if (hitsTraffic(world, playerBefore, playerAfter, trafficMotions)) {
    run.alive = false;
    run.deathCause = "traffic";
    events.push({ type: "crash" });
  }
  if (run.alive) collect(world, run, events);
  recompute(run);

  if (!run.celebrated && run.previousBest > 0 && run.score > run.previousBest) {
    run.celebrated = true;
    run.surplus = run.score - run.previousBest;
    events.push({ type: "record", surplus: run.surplus });
  }

  if (run.alive && run.water >= south + 0.18) {
    run.alive = false;
    run.deathCause = "water";
    events.push({ type: "dead" });
  }
  return events;
}

export function shopName(col: number, row: number, sector: number): string {
  const i = Math.abs(col * 3 + row * 5 + sector) % SHOP_NAMES.length;
  return SHOP_NAMES[i]!;
}
