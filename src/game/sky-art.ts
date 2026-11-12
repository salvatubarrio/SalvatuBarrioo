import {
  PLATFORM_WIDTHS,
  type SkyPickup,
  type SkyPlatform,
  type SkyPlatformKind,
} from "@/game/sky-jump";

const W = 320;
const H = 480;

const INK = "#141414";
const DEEP = "#243246";
const SLATE = "#3e5164";
const STEEL = "#7d8b98";
const STONE = "#c9bfa6";
const SAND = "#efe4cc";
const GOLD = "#f0c431";
const GOLD2 = "#c4921a";
const CREAM = "#f3ead6";
const RED = "#d6453d";
const RED2 = "#8d2e2a";
const CELESTE = "#8ec8de";
const CELESTE2 = "#3d7f9a";
const GREEN = "#5f8f56";
const GREEN2 = "#2f5a38";
const WHITE = "#f7f4ea";
const WATER = "#1d6e93";
const WATER2 = "#143e62";
const FOAM = "#d7f3f4";
const TANQUE = "#e6d3a4";
const BRICK = "#a85a42";
const YELLOW = "#f2d23a";
const YELLOW2 = "#fff1a8";
const CAPE = "#c62828";

type Sprite = { canvas: HTMLCanvasElement; left: HTMLCanvasElement; surface: number };
type Hero = { r: HTMLCanvasElement; l: HTMLCanvasElement };

type SkyArt = {
  skies: HTMLCanvasElement[];
  farCity: HTMLCanvasElement;
  nearCity: HTMLCanvasElement;
  cloudDark: HTMLCanvasElement;
  cloudLite: HTMLCanvasElement;
  rain: HTMLCanvasElement;
  water: HTMLCanvasElement;
  wave: HTMLCanvasElement;
  debris: HTMLCanvasElement;
  bolt: HTMLCanvasElement;
  balloon: HTMLCanvasElement;
  sun: HTMLCanvasElement;
  stand: Hero;
  walk: Hero;
  jump: Hero;
  superStand: Hero;
  superWalk: Hero;
  superJump: Hero;
  platforms: Record<SkyPlatformKind, Map<number, Sprite>>;
};

let cached: SkyArt | null = null;

function make(width: number, height: number, alpha = true) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha })!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function flip(source: HTMLCanvasElement) {
  const ctx = make(source.width, source.height, true);
  ctx.translate(source.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return ctx.canvas;
}

function heroFrom(rows: string[]): Hero {
  const ctx = make(32, 32, true);
  stampOutlined(ctx, rows, HIJ, 2);
  const canvas = ctx.canvas;
  return { r: canvas, l: flip(canvas) };
}

const HIJ: Record<string, string> = {
  H: INK,
  s: "#f3c9a2",
  e: INK,
  n: "#c47a58",
  g: GREEN,
  R: RED,
  b: "#3a2a22",
  Y: YELLOW,
  y: YELLOW2,
  C: CAPE,
  B: DEEP,
};

function stampOutlined(ctx: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, scale: number) {
  const art = rows.map((row) => {
    if (row.length === 16) return row;
    if (row.length > 16) throw new Error(row);
    const pad = 16 - row.length;
    const left = pad >> 1;
    return ".".repeat(left) + row + ".".repeat(pad - left);
  });
  const solid = (x: number, y: number) => {
    if (y < 0 || x < 0 || y >= art.length || x >= art[y]!.length) return false;
    const ch = art[y]![x];
    return ch !== "." && ch !== " ";
  };
  ctx.fillStyle = INK;
  for (let y = 0; y < art.length; y++) {
    const row = art[y]!;
    for (let x = 0; x < row.length; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x + 1, y)) ctx.fillRect((x + 1) * scale, y * scale, scale, scale);
      if (!solid(x - 1, y)) ctx.fillRect((x - 1) * scale, y * scale, scale, scale);
      if (!solid(x, y + 1)) ctx.fillRect(x * scale, (y + 1) * scale, scale, scale);
      if (!solid(x, y - 1)) ctx.fillRect(x * scale, (y - 1) * scale, scale, scale);
    }
  }
  for (let y = 0; y < art.length; y++) {
    const row = art[y]!;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === "." || ch === " ") continue;
      ctx.fillStyle = pal[ch] || INK;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

const KID_STAND = [
  "......HH......",
  "......HH......",
  "......HH......",
  "......HH......",
  "...HHHHHHHH...",
  "...HHHHHHHH...",
  ".....ssss.....",
  "....ssssss....",
  "....seesse....",
  "....ssnsss....",
  "....gggggg....",
  "...ggRggggg...",
  "....gggggg....",
  "....gg..gg....",
  "....bb..bb....",
  "....bb..bb....",
];

const KID_WALK = [
  "......HH......",
  "......HH......",
  "......HH......",
  "......HH......",
  "...HHHHHHHH...",
  "...HHHHHHHH...",
  ".....ssss.....",
  "....ssssss....",
  "....seesse....",
  "....ssnsss....",
  "....gggggg....",
  "...ggRggggg...",
  "....gggggg....",
  "...gg....gg...",
  "...bb....bb...",
  "..bb......bb..",
];

const KID_JUMP = [
  "......HH......",
  "......HH......",
  "......HH......",
  "...HHHHHHHH...",
  "...HHHHHHHH...",
  ".....ssss.....",
  "....ssssss....",
  "....seesse....",
  "....ssnsss....",
  "..g.gggggg.g..",
  "....ggRggg....",
  "....gggggg....",
  ".....gggg.....",
  ".....bbbb.....",
  ".....bbbb.....",
  "................",
];

const SUPER_STAND = [
  "......YY......",
  "......YY......",
  "......YY......",
  "...YYYYYYYY...",
  "....YYYYYY....",
  "....YeeYYe....",
  "....YYYYYY....",
  "..CCYYYYYY....",
  "..CCYYyyYY....",
  "..CCYYBYYY....",
  "....YYYYYY....",
  "....YY..YY....",
  "...YY....YY...",
  "....RR..RR....",
  "....RR..RR....",
  "................",
];

const SUPER_WALK = [
  "......YY......",
  "......YY......",
  "......YY......",
  "...YYYYYYYY...",
  "....YYYYYY....",
  "....YeeYYe....",
  "....YYYYYY....",
  "..CCYYYYYY....",
  "..CCYYyyYY....",
  "..CCYYBYYY....",
  "....YYYYYY....",
  "...YY....YY...",
  "..YY......YY..",
  "..RR......RR..",
  "...RR....RR...",
  "................",
];

const SUPER_JUMP = [
  "......YY......",
  "......YY......",
  "...YYYYYYYY...",
  "....YeeYYe....",
  "..Y.YYYYYY.Y..",
  "..CCYYYYYYCC..",
  "..CCYYyyYY....",
  "..CCYYBYYY....",
  "....YYYYYY....",
  ".....YYYY.....",
  ".....YYYY.....",
  "....RR..RR....",
  "................",
  "................",
  "................",
  "................",
];

const BALLOON = [
  "................",
  "......RRRR......",
  "....RRRRRRRR....",
  "...RRRRRRRRRR...",
  "...RRWWRRRRRR...",
  "...RRRRRRRRRR...",
  "....RRRRRRRR....",
  "......RRRR......",
  ".......KK.......",
  ".......SS.......",
  ".......SS.......",
  "........S.......",
  ".......S........",
  "......S.........",
  ".....S..........",
  "................",
];

function paintBalloon() {
  const ctx = make(32, 32, true);
  stampOutlined(ctx, BALLOON, { R: RED, W: WHITE, K: RED2, S: SAND }, 2);
  return ctx.canvas;
}

function paintSun() {
  const ctx = make(32, 32, true);
  ctx.fillStyle = GOLD2;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const long = i % 2 === 0;
    const len = long ? 15 : 10;
    const size = long ? 3 : 2;
    for (let d = 8; d <= len; d += 2) {
      const x = Math.round(16 + Math.cos(angle) * d);
      const y = Math.round(16 + Math.sin(angle) * d);
      ctx.fillRect(x - 1, y - 1, size, size);
    }
  }
  ctx.fillStyle = INK;
  ctx.fillRect(7, 7, 18, 18);
  ctx.fillStyle = GOLD;
  ctx.fillRect(8, 8, 16, 16);
  ctx.fillStyle = YELLOW2;
  ctx.fillRect(10, 10, 12, 12);
  ctx.fillStyle = INK;
  ctx.fillRect(12, 13, 2, 3);
  ctx.fillRect(18, 13, 2, 3);
  ctx.fillRect(13, 18, 2, 2);
  ctx.fillRect(15, 19, 2, 2);
  ctx.fillRect(17, 18, 2, 2);
  ctx.fillStyle = RED;
  ctx.fillRect(11, 17, 2, 2);
  ctx.fillRect(19, 17, 2, 2);
  return ctx.canvas;
}

function paintGlass(ctx: CanvasRenderingContext2D, width: number, surface: number) {
  for (let x = 8; x < width - 8; x += 14) {
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1, surface - 7, 6, 8);
    ctx.fillStyle = "#bff4fb";
    ctx.fillRect(x, surface - 6, 4, 6);
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + 1, surface - 5, 1, 3);
  }
  ctx.fillStyle = "#d8fbff";
  ctx.fillRect(3, surface, width - 6, 2);
}

function sprite(width: number, paint: (ctx: CanvasRenderingContext2D, width: number) => number, hazard: boolean): Sprite {
  const ctx = make(width, 32, true);
  const surface = paint(ctx, width);
  if (hazard) paintGlass(ctx, width, surface);
  const canvas = ctx.canvas;
  return { canvas, left: flip(canvas), surface };
}

function paintSidewalk(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 10, w, 16);
  for (let x = 1; x < w - 1; x += 8) {
    for (let y = 11; y < 22; y += 6) {
      ctx.fillStyle = ((x + y) / 2) & 1 ? STONE : SAND;
      ctx.fillRect(x, y, Math.min(7, w - 1 - x), Math.min(5, 22 - y));
    }
  }
  ctx.fillStyle = SLATE;
  ctx.fillRect(0, 22, w, 4);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 26, w, 2);
  ctx.fillStyle = GREEN2;
  ctx.fillRect(8, 13, 10, 8);
  ctx.fillStyle = GREEN;
  ctx.fillRect(9, 8, 8, 6);
  ctx.fillRect(7, 11, 4, 3);
  return 11;
}

function paintRoof(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(10, 1, 18, 16);
  ctx.fillStyle = RED;
  ctx.fillRect(11, 2, 16, 5);
  ctx.fillStyle = TANQUE;
  ctx.fillRect(13, 7, 12, 8);
  ctx.fillStyle = GOLD2;
  ctx.fillRect(13, 10, 12, 2);
  ctx.fillStyle = SLATE;
  ctx.fillRect(13, 15, 2, 4);
  ctx.fillRect(23, 15, 2, 4);
  ctx.fillStyle = BRICK;
  ctx.fillRect(w - 22, 8, 10, 9);
  ctx.fillStyle = INK;
  ctx.fillRect(w - 24, 6, 14, 3);
  ctx.fillStyle = RED2;
  ctx.fillRect(w - 22, 12, 10, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 16, w, 12);
  for (let y = 17; y < 27; y += 3) {
    ctx.fillStyle = ((y / 3) | 0) % 2 ? "#9aabb4" : "#738692";
    ctx.fillRect(1, y, w - 2, 2);
  }
  return 17;
}

function paintTaxi(ctx: CanvasRenderingContext2D, w: number) {
  const mid = (w / 2) | 0;
  ctx.fillStyle = INK;
  ctx.fillRect(mid - 9, 3, 18, 9);
  ctx.fillStyle = WHITE;
  ctx.fillRect(mid - 7, 5, 14, 5);
  ctx.fillStyle = INK;
  ctx.fillRect(mid - 5, 6, 2, 3);
  ctx.fillRect(mid - 2, 6, 3, 3);
  ctx.fillRect(mid + 3, 6, 2, 3);
  ctx.fillRect(1, 12, w - 2, 16);
  ctx.fillStyle = GOLD;
  ctx.fillRect(3, 13, w - 6, 11);
  ctx.fillStyle = CELESTE;
  ctx.fillRect(8, 14, 14, 6);
  ctx.fillRect(w - 24, 14, 14, 6);
  ctx.fillStyle = WHITE;
  ctx.fillRect(9, 15, 3, 2);
  ctx.fillRect(w - 23, 15, 3, 2);
  for (let x = 3; x < w - 3; x += 4) {
    ctx.fillStyle = ((x / 4) | 0) % 2 ? INK : WHITE;
    ctx.fillRect(x, 21, 4, 3);
  }
  ctx.fillStyle = INK;
  ctx.fillRect(8, 24, 8, 5);
  ctx.fillRect(w - 16, 24, 8, 5);
  ctx.fillStyle = STEEL;
  ctx.fillRect(10, 25, 4, 3);
  ctx.fillRect(w - 14, 25, 4, 3);
  return 13;
}

function paintBus(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 10, w, 21);
  ctx.fillStyle = CREAM;
  ctx.fillRect(2, 12, w - 4, 14);
  ctx.fillStyle = SLATE;
  ctx.fillRect(2, 12, w - 4, 2);
  ctx.fillStyle = CELESTE2;
  for (let x = 22; x < w - 18; x += 12) ctx.fillRect(x, 15, 8, 6);
  ctx.fillStyle = CELESTE;
  ctx.fillRect(w - 16, 15, 10, 7);
  ctx.fillStyle = RED;
  ctx.fillRect(2, 21, w - 4, 3);
  ctx.fillStyle = INK;
  ctx.fillRect(2, 24, w - 4, 4);
  ctx.fillRect(12, 25, 10, 6);
  ctx.fillRect(w - 28, 25, 10, 6);
  ctx.fillStyle = STEEL;
  ctx.fillRect(14, 27, 6, 3);
  ctx.fillRect(w - 26, 27, 6, 3);
  ctx.fillStyle = INK;
  ctx.fillRect(4, 14, 16, 8);
  ctx.fillStyle = GOLD;
  ctx.fillRect(6, 15, 5, 1);
  ctx.fillRect(6, 15, 1, 4);
  ctx.fillRect(6, 18, 5, 1);
  ctx.fillRect(10, 18, 1, 3);
  ctx.fillRect(6, 20, 5, 1);
  ctx.fillRect(13, 15, 5, 1);
  ctx.fillRect(13, 15, 1, 6);
  ctx.fillRect(17, 15, 1, 6);
  ctx.fillRect(13, 20, 5, 1);
  return 12;
}

function paintBalcony(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = SAND;
  ctx.fillRect(0, 6, w, 16);
  ctx.fillStyle = STONE;
  ctx.fillRect(0, 6, w, 2);
  const door = Math.max(8, (w / 2 - 8) | 0);
  ctx.fillStyle = INK;
  ctx.fillRect(door - 1, 8, 16, 14);
  ctx.fillStyle = CELESTE;
  ctx.fillRect(door, 9, 14, 12);
  ctx.fillStyle = WHITE;
  ctx.fillRect(door + 2, 11, 3, 4);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 16, w, 2);
  for (let x = 2; x < w - 2; x += 5) ctx.fillRect(x, 16, 2, 10);
  ctx.fillRect(0, 24, w, 2);
  ctx.fillStyle = SLATE;
  ctx.fillRect(0, 26, w, 3);
  ctx.fillStyle = "#6b3a32";
  ctx.fillRect(w - 14, 20, 8, 5);
  ctx.fillStyle = RED;
  ctx.fillRect(w - 16, 16, 4, 4);
  ctx.fillRect(w - 12, 15, 4, 4);
  ctx.fillStyle = GREEN;
  ctx.fillRect(w - 14, 18, 5, 3);
  return 16;
}

function paintAwning(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 10, w, 12);
  for (let x = 1; x < w - 1; x += 8) {
    ctx.fillStyle = ((x / 8) | 0) % 2 ? RED : CREAM;
    ctx.fillRect(x, 11, Math.min(7, w - 1 - x), 8);
  }
  ctx.fillStyle = INK;
  for (let x = 1; x < w - 4; x += 8) ctx.fillRect(x, 18, 4, 3);
  ctx.fillStyle = SAND;
  ctx.fillRect(0, 21, w, 7);
  ctx.fillStyle = CELESTE2;
  ctx.fillRect(4, 22, Math.max(8, w - 8), 4);
  return 11;
}

function paintPlane(ctx: CanvasRenderingContext2D, w: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(2, 3, 14, 16);
  ctx.fillStyle = WHITE;
  ctx.fillRect(4, 4, 10, 13);
  ctx.fillStyle = CELESTE;
  ctx.fillRect(4, 7, 10, 2);
  ctx.fillRect(4, 11, 10, 2);
  ctx.fillStyle = INK;
  ctx.fillRect(8, 14, w - 12, 10);
  ctx.fillStyle = WHITE;
  ctx.fillRect(10, 15, w - 16, 8);
  ctx.fillStyle = CELESTE;
  ctx.fillRect(12, 19, w - 24, 2);
  ctx.fillStyle = CELESTE2;
  for (let x = 20; x < w - 24; x += 8) ctx.fillRect(x, 16, 4, 3);
  ctx.fillStyle = CELESTE;
  ctx.fillRect(w - 22, 16, 6, 4);
  ctx.fillStyle = SLATE;
  const wing = (w * 0.34) | 0;
  ctx.fillRect(wing, 22, (w * 0.36) | 0, 4);
  ctx.fillStyle = INK;
  ctx.fillRect(wing, 26, (w * 0.36) | 0, 2);
  ctx.fillStyle = INK;
  ctx.fillRect(w - 8, 17, 6, 4);
  return 15;
}

const PAINTERS: Record<SkyPlatformKind, (ctx: CanvasRenderingContext2D, width: number) => number> = {
  sidewalk: paintSidewalk,
  roof: paintRoof,
  balcony: paintBalcony,
  taxi: paintTaxi,
  colectivo: paintBus,
  awning: paintAwning,
  airplane: paintPlane,
};

function bakePlatforms() {
  const platforms = {
    sidewalk: new Map<number, Sprite>(),
    roof: new Map<number, Sprite>(),
    balcony: new Map<number, Sprite>(),
    taxi: new Map<number, Sprite>(),
    colectivo: new Map<number, Sprite>(),
    awning: new Map<number, Sprite>(),
    airplane: new Map<number, Sprite>(),
  } satisfies SkyArt["platforms"];
  (Object.keys(PAINTERS) as SkyPlatformKind[]).forEach((kind) => {
    for (const width of PLATFORM_WIDTHS[kind]) {
      platforms[kind].set(width, sprite(width, PAINTERS[kind], false));
      platforms[kind].set(-width, sprite(width, PAINTERS[kind], true));
    }
  });
  return platforms;
}

function platformOf(art: SkyArt, kind: SkyPlatformKind, width: number, hazard: boolean): Sprite {
  const map = art.platforms[kind];
  const key = hazard ? -width : width;
  const found = map.get(key);
  if (found) return found;
  const baked = sprite(width, PAINTERS[kind], hazard);
  map.set(key, baked);
  return baked;
}

function fillSky(ctx: CanvasRenderingContext2D, stops: Array<[number, string]>) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  for (const [stop, color] of stops) gradient.addColorStop(stop, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function paintSkies() {
  const calle = make(W, H, false);
  fillSky(calle, [[0, "#12192a"], [0.42, "#3a4a5e"], [0.78, "#8d8474"], [1, "#6a5e50"]]);
  const techos = make(W, H, false);
  fillSky(techos, [[0, "#1c3356"], [0.5, "#5d7ea0"], [1, "#c4b396"]]);
  const cielo = make(W, H, false);
  fillSky(cielo, [[0, "#2a6cb5"], [0.55, "#7eb6e4"], [1, "#e7f2fb"]]);
  const altura = make(W, H, false);
  fillSky(altura, [[0, "#140e30"], [0.5, "#2c3f78"], [1, "#6a4e86"]]);
  const espacio = make(W, H, false);
  fillSky(espacio, [[0, "#05060f"], [0.62, "#0c1228"], [1, "#10182e"]]);
  const stars = [
    [12, 18, 2], [36, 46, 1], [58, 14, 2], [84, 62, 1], [110, 28, 2], [138, 74, 1],
    [162, 22, 2], [188, 58, 1], [214, 16, 2], [246, 44, 1], [278, 26, 2], [300, 70, 1],
    [24, 96, 1], [96, 108, 2], [200, 96, 1], [150, 120, 1], [260, 112, 2],
  ];
  for (const [x, y, size] of stars) {
    espacio.fillStyle = size === 2 ? WHITE : "#d5e2ee";
    espacio.fillRect(x, y, size, size);
  }
  for (let x = 0; x < W; x += 2) {
    const nx = (x - 160) / 170;
    const rim = Math.sqrt(Math.max(0, 1 - nx * nx));
    const y = (458 - rim * 34) | 0;
    espacio.fillStyle = CELESTE;
    espacio.fillRect(x, y, 2, 3);
    espacio.fillStyle = "#1a4f86";
    espacio.fillRect(x, y + 3, 2, H - y);
  }
  espacio.fillStyle = GREEN2;
  espacio.fillRect(78, 446, 26, 8);
  espacio.fillRect(176, 440, 20, 8);
  return [calle.canvas, techos.canvas, cielo.canvas, altura.canvas, espacio.canvas];
}

function paintFarCity() {
  const ctx = make(W, 180, true);
  const blocks = [
    [6, 78, 34, 102], [38, 48, 30, 132], [66, 86, 36, 94], [100, 54, 32, 126],
    [132, 92, 28, 88], [158, 46, 40, 134], [198, 74, 28, 106], [268, 58, 46, 122],
  ];
  for (let i = 0; i < blocks.length; i++) {
    const [x, y, w, h] = blocks[i]!;
    ctx.fillStyle = i % 2 ? DEEP : SLATE;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = i % 2 ? "#31445a" : "#52687c";
    ctx.fillRect(x, y, w, 4);
    for (let wy = y + 12; wy < y + h - 10; wy += 12) {
      for (let wx = x + 5; wx < x + w - 6; wx += 8) {
        ctx.fillStyle = (wx + wy + i) % 3 === 0 ? GOLD2 : "#1c3044";
        ctx.fillRect(wx, wy, 3, 5);
      }
    }
  }
  ctx.fillStyle = SAND;
  ctx.fillRect(236, 18, 8, 78);
  ctx.fillRect(238, 8, 4, 12);
  ctx.fillStyle = STONE;
  ctx.fillRect(232, 94, 16, 5);
  ctx.fillStyle = STEEL;
  ctx.fillRect(74, 70, 28, 16);
  ctx.fillRect(80, 62, 16, 10);
  ctx.fillRect(86, 56, 5, 8);
  return ctx.canvas;
}

function paintNearCity() {
  const ctx = make(W, 200, true);
  ctx.fillStyle = SLATE;
  ctx.fillRect(0, 48, 78, 100);
  ctx.fillRect(86, 28, 58, 120);
  ctx.fillRect(152, 62, 70, 86);
  ctx.fillRect(230, 36, 90, 112);
  ctx.fillStyle = DEEP;
  ctx.fillRect(0, 48, 78, 6);
  ctx.fillRect(86, 28, 58, 6);
  ctx.fillRect(230, 36, 90, 6);
  for (let wx = 8; wx < 70; wx += 14) {
    ctx.fillStyle = GOLD2;
    ctx.fillRect(wx, 66, 6, 8);
    ctx.fillStyle = "#1c3044";
    ctx.fillRect(wx, 82, 6, 8);
  }
  ctx.fillStyle = INK;
  ctx.fillRect(168, 36, 18, 28);
  ctx.fillStyle = RED;
  ctx.fillRect(166, 32, 22, 6);
  ctx.fillStyle = TANQUE;
  ctx.fillRect(170, 40, 14, 16);
  ctx.fillStyle = SLATE;
  ctx.fillRect(170, 54, 3, 8);
  ctx.fillRect(181, 54, 3, 8);
  ctx.fillStyle = WATER;
  ctx.fillRect(0, 132, W, 68);
  ctx.fillStyle = WATER2;
  ctx.fillRect(0, 156, W, 44);
  ctx.fillStyle = FOAM;
  for (let x = 0; x < W; x += 10) ctx.fillRect(x, 130 + (x % 20 === 0 ? 0 : 2), 6, 2);
  ctx.fillStyle = CREAM;
  ctx.fillRect(18, 114, 84, 30);
  ctx.fillStyle = RED;
  ctx.fillRect(18, 126, 84, 4);
  ctx.fillStyle = CELESTE2;
  ctx.fillRect(26, 118, 10, 7);
  ctx.fillRect(42, 118, 10, 7);
  ctx.fillRect(58, 118, 10, 7);
  ctx.fillRect(74, 118, 10, 7);
  ctx.fillStyle = INK;
  ctx.fillRect(28, 138, 8, 5);
  ctx.fillRect(78, 138, 8, 5);
  ctx.fillStyle = GOLD;
  ctx.fillRect(196, 118, 52, 20);
  ctx.fillStyle = INK;
  ctx.fillRect(206, 112, 16, 6);
  ctx.fillStyle = WHITE;
  ctx.fillRect(208, 113, 12, 4);
  for (let x = 198; x < 244; x += 4) {
    ctx.fillStyle = ((x / 4) | 0) % 2 ? INK : WHITE;
    ctx.fillRect(x, 132, 4, 3);
  }
  return ctx.canvas;
}

function paintCloud(dark: boolean) {
  const ctx = make(74, 30, true);
  ctx.fillStyle = dark ? "#1b2433" : WHITE;
  ctx.fillRect(8, 14, 58, 12);
  ctx.fillRect(16, 8, 38, 16);
  ctx.fillRect(28, 3, 22, 12);
  ctx.fillStyle = dark ? "#314056" : "#d5e2ee";
  ctx.fillRect(20, 12, 30, 8);
  return ctx.canvas;
}

function paintRain() {
  const ctx = make(W, H, true);
  for (let i = 0; i < 70; i++) {
    const x = (i * 47) % W;
    const y = (i * 83) % H;
    ctx.fillStyle = i % 3 === 0 ? WHITE : FOAM;
    ctx.fillRect(x, y, 2, 3);
    ctx.fillRect(x - 2, y + 3, 2, 3);
    ctx.fillRect(x - 4, y + 6, 2, 3);
  }
  return ctx.canvas;
}

function paintWater() {
  const ctx = make(W, H, false);
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#5ec4d4");
  gradient.addColorStop(0.18, "#1d7ea4");
  gradient.addColorStop(1, "#0e3458");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  return ctx.canvas;
}

function paintDebris() {
  const ctx = make(W, 20, true);
  ctx.fillStyle = BRICK;
  ctx.fillRect(16, 6, 28, 5);
  ctx.fillStyle = GOLD2;
  ctx.fillRect(18, 7, 24, 2);
  ctx.fillStyle = INK;
  ctx.fillRect(150, 4, 14, 12);
  ctx.fillStyle = STEEL;
  ctx.fillRect(154, 7, 6, 6);
  ctx.fillStyle = GREEN;
  ctx.fillRect(240, 8, 6, 8);
  ctx.fillStyle = CELESTE;
  ctx.fillRect(246, 6, 8, 10);
  return ctx.canvas;
}

function paintBolt() {
  const ctx = make(18, 150, true);
  let x = 6;
  for (let y = 0; y < 140; y += 8) {
    ctx.fillStyle = YELLOW2;
    ctx.fillRect(x, y, 4, 10);
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + 1, y, 2, 10);
    x += (y / 8) % 2 === 0 ? 4 : -4;
    if (x < 1) x = 1;
    if (x > 10) x = 8;
  }
  return ctx.canvas;
}

function build(): SkyArt {
  return {
    skies: paintSkies(),
    farCity: paintFarCity(),
    nearCity: paintNearCity(),
    cloudDark: paintCloud(true),
    cloudLite: paintCloud(false),
    rain: paintRain(),
    water: paintWater(),
    wave: paintWave(),
    debris: paintDebris(),
    bolt: paintBolt(),
    balloon: paintBalloon(),
    sun: paintSun(),
    stand: heroFrom(KID_STAND),
    walk: heroFrom(KID_WALK),
    jump: heroFrom(KID_JUMP),
    superStand: heroFrom(SUPER_STAND),
    superWalk: heroFrom(SUPER_WALK),
    superJump: heroFrom(SUPER_JUMP),
    platforms: bakePlatforms(),
  };
}

function paintWave() {
  const ctx = make(W, 8, true);
  ctx.fillStyle = FOAM;
  for (let x = 0; x < W; x += 8) ctx.fillRect(x, x % 16 === 0 ? 1 : 3, 5, 2);
  ctx.fillStyle = CELESTE;
  for (let x = 4; x < W; x += 12) ctx.fillRect(x, 5, 3, 2);
  return ctx.canvas;
}

function skyArt() {
  if (!cached) cached = build();
  return cached;
}

const ZONE_MARKS = [0, 180, 420, 780, 1200];

export function drawSkyBackdrop(ctx: CanvasRenderingContext2D, altitude: number, time: number) {
  const art = skyArt();
  let band = 0;
  while (band < ZONE_MARKS.length - 1 && altitude >= ZONE_MARKS[band + 1]!) band++;
  ctx.drawImage(art.skies[band]!, 0, 0);
  if (band < ZONE_MARKS.length - 1) {
    const span = ZONE_MARKS[band + 1]! - ZONE_MARKS[band]!;
    const mix = (altitude - ZONE_MARKS[band]!) / span;
    if (mix > 0) {
      ctx.globalAlpha = mix;
      ctx.drawImage(art.skies[band + 1]!, 0, 0);
      ctx.globalAlpha = 1;
    }
  }
  const cityAlpha = altitude >= 980 ? 0 : 1 - altitude / 980;
  if (cityAlpha > 0.03) {
    ctx.globalAlpha = cityAlpha;
    ctx.drawImage(art.farCity, 0, (146 + Math.min(300, altitude * 0.16)) | 0);
    ctx.drawImage(art.nearCity, 0, (196 + Math.min(360, altitude * 0.28)) | 0);
    ctx.globalAlpha = 1;
  }
  const cloudAlpha = altitude >= 1100 ? 0 : 0.95 * (1 - altitude / 1100);
  if (cloudAlpha > 0.03) {
    ctx.globalAlpha = cloudAlpha;
    const storm = altitude < 420;
    const cloud = storm ? art.cloudDark : art.cloudLite;
    const drift = Math.floor(time * (storm ? 26 : 12));
    const base = storm ? 16 : 34;
    for (let i = 0; i < 4; i++) {
      const span = W + 120;
      const x = ((((i * 98 - drift) % span) + span) % span) - 80;
      const y = base + (i % 2) * 30 - Math.min(70, altitude * 0.035);
      ctx.drawImage(cloud, x | 0, y | 0);
    }
    ctx.globalAlpha = 1;
  }
}

export function drawSkyPlatform(ctx: CanvasRenderingContext2D, platform: SkyPlatform, sy: number, time: number) {
  const art = skyArt();
  const variant = platformOf(art, platform.kind, platform.width, platform.hazard);
  const image = platform.kind === "airplane" && platform.vx < 0 ? variant.left : variant.canvas;
  const dx = Math.round(platform.x);
  const dy = Math.round(sy - variant.surface);
  ctx.drawImage(image, dx, dy);
  if (platform.kind === "airplane" && ((time * 12) | 0) & 1) {
    ctx.fillStyle = GOLD;
    const back = platform.vx < 0 ? dx + platform.width - 6 : dx + 2;
    ctx.fillRect(back, Math.round(sy + 4), 3, 2);
  }
}

export function drawSkyPickup(ctx: CanvasRenderingContext2D, pickup: SkyPickup, sy: number, time: number) {
  const art = skyArt();
  const bob = Math.sin(time * 4 + pickup.id) > 0 ? -2 : 1;
  const image = pickup.kind === "balloon" ? art.balloon : art.sun;
  ctx.drawImage(image, Math.round(pickup.x - 16), Math.round(sy - 18 + bob));
}

export function drawHijitus(
  ctx: CanvasRenderingContext2D,
  x: number,
  footY: number,
  time: number,
  vx: number,
  vy: number,
  shield: boolean,
) {
  const art = skyArt();
  const jumping = vy > 140 || vy < -90;
  const step = (time * 8) | 0;
  const frame = shield
    ? jumping ? art.superJump : step % 2 ? art.superWalk : art.superStand
    : jumping ? art.jump : step % 2 ? art.walk : art.stand;
  ctx.drawImage(vx < -8 ? frame.l : frame.r, Math.round(x - 16), Math.round(footY - 32));
}

export function drawSkyFlood(ctx: CanvasRenderingContext2D, surfaceY: number, time: number) {
  const y = Math.round(surfaceY);
  if (y >= H) return;
  const art = skyArt();
  const waveX = -(((time * 36) | 0) % W);
  const drift = -(((time * 16) | 0) % W);
  if (y <= 0) {
    ctx.drawImage(art.water, 0, 0);
    ctx.drawImage(art.wave, waveX, 0);
    ctx.drawImage(art.wave, waveX + W, 0);
    ctx.drawImage(art.debris, drift, 16);
    ctx.drawImage(art.debris, drift + W, 16);
    return;
  }
  const height = H - y;
  ctx.drawImage(art.water, 0, 0, W, height, 0, y, W, height);
  ctx.drawImage(art.wave, waveX, y - 3);
  ctx.drawImage(art.wave, waveX + W, y - 3);
  if (y < H - 16) {
    ctx.drawImage(art.debris, drift, y + 14);
    ctx.drawImage(art.debris, drift + W, y + 14);
  }
}

export function drawSkyRain(ctx: CanvasRenderingContext2D, time: number, altitude: number) {
  const alpha = altitude <= 200 ? 0.8 : 0.8 * (1 - (altitude - 200) / 700);
  if (alpha <= 0.03) return;
  const art = skyArt();
  ctx.globalAlpha = alpha;
  const shift = Math.floor(time * 240) % H;
  ctx.drawImage(art.rain, 0, shift);
  ctx.drawImage(art.rain, 0, shift - H);
  ctx.globalAlpha = 1;
}

export function drawSkyBolt(ctx: CanvasRenderingContext2D, time: number, altitude: number) {
  if (altitude > 380) return;
  if (time % 7.5 > 0.08) return;
  const art = skyArt();
  ctx.drawImage(art.bolt, (Math.floor(time / 7.5) % 2 === 0) ? 46 : 214, 0);
}

export function drawSkyPortrait(ctx: CanvasRenderingContext2D) {
  const art = skyArt();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#3a4a5e";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#8d8474";
  ctx.fillRect(0, 40, 64, 24);
  ctx.fillStyle = SLATE;
  ctx.fillRect(2, 16, 16, 28);
  ctx.fillStyle = SAND;
  ctx.fillRect(44, 6, 6, 30);
  ctx.fillRect(42, 34, 10, 4);
  ctx.drawImage(art.stand.r, 16, 18);
}
