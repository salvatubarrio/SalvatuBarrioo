import test from "node:test";
import assert from "node:assert/strict";
import {
  COLS,
  SECTOR_H,
  createRun,
  createWorld,
  ensureWorld,
  isWalk,
  stepRun,
  type Sector,
} from "./flood.ts";

function reachable(sector: Sector, entryCol: number) {
  const queue = [{ row: 0, col: entryCol }];
  const seen = new Set([`0:${entryCol}`]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const col = current.col + dc!;
      const row = current.row + dr!;
      const key = `${row}:${col}`;
      if (row < 0 || row >= SECTOR_H || col < 0 || col >= COLS || seen.has(key)) continue;
      const kind = sector.tiles[row]![col]!.kind;
      if (kind !== "street" && kind !== "plaza" && kind !== "escalera" && kind !== "pasarela" && kind !== "azotea") continue;
      seen.add(key);
      queue.push({ row, col });
    }
  }
  return seen;
}

test("los sectores mantienen rutas conectadas y orbes alcanzables", () => {
  for (let seed = 1; seed <= 120; seed++) {
    const world = createWorld(seed);
    ensureWorld(world, SECTOR_H * 10);
    for (let index = 0; index < world.sectors.length; index++) {
      const sector = world.sectors[index]!;
      assert.equal(sector.tiles.length, SECTOR_H);
      assert.ok(sector.tiles.every((row) => row.length === COLS));
      const entryCol = index === 0 ? 5 : world.sectors[index - 1]!.exitCol;
      const connected = reachable(sector, entryCol);
      assert.ok(connected.has(`${SECTOR_H - 1}:${sector.exitCol}`), `salida desconectada: seed ${seed}, sector ${index}`);
      const roofCells = sector.tiles.flatMap((row, r) => row.flatMap((tile, c) => tile.kind === "azotea" ? [{ r, c }] : []));
      for (const roof of roofCells) {
        assert.ok(connected.has(`${roof.r}:${roof.c}`), `azotea inaccesible: seed ${seed}, sector ${index}`);
      }
      for (const orb of sector.orbs) {
        assert.ok(connected.has(`${orb.row}:${orb.col}`), `orbe inaccesible: seed ${seed}, sector ${index}`);
        assert.ok(isWalk(world, orb.col, index * SECTOR_H + orb.row));
        assert.ok(!sector.traffic.some((vehicle) => vehicle.row === orb.row), "un orbe no debe quedar en un carril con tránsito");
      }
      for (const vehicle of sector.traffic) {
        assert.ok(connected.has(`${vehicle.row}:1`), `carril de tránsito sin conexión: seed ${seed}, sector ${index}`);
        const bridgeCells = sector.tiles[vehicle.row]!.flatMap((tile, col) => tile.kind === "pasarela" ? [col] : []);
        const entryStair = sector.tiles[vehicle.row - 1]!.findIndex((tile) => tile.kind === "escalera");
        const exitStair = sector.tiles[vehicle.row + 1]!.findIndex((tile) => tile.kind === "escalera");
        assert.ok(bridgeCells.length === COLS - 2, "la pasarela debe cubrir toda la avenida para que ningún auto tape el paso");
        assert.ok(entryStair >= 1 && exitStair >= 1, "la pasarela debe tener escaleras a ambos lados");
        assert.ok(connected.has(`${vehicle.row - 1}:${entryStair}`), "la escalera de entrada debe ser alcanzable");
        assert.ok(connected.has(`${vehicle.row + 1}:${exitStair}`), "la escalera de salida debe ser alcanzable");
        for (const col of bridgeCells) assert.ok(connected.has(`${vehicle.row}:${col}`), "todo el puente debe ser alcanzable");
      }
      if (index > 0) assert.ok(isWalk(world, entryCol, index * SECTOR_H));
    }
  }
});

test("los orbes se recolectan una sola vez y suman puntos", () => {
  const world = createWorld(42);
  const orb = world.sectors[0]!.orbs[0];
  assert.ok(orb, "el sector inicial debe incluir coleccionables");
  const run = createRun(0);
  run.col = orb.col;
  run.row = orb.row;
  run.fromCol = orb.col;
  run.toCol = orb.col;
  run.fromRow = orb.row;
  run.toRow = orb.row;
  run.water = -100;

  const firstEvents = stepRun(world, run, 0.016);
  assert.ok(firstEvents.some((event) => event.type === "orb" && event.points === orb.points));
  assert.ok(run.got.has(orb.id));
  assert.equal(run.bonus, orb.points);

  const secondEvents = stepRun(world, run, 0.016);
  assert.equal(secondEvents.some((event) => event.type === "orb"), false);
  assert.equal(run.bonus, orb.points);
});

test("el jugador puede cruzar cualquier parte de la pasarela sin que un auto lo bloquee", () => {
  const world = createWorld(21);
  const vehicle = world.sectors[0]!.traffic[0]!;
  const bridgeCells = world.sectors[0]!.tiles[vehicle.row]!
    .flatMap((tile, col) => tile.kind === "pasarela" ? [col] : []);
  assert.equal(bridgeCells.length, COLS - 2);
  vehicle.speed = 0;
  for (const col of bridgeCells) {
    vehicle.x = col + 0.5;
    const run = createRun(0);
    run.col = col;
    run.row = vehicle.row;
    run.fromCol = run.toCol = col;
    run.fromRow = run.toRow = vehicle.row;
    run.water = -100;
    const events = stepRun(world, run, 0.016);
    assert.equal(run.alive, true, `el auto no debe bloquear la columna ${col}`);
    assert.equal(events.some((event) => event.type === "crash"), false);
  }
});

test("al soltar la dirección, el personaje termina el paso actual y frena", () => {
  const world = createWorld(1);
  world.sectors[0]!.tiles[1]![5] = { kind: "street", v: 0 };
  const run = createRun(0);
  run.intent = "n";
  stepRun(world, run, 0.02);
  assert.equal(run.moving, true);
  run.intent = null;
  stepRun(world, run, 0.05);
  stepRun(world, run, 0.05);
  assert.equal(run.row, 1);
  assert.equal(run.moving, false);
  stepRun(world, run, 0.05);
  assert.equal(run.row, 1);
  assert.equal(run.moving, false);
});

 test("la generación es determinista para una misma semilla", () => {
  const a = createWorld(2026);
  const b = createWorld(2026);
  assert.deepEqual(a.sectors, b.sectors);
});

test("el tránsito aumenta por sectores y permanece dentro de las calles", () => {
  const world = createWorld(77);
  ensureWorld(world, SECTOR_H * 10);
  assert.equal(world.sectors[0]!.traffic.length, 1);
  assert.equal(world.sectors[3]!.traffic.length, 2);
  assert.equal(world.sectors[9]!.traffic.length, 3);
  const early = world.sectors[0]!.traffic[0]!;
  const later = world.sectors[9]!.traffic[0]!;
  assert.ok(later.speed > early.speed);
  for (const sector of world.sectors) {
    for (const vehicle of sector.traffic) {
      assert.ok(vehicle.x >= 1.5 && vehicle.x <= 9.5);
      assert.ok([4, 8, 12].includes(vehicle.row));
    }
  }
});

test("un vehículo alcanza al jugador y registra la causa del choque", () => {
  const world = createWorld(19);
  const vehicle = world.sectors[0]!.traffic[0]!;
  vehicle.x = 5.5;
  vehicle.speed = 2;
  vehicle.direction = 1;
  world.sectors[0]!.tiles[vehicle.row]![5] = { kind: "street", v: 0 };
  const run = createRun(0);
  run.col = 5;
  run.row = vehicle.row;
  run.fromCol = run.toCol = 5;
  run.fromRow = run.toRow = vehicle.row;
  run.water = -100;

  const events = stepRun(world, run, 0.016);
  assert.equal(run.alive, false);
  assert.equal(run.deathCause, "traffic");
  assert.ok(events.some((event) => event.type === "crash"));
});

test("el jugador no choca con el tránsito de una calle paralela", () => {
  const world = createWorld(20);
  const vehicle = world.sectors[0]!.traffic[0]!;
  vehicle.x = 5.5;
  const run = createRun(0);
  run.col = 5;
  run.row = vehicle.row + 1;
  run.fromCol = run.toCol = 5;
  run.fromRow = run.toRow = vehicle.row + 1;
  run.water = -100;

  const events = stepRun(world, run, 0.016);
  assert.equal(run.alive, true);
  assert.equal(run.deathCause, null);
  assert.equal(events.some((event) => event.type === "crash"), false);
});


test("los sectores incluyen atajos por azoteas alcanzables", () => {
  let sectorsWithRoof = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const world = createWorld(seed);
    ensureWorld(world, SECTOR_H * 4);
    for (let index = 0; index < world.sectors.length; index++) {
      const sector = world.sectors[index]!;
      const roofs = sector.tiles.flat().filter((tile) => tile.kind === "azotea");
      if (roofs.length) sectorsWithRoof++;
      assert.ok(roofs.length === 0 || roofs.length >= 2, "un atajo de azotea no debe quedar como una celda aislada");
    }
  }
  assert.ok(sectorsWithRoof > 40, "deben aparecer atajos de azotea con frecuencia");
});
