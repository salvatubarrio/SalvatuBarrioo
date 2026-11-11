import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Music, Volume2, VolumeX } from "lucide-react";
import { audio } from "@/game/audio";
import { submitArcadeBest, type RankRow, type RankSnapshot } from "@/game/ranking";
import { ArcadeRankList } from "@/components/barrio/rank-list";
import {
  COLS,
  createRun,
  createWorld,
  dirFromCode,
  playerCenter,
  sectorAt,
  shopName,
  stepRun,
  tileAt,
  SECTOR_H,
  type Dir,
  type FloodEvent,
  type Kind,
  type Run,
  type Tile,
  type World,
} from "@/game/flood";

type Floater = { id: number; text: string; row: number; col: number; life: number };
type Drop = { x: number; y: number; vx: number; vy: number; life: number };

type OverInfo = {
  score: number;
  time: number;
  previous: number;
  best: number;
  isRecord: boolean;
  rank: number;
  pending: boolean;
  failed: boolean;
};

const ROOFS = ["#e25b45", "#c44738", "#3d7ec4", "#e2a317", "#8d4d32", "#2f6f4a"];
const WALLS = ["#fff6e8", "#f3d7b0", "#f7f1e4", "#efe2c4", "#f8e6cf", "#e7dcc4"];
const CARS = ["#e25b45", "#f7f1e4", "#3d7ec4", "#ffd23f", "#2f9a4a", "#6b3e26"];

const FONT: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  B: ["110", "101", "110", "101", "110"],
  C: ["011", "100", "100", "100", "011"],
  D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"],
  F: ["111", "100", "110", "100", "100"],
  G: ["011", "100", "101", "101", "011"],
  H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"],
  J: ["001", "001", "001", "101", "010"],
  K: ["101", "101", "110", "101", "101"],
  L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"],
  N: ["101", "111", "111", "111", "101"],
  O: ["010", "101", "101", "101", "010"],
  P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "011", "001"],
  R: ["110", "101", "110", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
  T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "010"],
  V: ["101", "101", "101", "010", "010"],
  W: ["101", "101", "111", "111", "101"],
  X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"],
  Z: ["111", "001", "010", "100", "111"],
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["110", "001", "010", "100", "111"],
  "3": ["110", "001", "010", "001", "110"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "110", "001", "110"],
  "6": ["011", "100", "110", "101", "010"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["010", "101", "010", "101", "010"],
  "9": ["010", "101", "011", "001", "110"],
  ".": ["000", "000", "000", "000", "010"],
  " ": ["000", "000", "000", "000", "000"],
  "+": ["000", "010", "111", "010", "000"],
  "!": ["010", "010", "010", "000", "010"],
  "¡": ["010", "000", "010", "010", "010"],
};

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
) {
  const glyphs = text.toUpperCase().split("");
  const width = glyphs.length * 4 * scale;
  let cx = Math.round(x - width / 2);
  const y0 = Math.round(y);
  for (const ch of glyphs) {
    const g = FONT[ch] ?? FONT[" "]!;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 3; c++) {
        if (g[r]?.[c] !== "1") continue;
        ctx.fillStyle = "#1a120c";
        ctx.fillRect(cx + c * scale + scale, y0 + r * scale + scale, scale, scale);
        ctx.fillStyle = color;
        ctx.fillRect(cx + c * scale, y0 + r * scale, scale, scale);
      }
    }
    cx += 4 * scale;
  }
}

function solid(kind: Kind | "void" | null): boolean {
  if (!kind || kind === "void") return true;
  return kind !== "street" && kind !== "plaza";
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  world: World,
  col: number,
  row: number,
  x: number,
  y: number,
  tile: number,
  time: number,
) {
  const cell = tileAt(world, col, row);
  const kind: Kind | "void" = cell?.kind ?? "void";
  const north = tileAt(world, col, row + 1)?.kind ?? "void";
  const south = tileAt(world, col, row - 1)?.kind ?? "void";
  const east = tileAt(world, col + 1, row)?.kind ?? "void";
  const west = tileAt(world, col - 1, row)?.kind ?? "void";
  if (kind === "street") drawStreet(ctx, x, y, tile, cell?.v ?? 0, !solid(north), !solid(south), !solid(east), !solid(west));
  else if (kind === "plaza") drawPlaza(ctx, x, y, tile, cell?.v ?? 0);
  else if (kind === "tree") drawTree(ctx, x, y, tile);
  else if (kind === "fountain") drawFountain(ctx, x, y, tile, time);
  else if (kind === "auto" || kind === "obra" || kind === "escombro") {
    drawStreet(ctx, x, y, tile, 1, !solid(north), !solid(south), !solid(east), !solid(west));
    if (kind === "auto") drawCar(ctx, x, y, tile, cell?.v ?? 0);
    else if (kind === "obra") drawObra(ctx, x, y, tile);
    else drawDebris(ctx, x, y, tile);
  } else if (cell) drawBuilding(ctx, x, y, tile, cell, !solid(south), !solid(east), !solid(west));

  if (cell?.kind === "comercio" && !solid(south) && (cell.v + col) % 2 === 0) {
    const sector = Math.floor(row / SECTOR_H);
    drawText(ctx, shopName(col, row, sector), x + tile / 2, y + 3, Math.max(1, Math.floor(tile / 18)), "#1a120c");
  }
}

function drawStreet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tile: number,
  v: number,
  n: boolean,
  s: boolean,
  e: boolean,
  w: boolean,
) {
  ctx.fillStyle = "#5c564c";
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = "#4a453c";
  ctx.fillRect(x, y, tile, 1);
  ctx.fillRect(x, y + tile - 1, tile, 1);
  const side = "#d7c49a";
  if (!n) {
    ctx.fillStyle = side;
    ctx.fillRect(x, y, tile, 4);
    ctx.fillStyle = "#6a5a48";
    ctx.fillRect(x, y + 3, tile, 1);
  }
  if (!s) {
    ctx.fillStyle = side;
    ctx.fillRect(x, y + tile - 4, tile, 4);
    ctx.fillStyle = "#6a5a48";
    ctx.fillRect(x, y + tile - 4, tile, 1);
  }
  if (!w) {
    ctx.fillStyle = side;
    ctx.fillRect(x, y, 4, tile);
  }
  if (!e) {
    ctx.fillStyle = side;
    ctx.fillRect(x + tile - 4, y, 4, tile);
  }
  ctx.fillStyle = "#e6d7a2";
  if (n && s) {
    ctx.fillRect(x + (tile >> 1) - 1, y + 6, 2, 5);
    ctx.fillRect(x + (tile >> 1) - 1, y + tile - 11, 2, 5);
  }
  if (e && w) {
    ctx.fillRect(x + 6, y + (tile >> 1) - 1, 5, 2);
    ctx.fillRect(x + tile - 11, y + (tile >> 1) - 1, 5, 2);
  }
  if ((v + x) % 7 === 0) {
    ctx.fillStyle = "#3a342c";
    ctx.fillRect(x + (tile >> 1) - 3, y + (tile >> 1) - 3, 6, 6);
    ctx.fillStyle = "#8d8474";
    ctx.fillRect(x + (tile >> 1) - 2, y + (tile >> 1) - 2, 4, 4);
  }
}

function drawPlaza(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number, v: number) {
  ctx.fillStyle = v % 2 ? "#349445" : "#2c843c";
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = "#8dce6a";
  ctx.fillRect(x + 3, y + 4, 2, 2);
  ctx.fillRect(x + tile - 6, y + 6, 2, 2);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x + 6, y + tile - 7, 2, 2);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + tile - 8, y + tile - 6, 2, 2);
  ctx.fillStyle = "#cbb892";
  ctx.fillRect(x + (tile >> 1) - 2, y, 4, tile);
  ctx.fillRect(x, y + (tile >> 1) - 2, tile, 4);
  ctx.fillStyle = "#6a5a48";
  ctx.fillRect(x + 2, y + (tile >> 1) + 4, tile - 10, 3);
  ctx.fillRect(x + 2, y + (tile >> 1) + 4, 2, 5);
  ctx.fillRect(x + tile - 12, y + (tile >> 1) + 4, 2, 5);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number) {
  ctx.fillStyle = "#2f8a44";
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = "#6b4428";
  ctx.fillRect(x + (tile >> 1) - 2, y + tile - 9, 4, 8);
  ctx.fillStyle = "#1d6338";
  ctx.fillRect(x + 3, y + 7, tile - 6, 9);
  ctx.fillStyle = "#217a3a";
  ctx.fillRect(x + 5, y + 4, tile - 10, 6);
  ctx.fillStyle = "#8dce6a";
  ctx.fillRect(x + 7, y + 5, 3, 3);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + tile - 9, y + 10, 2, 2);
}

function drawFountain(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number, time: number) {
  ctx.fillStyle = "#2f8a44";
  ctx.fillRect(x, y, tile, tile);
  ctx.fillStyle = "#8d8474";
  ctx.fillRect(x + 4, y + tile - 12, tile - 8, 8);
  ctx.fillStyle = "#6a5a48";
  ctx.fillRect(x + 6, y + tile - 14, tile - 12, 4);
  ctx.fillStyle = "#2f86d0";
  ctx.fillRect(x + 7, y + tile - 13, tile - 14, 5);
  const jet = 4 + Math.round(Math.sin(time * 6) * 2);
  ctx.fillStyle = "#d9f4ff";
  ctx.fillRect(x + (tile >> 1) - 1, y + tile - 14 - jet, 2, jet);
  ctx.fillStyle = "#9fd4ee";
  ctx.fillRect(x + (tile >> 1) - 3, y + tile - 15, 2, 2);
  ctx.fillRect(x + (tile >> 1) + 1, y + tile - 16, 2, 2);
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number, v: number) {
  const body = CARS[v % CARS.length]!;
  const top = y + (tile >> 1) - 6;
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 3, top, tile - 6, 12);
  ctx.fillStyle = body;
  ctx.fillRect(x + 4, top + 1, tile - 8, 10);
  ctx.fillStyle = "#9fd4ee";
  ctx.fillRect(x + 6, top + 2, 5, 4);
  ctx.fillRect(x + tile - 11, top + 2, 5, 4);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 5, top + 9, 4, 3);
  ctx.fillRect(x + tile - 9, top + 9, 4, 3);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x + tile - 7, top + 4, 2, 2);
}

function drawObra(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number) {
  ctx.fillStyle = "#e2a317";
  ctx.fillRect(x + 2, y + 6, tile - 4, tile - 12);
  ctx.fillStyle = "#1a120c";
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * ((tile - 6) / 4), y + 7, 3, tile - 14);
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(x + 4, y + tile - 10, tile - 8, 4);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + (tile >> 1) - 1, y + 2, 2, 6);
  ctx.fillStyle = "#ff5a4e";
  ctx.fillRect(x + (tile >> 1) - 4, y + 2, 6, 3);
}

function drawDebris(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number) {
  ctx.fillStyle = "#6b8f3a";
  ctx.fillRect(x + 4, y + tile - 12, 7, 6);
  ctx.fillStyle = "#3d7ec4";
  ctx.fillRect(x + 12, y + tile - 14, 8, 7);
  ctx.fillStyle = "#8d8474";
  ctx.fillRect(x + 8, y + tile - 9, 10, 5);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 6, y + tile - 8, 2, 2);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + tile - 8, y + 8, 4, 4);
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tile: number,
  cell: Tile,
  southWalk: boolean,
  eastWalk: boolean,
  westWalk: boolean,
) {
  const v = cell.v % ROOFS.length;
  const wall = WALLS[v]!;
  const roof = ROOFS[v]!;
  const roofH = Math.max(8, Math.round(tile * 0.36));
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 1, y + roofH, tile - 2, tile - roofH);
  ctx.fillStyle = wall;
  ctx.fillRect(x + 2, y + roofH + 1, tile - 4, tile - roofH - 2);
  ctx.fillStyle = roof;
  ctx.fillRect(x + 1, y + roofH - 2, tile - 2, 4);
  ctx.fillRect(x + 3, y + 4, tile - 6, roofH - 4);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 4, y + 3, tile - 8, 2);
  if (v % 2 === 0) {
    ctx.fillStyle = "#5c3a22";
    ctx.fillRect(x + tile - 8, y + 1, 3, 6);
    ctx.fillStyle = "#3a2416";
    ctx.fillRect(x + tile - 9, y, 5, 2);
  }
  if (cell.kind === "hospital") {
    ctx.fillStyle = "#f7f1e4";
    ctx.fillRect(x + 2, y + roofH + 1, tile - 4, tile - roofH - 2);
    ctx.fillStyle = "#d4534a";
    ctx.fillRect(x + 2, y + roofH + 1, tile - 4, 4);
    const cx = x + (tile >> 1);
    const cy = y + roofH + 7;
    ctx.fillStyle = "#ff5a4e";
    ctx.fillRect(cx - 1, cy, 3, 8);
    ctx.fillRect(cx - 4, cy + 2, 9, 3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx, cy + 1, 1, 6);
    ctx.fillRect(cx - 3, cy + 3, 7, 1);
  } else if (cell.kind === "colegio") {
    ctx.fillStyle = "#f7f1e4";
    ctx.fillRect(x + 2, y + roofH + 1, tile - 4, tile - roofH - 2);
    ctx.fillStyle = "#c44738";
    ctx.fillRect(x + 1, y + roofH - 3, tile - 2, 5);
    ctx.fillStyle = "#7ec8ea";
    ctx.fillRect(x + 4, y + roofH + 5, 5, 4);
    ctx.fillRect(x + tile - 9, y + roofH + 5, 5, 4);
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(x + 6, y + roofH + 6, 1, 3);
    if (v % 2 === 0) {
      ctx.fillStyle = "#f4efe2";
      ctx.fillRect(x + tile - 7, y, 2, 8);
      ctx.fillStyle = "#3d7ec4";
      ctx.fillRect(x + tile - 10, y, 7, 4);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(x + tile - 8, y + 1, 3, 2);
    }
    if (southWalk) {
      ctx.fillStyle = "#6b3e26";
      ctx.fillRect(x + (tile >> 1) - 4, y + tile - 11, 8, 10);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(x + (tile >> 1) + 1, y + tile - 6, 2, 2);
    }
  } else if (cell.kind === "iglesia") {
    ctx.fillStyle = "#d9d3c4";
    ctx.fillRect(x + 4, y + 8, tile - 8, tile - 10);
    ctx.fillStyle = "#8d8474";
    ctx.fillRect(x + 3, y + 6, tile - 6, 4);
    ctx.fillStyle = "#f4efe2";
    ctx.fillRect(x + (tile >> 1) - 1, y, 3, 10);
    ctx.fillRect(x + (tile >> 1) - 4, y + 2, 9, 2);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(x + (tile >> 1), y + 3, 1, 4);
    if (southWalk) {
      ctx.fillStyle = "#5c3318";
      ctx.fillRect(x + (tile >> 1) - 4, y + tile - 12, 8, 11);
      ctx.fillStyle = "#6a4a86";
      ctx.fillRect(x + (tile >> 1) - 3, y + tile - 11, 6, 5);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(x + (tile >> 1) - 1, y + tile - 9, 2, 2);
    }
    ctx.fillStyle = "#7ec8ea";
    ctx.fillRect(x + 6, y + 14, 3, 5);
    ctx.fillRect(x + tile - 9, y + 14, 3, 5);
  } else {
    const glass = v % 3 === 0 ? "#ffe27a" : "#7ec8ea";
    if (southWalk) {
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(x + 4, y + roofH + 4, 6, 5);
      ctx.fillRect(x + tile - 10, y + roofH + 4, 6, 5);
      ctx.fillStyle = glass;
      ctx.fillRect(x + 5, y + roofH + 5, 4, 3);
      ctx.fillRect(x + tile - 9, y + roofH + 5, 4, 3);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x + 5, y + roofH + 5, 2, 1);
      ctx.fillStyle = "#6b3e26";
      ctx.fillRect(x + (tile >> 1) - 3, y + tile - 11, 6, 10);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(x + (tile >> 1) + 1, y + tile - 7, 1, 2);
    }
    if (cell.kind === "comercio" && southWalk) {
      const awning = v % 2 ? "#e25b45" : "#2f6fbf";
      ctx.fillStyle = awning;
      ctx.fillRect(x + 2, y + roofH + 1, tile - 4, 4);
      ctx.fillStyle = "#f7f1e4";
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * Math.floor((tile - 6) / 4), y + roofH + 1, 2, 4);
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(x + 3, y + roofH - 7, tile - 6, 6);
      ctx.fillStyle = "#ffd23f";
      ctx.fillRect(x + 4, y + roofH - 6, tile - 8, 4);
    }
    if (eastWalk) {
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(x + tile - 7, y + roofH + 6, 4, 4);
      ctx.fillStyle = glass;
      ctx.fillRect(x + tile - 6, y + roofH + 7, 2, 2);
    }
    if (westWalk) {
      ctx.fillStyle = "#1a120c";
      ctx.fillRect(x + 3, y + roofH + 6, 4, 4);
      ctx.fillStyle = glass;
      ctx.fillRect(x + 4, y + roofH + 7, 2, 2);
    }
  }
}

function drawHero(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tile: number,
  dir: Dir | null,
  moving: boolean,
  time: number,
) {
  const s = tile / 17;
  const frame = moving ? Math.sin(time * 28) : 0;
  const bob = moving ? Math.sin(time * 18) * s : 0;
  const x = cx - 8 * s;
  const y = cy - 15 * s + bob;
  ctx.fillStyle = "rgba(16, 10, 6, 0.35)";
  ctx.fillRect(cx - 5 * s, cy + s, 10 * s, 3 * s);
  const step = moving ? (frame > 0 ? s : -s) : 0;
  ctx.fillStyle = "#24315c";
  ctx.fillRect(x + 3 * s, y + 12 * s, 4 * s, 5 * s);
  ctx.fillRect(x + 9 * s, y + 12 * s, 4 * s, 5 * s);
  ctx.fillStyle = "#1a120c";
  ctx.fillRect(x + 3 * s, y + 16 * s + step, 4 * s, 3 * s);
  ctx.fillRect(x + 9 * s, y + 16 * s - step, 4 * s, 3 * s);
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(x + 3 * s, y + 15 * s + step, 4 * s, 1 * s);
  ctx.fillRect(x + 9 * s, y + 15 * s - step, 4 * s, 1 * s);
  ctx.fillStyle = "#e25b45";
  ctx.fillRect(x + 3 * s, y + 7 * s, 10 * s, 6 * s);
  ctx.fillStyle = "#c44738";
  ctx.fillRect(x + 3 * s, y + 7 * s, 10 * s, 2 * s);
  const reach = dir === "e" ? 2 * s : dir === "w" ? -2 * s : 0;
  ctx.fillStyle = "#f1c27d";
  ctx.fillRect(x + s + reach, y + 8 * s, 3 * s, 5 * s);
  ctx.fillRect(x + 12 * s + reach, y + 8 * s, 3 * s, 5 * s);
  ctx.fillStyle = "#f1c27d";
  ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 6 * s);
  ctx.fillStyle = "#3a2416";
  ctx.fillRect(x + 3 * s, y + s, 10 * s, 3 * s);
  ctx.fillRect(x + 3 * s, y + 3 * s, 2 * s, 3 * s);
  ctx.fillRect(x + 11 * s, y + 3 * s, 2 * s, 2 * s);
  if (dir === "n") {
    ctx.fillStyle = "#3a2416";
    ctx.fillRect(x + 4 * s, y + 2 * s, 8 * s, 5 * s);
  } else if (dir === "e") {
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(x + 9 * s, y + 4 * s, 2 * s, 2 * s);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 10 * s, y + 4 * s, 1 * s, 1 * s);
  } else if (dir === "w") {
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(x + 5 * s, y + 4 * s, 2 * s, 2 * s);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 5 * s, y + 4 * s, 1 * s, 1 * s);
  } else {
    ctx.fillStyle = "#1a120c";
    ctx.fillRect(x + 5 * s, y + 4 * s, 2 * s, 2 * s);
    ctx.fillRect(x + 9 * s, y + 4 * s, 2 * s, 2 * s);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 5 * s, y + 4 * s, 1 * s, 1 * s);
    ctx.fillRect(x + 9 * s, y + 4 * s, 1 * s, 1 * s);
    ctx.fillStyle = "#d07a62";
    ctx.fillRect(x + 7 * s, y + 6 * s, 2 * s, 1 * s);
  }
}

function paint(
  ctx: CanvasRenderingContext2D,
  world: World,
  run: Run,
  w: number,
  h: number,
  time: number,
  shake: number,
  floaters: Floater[],
  drops: Drop[],
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#8ec6ea";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#f7f1e4";
  ctx.fillRect(12, 8, 28, 10);
  ctx.fillRect(w - 70, 18, 36, 12);
  const tile = Math.max(18, Math.min(46, Math.floor(w / COLS)));
  const offsetX = Math.round((w - COLS * tile) / 2);
  const focusY = Math.round(h * 0.7);
  const p = playerCenter(run);
  const sx = shake > 0 ? Math.round(Math.sin(time * 60) * shake * 4) : 0;
  const sy = shake > 0 ? Math.round(Math.cos(time * 50) * shake * 2) : 0;
  ctx.translate(sx, sy);
  const wy = (row: number) => Math.round(focusY - (row - p.row) * tile);
  const rowTop = Math.ceil(p.row + focusY / tile) + 2;
  const rowBot = Math.floor(p.row - (h - focusY) / tile) - 2;
  for (let row = rowTop; row >= rowBot; row--) {
    for (let col = 0; col < COLS; col++) {
      const x = offsetX + col * tile;
      const y = wy(row + 1);
      if (y > h || y + tile < 0) continue;
      drawCell(ctx, world, col, row, x, y, tile, time);
    }
  }

  for (let si = Math.max(0, Math.floor(rowBot / SECTOR_H)); si <= Math.min(world.sectors.length - 1, Math.floor(rowTop / SECTOR_H)); si++) {
    const sector = world.sectors[si]!;
    for (const lm of sector.landmarks) {
      const row = si * SECTOR_H + lm.row;
      const y = wy(row + 0.15);
      if (y < -20 || y > h + 20) continue;
      const x = offsetX + lm.col * tile + tile / 2;
      drawText(ctx, lm.name, x, y, Math.max(1, Math.floor(tile / 14)), "#fff6e8");
    }
  }

  for (const f of floaters) {
    const y = wy(f.row + 0.8) - (1.4 - f.life) * 18;
    const x = offsetX + f.col * tile + tile / 2;
    drawText(ctx, f.text, x, y, 2, "#ffd23f");
  }

  const facing = run.dir ?? run.intent ?? "n";
  const hx = offsetX + p.col * tile;
  const hy = wy(p.row);
  drawHero(ctx, hx, hy, tile, facing, run.moving, time);

  ctx.fillStyle = "rgba(180, 220, 245, 0.45)";
  for (let i = 0; i < 36; i++) {
    const rx = (i * 97 + time * 90) % w;
    const ry = (i * 53 + time * 160) % h;
    ctx.fillRect(rx, ry, 2, 7);
  }

  const surface = wy(run.water);
  if (surface < h) {
    const top = Math.max(0, surface);
    ctx.fillStyle = "rgba(18, 92, 168, 0.72)";
    ctx.fillRect(0, top, w, h - top);
    ctx.fillStyle = "rgba(10, 50, 110, 0.35)";
    ctx.fillRect(0, top + 18, w, h - top);
    for (let x = 0; x < w; x += 4) {
      const wave = Math.round(Math.sin(x * 0.09 + time * 5) * 3 + Math.sin(x * 0.23 - time * 3) * 2);
      ctx.fillStyle = "#e7f7ff";
      ctx.fillRect(x, surface + wave - 2, 4, 3);
      ctx.fillStyle = "#7ec8ea";
      ctx.fillRect(x, surface + wave + 2, 4, 2);
      if ((x / 4 + Math.floor(time * 2)) % 9 === 0) {
        ctx.fillStyle = "rgba(217, 244, 255, 0.8)";
        ctx.fillRect(x, surface + 10 + ((x + Math.floor(time * 20)) % 24), 2, 2);
      }
    }
  }

  for (const d of drops) {
    ctx.fillStyle = "#d9f4ff";
    ctx.fillRect(d.x, d.y, 3, 3);
  }
  ctx.translate(-sx, -sy);

  const gap = p.row - run.water;
  if (gap < 4.5) {
    ctx.fillStyle = `rgba(12, 40, 80, ${0.28 * (1 - Math.max(0, gap) / 4.5)})`;
    ctx.fillRect(0, h - 28, w, 28);
    ctx.fillRect(0, 0, w, 10);
  }
}

function formatTime(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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
  onReplay,
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
  const worldRef = useRef<World | null>(null);
  const runRef = useRef<Run | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const intentRef = useRef<Dir | null>(null);
  const pausedRef = useRef(paused);
  const floaters = useRef<Floater[]>([]);
  const drops = useRef<Drop[]>([]);
  const shake = useRef(0);
  const fid = useRef(1);
  const saved = useRef(false);
  const prevBest = useRef(0);
  const scoreChain = useRef(Promise.resolve());
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [help, setHelp] = useState(false);
  const [full, setFull] = useState(false);
  const [banner, setBanner] = useState(false);
  const [surplus, setSurplus] = useState(0);
  const [hud, setHud] = useState({ score: 0, best: 0, time: 0, gap: 9, moved: false });
  const [over, setOver] = useState<OverInfo | null>(null);
  const overRef = useRef(false);
  const onRankRef = useRef(onRank);
  onRankRef.current = onRank;

  function publish(score: number) {
    const job = scoreChain.current.catch(() => undefined).then(() => submitArcadeBest({ data: { name, score } }));
    scoreChain.current = job.then(() => undefined);
    return job;
  }

  if (!worldRef.current || !runRef.current) {
    prevBest.current = best;
    const seed = (Math.floor(Math.random() * 1e9) ^ name.length * 131) >>> 0;
    worldRef.current = createWorld(seed || 1);
    runRef.current = createRun(best);
  }

  pausedRef.current = paused || help;

  useEffect(() => {
    const world = worldRef.current!;
    const run = runRef.current!;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    let rainAcc = 0;
    let aliveFlag = true;
    const hidden = { current: false };
    const onVis = () => {
      hidden.current = document.visibilityState === "hidden";
      if (!hidden.current) audio.resume();
    };
    document.addEventListener("visibilitychange", onVis);

    const finish = () => {
      if (saved.current) return;
      saved.current = true;
      overRef.current = true;
      audio.lose();
      audio.splash();
      const time = run.elapsed;
      const score = run.score;
      const previousLocal = prevBest.current;
      setOver({
        score,
        time,
        previous: previousLocal,
        best: Math.max(previousLocal, score),
        isRecord: score > previousLocal,
        rank: 0,
        pending: true,
        failed: false,
      });
      void publish(score)
        .then((res) => {
          prevBest.current = res.best;
          onRankRef.current(res);
          setHud((h) => ({ ...h, score, best: res.best, time }));
          setOver((current) =>
            current
              ? {
                  ...current,
                  previous: res.previous,
                  best: res.best,
                  isRecord: res.improved,
                  rank: res.mine?.place ?? 0,
                  pending: false,
                  failed: false,
                }
              : current,
          );
        })
        .catch(() => {
          setOver((current) => (current ? { ...current, pending: false, failed: true, rank: 0 } : current));
        });
      for (let i = 0; i < 16; i++) {
        drops.current.push({
          x: 0,
          y: 0,
          vx: (Math.random() - 0.5) * 80,
          vy: -40 - Math.random() * 80,
          life: 0.6 + Math.random() * 0.4,
        });
        const lastDrop = drops.current[drops.current.length - 1]!;
        lastDrop.x = 0;
        lastDrop.y = 0;
      }
    };

    let lastSlide = 0;
    let lastDir: Dir | null = null;
    const onEvents = (events: FloodEvent[], nowMs: number) => {
      for (const ev of events) {
        if (ev.type === "slide") {
          if (ev.dir !== lastDir || nowMs - lastSlide > 260) {
            audio.slide();
            lastSlide = nowMs;
            lastDir = ev.dir;
          }
        } else if (ev.type === "bump") {
          shake.current = 1;
          audio.flip();
        } else if (ev.type === "landmark") {
          floaters.current.push({
            id: fid.current++,
            text: `+${ev.points} ${ev.name}`,
            row: run.row,
            col: run.col,
            life: 1.3,
          });
          audio.place(true);
        } else if (ev.type === "record") {
          setBanner(true);
          setSurplus(ev.surplus);
          audio.record();
          window.setTimeout(() => setBanner(false), 2800);
          void publish(run.score)
            .then((res) => {
              prevBest.current = res.best;
              onRankRef.current(res);
            })
            .catch(() => {});
        } else if (ev.type === "dead") finish();
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const bw = Math.max(1, Math.floor(rect.width * dpr));
      const bh = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx || rect.width < 2) return;

      if (!pausedRef.current && !hidden.current && run.alive && !overRef.current) {
        const held = [...keysRef.current].map(dirFromCode).filter((d): d is Dir => !!d);
        if (held.length) intentRef.current = held[held.length - 1]!;
        run.intent = intentRef.current;
        const events = stepRun(world, run, dt);
        onEvents(events, now);
      }
      shake.current = Math.max(0, shake.current - dt * 2.4);
      for (const f of floaters.current) f.life -= dt;
      floaters.current = floaters.current.filter((f) => f.life > 0);
      const center = playerCenter(run);
      for (const d of drops.current) {
        if (d.x === 0 && d.y === 0 && d.life > 0.5) {
          d.x = rect.width * 0.5;
          d.y = rect.height * 0.7;
        }
        d.vy += 180 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.life -= dt;
      }
      drops.current = drops.current.filter((d) => d.life > 0);
      rainAcc += dt;
      if (rainAcc > 0.35) {
        rainAcc = 0;
        const gap = center.row - run.water;
        audio.setRain(gap < 3 ? 0.52 : gap < 6 ? 0.3 : 0.16);
      }
      paint(ctx, world, run, rect.width, rect.height, now / 1000, shake.current, floaters.current, drops.current);
      hudAcc += dt;
      if (hudAcc > 0.12 && aliveFlag) {
        hudAcc = 0;
        setHud({
          score: run.score,
          best: Math.max(prevBest.current, run.celebrated ? run.score : prevBest.current),
          time: run.elapsed,
          gap: center.row - run.water,
          moved: run.maxRow > 0.4 || run.moving,
        });
        if (run.celebrated) setSurplus(run.surplus);
      }
    };
    raf = requestAnimationFrame(frame);

    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const dir = dirFromCode(e.code);
      if (!dir) return;
      e.preventDefault();
      keysRef.current.delete(e.code);
      keysRef.current.add(e.code);
      intentRef.current = dir;
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    const blur = () => keysRef.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    window.__controlsTest = {
      setKeys(codes: string[]) {
        keysRef.current = new Set(codes);
        const dirs = codes.map(dirFromCode).filter((d): d is Dir => !!d);
        if (dirs.length) intentRef.current = dirs[dirs.length - 1]!;
      },
      getCol: () => run.col,
      getRow: () => run.row,
      getSpeed: () => (run.moving ? slideSpeedSafe(run) : 0),
      getYaw: () => 0,
    };

    return () => {
      aliveFlag = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      delete window.__controlsTest;
    };
  }, [name]);

  function aim(dir: Dir) {
    intentRef.current = dir;
    audio.unlock();
  }

  async function toggleFull() {
    const native = document.fullscreenElement;
    const fitted = document.body.classList.contains("app-fullscreen");
    if (native || fitted) {
      document.body.classList.remove("app-fullscreen");
      if (native) {
        try {
          await document.exitFullscreen();
        } catch {
          /* ya salió */
        }
      }
      setFull(false);
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
      setFull(true);
    } catch {
      document.body.classList.add("app-fullscreen");
      setFull(true);
    }
  }

  const place = sectorAt(worldRef.current, Math.floor(runRef.current?.row ?? 0));
  const where = place?.avenue ? "Av. Virreyes" : "Virreyes";

  return (
    <div className="arcade-root">
      <canvas
        ref={canvasRef}
        aria-label="Calles de Virreyes. El agua sube desde abajo."
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest(".arcade-ui")) return;
          swipe.current = { x: e.clientX, y: e.clientY };
          canvasRef.current?.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s || over) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.hypot(dx, dy) < 18) return;
          if (Math.abs(dx) > Math.abs(dy)) aim(dx > 0 ? "e" : "w");
          else aim(dy > 0 ? "s" : "n");
        }}
      />
      <div className="arcade-hud arcade-ui">
        <div className="arcade-top">
          <div>
            <b>{hud.score} pts</b>
            <span>Récord {Math.max(hud.best, prevBest.current)}</span>
          </div>
          <div>
            <b>{where}</b>
            <span>{formatTime(hud.time)}</span>
          </div>
          <div className="arcade-tools">
            <button
              className={musicOn ? "icon-btn" : "icon-btn is-off"}
              type="button"
              onClick={onMusic}
              aria-pressed={musicOn}
              aria-label={musicOn ? "Silenciar música" : "Activar música"}
            >
              <Music size={18} />
            </button>
            <button className="icon-btn" type="button" onClick={onMute} aria-label={mute ? "Activar sonido" : "Silenciar"}>
              {mute ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button className="icon-btn" type="button" onClick={() => void toggleFull()} aria-label="Pantalla completa">
              {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button className="icon-btn help-btn" type="button" onClick={() => setHelp(true)} aria-label="Cómo se juega">
              ?
            </button>
            <button className="tap alt arcade-exit" type="button" onClick={onLeave}>
              Salir
            </button>
          </div>
        </div>
        {hud.gap < 5 && !over && <p className="arcade-danger">El arroyo está cerca</p>}
        {!hud.moved && !over && (
          <p className="arcade-hint">Deslizá hacia arriba. Seguí hasta chocar con una casa.</p>
        )}
      </div>

      {banner && !over && (
        <div className="record-banner" role="status">
          <strong>¡NUEVO RÉCORD!</strong>
          <span>Superaste tu marca por {Math.max(1, surplus)} puntos</span>
        </div>
      )}

      {!over && (
        <div className="dpad arcade-ui" aria-hidden="false">
          <button type="button" className="dpad-btn up" aria-label="Arriba" onPointerDown={(e) => { e.preventDefault(); aim("n"); }}>
            ▲
          </button>
          <button type="button" className="dpad-btn left" aria-label="Izquierda" onPointerDown={(e) => { e.preventDefault(); aim("w"); }}>
            ◀
          </button>
          <button type="button" className="dpad-btn down" aria-label="Abajo" onPointerDown={(e) => { e.preventDefault(); aim("s"); }}>
            ▼
          </button>
          <button type="button" className="dpad-btn right" aria-label="Derecha" onPointerDown={(e) => { e.preventDefault(); aim("e"); }}>
            ▶
          </button>
        </div>
      )}

      {help && (
        <div className="modal arcade-ui">
          <div className="dialog">
            <p className="kicker">Arcade</p>
            <h2>Las calles de Virreyes</h2>
            <p>Deslizate en cuatro direcciones. La personita sigue hasta una pared, un auto o una obra.</p>
            <p>El agua del arroyo sube todo el tiempo. Si te alcanza, se termina.</p>
            <p>Flechas o WASD, deslizar el dedo, o los botones. El barrio no tiene final.</p>
            <button className="tap" type="button" onClick={() => setHelp(false)}>
              Seguir
            </button>
          </div>
        </div>
      )}

      {over && (
        <div className={over.isRecord ? "modal finale flood arcade-ui record-finale" : "modal finale flood arcade-ui"}>
          <div className="dialog">
            {over.isRecord ? (
              <>
                <p className="kicker">Arcade</p>
                <h2 className="record-title">¡NUEVO RÉCORD!</h2>
                <p>
                  {over.previous > 0
                    ? `Bien ahí, ${name}. Superaste tu marca por ${over.score - over.previous} puntos.`
                    : `Bien ahí, ${name}. Es tu primer récord.`}
                </p>
              </>
            ) : (
              <>
                <p className="kicker">Arcade</p>
                <h2>El arroyo te alcanzó</h2>
                <p>{name}, el agua subió más rápido que el recorrido.</p>
              </>
            )}
            <ul className="arcade-stats">
              <li>
                <span>Puntuación</span>
                <b>{over.score}</b>
              </li>
              <li>
                <span>Récord personal</span>
                <b>{over.best}</b>
              </li>
              <li>
                <span>Tiempo</span>
                <b>{formatTime(over.time)}</b>
              </li>
            </ul>
            {over.pending && <p>Guardando tu puesto en el ranking…</p>}
            {over.failed && <p className="err">No se pudo guardar el ranking.</p>}
            {!over.pending && !over.failed && over.rank > 0 && <p>Puesto #{over.rank} en el ranking.</p>}
            {!over.pending && (
              <ArcadeRankList
                rows={ranking}
                me={name}
                mine={over.rank > 0 ? { place: over.rank, name, score: over.best } : null}
                compact
              />
            )}
            <div className="actions">
              <button className="tap" type="button" onClick={onReplay}>
                Jugar de nuevo
              </button>
              <button className="tap alt" type="button" onClick={onMenu}>
                Menú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function slideSpeedSafe(run: Run): number {
  return run.moving ? 1 : 0;
}

declare global {
  interface Window {
    __controlsTest?: {
      setKeys: (codes: string[]) => void;
      getCol: () => number;
      getRow: () => number;
      getSpeed: () => number;
      getYaw: () => number;
    };
  }
}
