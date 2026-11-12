export type SkyPlatformKind = "sidewalk" | "roof" | "balcony" | "taxi" | "colectivo" | "awning" | "airplane";
export type SkyPickupKind = "balloon" | "sun";

export type SkyPlatform = {
  id: number;
  x: number;
  width: number;
  height: number;
  kind: SkyPlatformKind;
  hazard: boolean;
  vx: number;
};

export type SkyPickup = {
  id: number;
  x: number;
  height: number;
  kind: SkyPickupKind;
  collected: boolean;
};

export type SkyWorld = {
  platforms: SkyPlatform[];
  pickups: SkyPickup[];
  nextHeight: number;
  nextId: number;
  seed: number;
  generated: number;
};

export const PLATFORM_WIDTHS: Record<SkyPlatformKind, readonly number[]> = {
  sidewalk: [80, 88, 96],
  roof: [72, 88, 96],
  balcony: [64, 72, 80],
  taxi: [80, 88],
  colectivo: [96, 104, 112],
  awning: [72, 80, 88],
  airplane: [88, 96, 104],
};

/** Un punto por unidad de altura. El fondo cambia en estos cortes. */
export const SKY_ZONES = [
  { at: 0, id: "calle", label: "Calle" },
  { at: 180, id: "techos", label: "Techos" },
  { at: 420, id: "cielo", label: "Cielo" },
  { at: 780, id: "altura", label: "Altura" },
  { at: 1200, id: "espacio", label: "Espacio" },
] as const;

const GAP_PATTERN = [56, 70, 78, 62, 74, 58, 76, 66, 72, 60];
const MIN_GAP = 52;
const MAX_GAP = 80;
const MAX_EDGE_GAP = 86;
const MIN_X = 8;
const RIGHT = 312;
const GOLDEN = 0.618033988749895;

const CYCLE: SkyPlatformKind[] = [
  "sidewalk", "taxi", "colectivo", "balcony", "awning", "roof",
  "taxi", "balcony", "sidewalk", "colectivo", "airplane", "awning",
];

export function random01(world: SkyWorld): number {
  world.seed = (Math.imul(world.seed, 1664525) + 1013904223) >>> 0;
  return world.seed / 4294967296;
}

export function skyZone(score: number): { id: string; label: string } {
  let zone: { id: string; label: string } = SKY_ZONES[0];
  for (const item of SKY_ZONES) {
    if (score >= item.at) zone = item;
  }
  return zone;
}

export function createSkyWorld(seed = 1): SkyWorld {
  const world: SkyWorld = {
    platforms: [{ id: 0, x: 120, width: 80, height: 0, kind: "sidewalk", hazard: false, vx: 0 }],
    pickups: [],
    nextHeight: 0,
    nextId: 1,
    seed: seed >>> 0 || 1,
    generated: 0,
  };
  extendSkyWorld(world, 620);
  return world;
}

function pickKind(world: SkyWorld, height: number, index: number): SkyPlatformKind {
  let kind = CYCLE[index % CYCLE.length]!;
  const roll = random01(world);
  if (height < 200) {
    if (kind === "airplane" || kind === "roof") kind = roll < 0.5 ? "sidewalk" : "taxi";
  } else if (height < 420) {
    if (kind === "airplane") kind = roll < 0.55 ? "roof" : "balcony";
    else if (kind === "sidewalk" && roll < 0.45) kind = "roof";
  } else if (height < 780) {
    if (kind === "sidewalk" || kind === "taxi" || kind === "colectivo") kind = roll < 0.6 ? "roof" : "airplane";
    else if (kind === "awning" && roll < 0.5) kind = "balcony";
  } else if (height < 1200) {
    if (kind !== "airplane" && kind !== "roof") kind = roll < 0.72 ? "airplane" : "roof";
  } else if (kind !== "airplane") {
    kind = roll < 0.8 ? "airplane" : "roof";
  }
  return kind;
}

function placeX(prevX: number, prevW: number, width: number, index: number): number {
  const prevCenter = prevX + prevW / 2;
  let center = 28 + ((index * GOLDEN) % 1) * 264;
  if (Math.abs(center - prevCenter) < 34) center += (index % 2 === 0 ? 1 : -1) * 96;
  const low = Math.max(MIN_X, prevX - MAX_EDGE_GAP - width);
  const high = Math.min(RIGHT - width, prevX + prevW + MAX_EDGE_GAP);
  if (low > high) return Math.max(MIN_X, Math.min(RIGHT - width, prevCenter - width / 2));
  return Math.max(low, Math.min(high, center - width / 2));
}

export function extendSkyWorld(world: SkyWorld, highestHeight: number): void {
  let previous = world.platforms[world.platforms.length - 1]!;
  while (world.nextHeight < highestHeight + 560) {
    const index = world.generated++;
    let gap = GAP_PATTERN[index % GAP_PATTERN.length]!;
    gap += Math.round((random01(world) - 0.5) * 6);
    if (gap < MIN_GAP) gap = MIN_GAP;
    if (gap > MAX_GAP) gap = MAX_GAP;
    const height = previous.height + gap;
    const kind = pickKind(world, height, index);
    const choices = PLATFORM_WIDTHS[kind];
    const width = choices[Math.floor(random01(world) * choices.length)]!;
    const x = placeX(previous.x, previous.width, width, index);
    const hazard = !previous.hazard && index > 2 && random01(world) < 0.115;
    const vx = kind === "airplane" ? (random01(world) < 0.5 ? -1 : 1) * (24 + random01(world) * 25) : 0;
    const platform: SkyPlatform = {
      id: world.nextId++,
      x,
      width,
      height,
      kind,
      hazard,
      vx,
    };
    world.platforms.push(platform);
    if (index % 4 === 2 || random01(world) < 0.16) {
      world.pickups.push({
        id: world.nextId++,
        x: Math.max(14, Math.min(306, x + width / 2 + (random01(world) - 0.5) * 20)),
        height: height + 24,
        kind: random01(world) < 0.62 ? "balloon" : "sun",
        collected: false,
      });
    }
    previous = platform;
    world.nextHeight = height;
  }
}

export function updateMovingPlatforms(world: SkyWorld, dt: number): void {
  const list = world.platforms;
  for (let i = 0; i < list.length; i++) {
    const platform = list[i]!;
    if (platform.vx === 0) continue;
    platform.x += platform.vx * dt;
    if (platform.x < 5) {
      platform.x = 5;
      platform.vx = Math.abs(platform.vx);
    } else if (platform.x + platform.width > 315) {
      platform.x = 315 - platform.width;
      platform.vx = -Math.abs(platform.vx);
    }
  }
}

/** Solo la altura cuenta. Quedarse quieto no suma. El bonus no entra al puntaje. */
export function skyScore(highestHeight: number, _bonus = 0): number {
  return Math.max(0, Math.floor(highestHeight));
}
