export type SkyPlatformKind = "sidewalk" | "balcony" | "taxi" | "colectivo" | "awning" | "airplane";
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

export function random01(world: SkyWorld): number {
  world.seed = (Math.imul(world.seed, 1664525) + 1013904223) >>> 0;
  return world.seed / 4294967296;
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

export function extendSkyWorld(world: SkyWorld, highestHeight: number): void {
  let previous = world.platforms[world.platforms.length - 1]!;
  while (world.nextHeight < highestHeight + 560) {
    const gap = 58 + random01(world) * 24;
    const height = previous.height + gap;
    const width = 56 + Math.floor(random01(world) * 25);
    const center = previous.x + previous.width / 2 + (random01(world) * 2 - 1) * 86;
    const x = Math.max(8, Math.min(312 - width, center - width / 2));
    const index = world.generated++;
    const kind: SkyPlatformKind = index % 9 === 7
      ? "airplane"
      : index % 7 === 5
        ? "colectivo"
        : index % 5 === 2
          ? "taxi"
          : index % 5 === 4
            ? "balcony"
            : index % 5 === 1
              ? "awning"
              : "sidewalk";
    const previousHazard = previous.hazard;
    const hazard = !previousHazard && index > 2 && random01(world) < 0.115;
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
        x: Math.max(14, Math.min(306, x + width / 2 + (random01(world) - 0.5) * 34)),
        height: height + 27 + random01(world) * 12,
        kind: random01(world) < 0.62 ? "balloon" : "sun",
        collected: false,
      });
    }
    previous = platform;
    world.nextHeight = height;
  }
}

export function updateMovingPlatforms(world: SkyWorld, dt: number): void {
  for (const platform of world.platforms) {
    if (platform.kind !== "airplane" || platform.vx === 0) continue;
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

export function skyScore(highestHeight: number, bonus: number): number {
  return Math.max(0, Math.floor(highestHeight / 8) + bonus);
}
