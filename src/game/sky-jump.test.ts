import test from "node:test";
import assert from "node:assert/strict";
import { createSkyWorld, extendSkyWorld, skyScore, skyZone, updateMovingPlatforms } from "./sky-jump.ts";

test("Sky Jump genera plataformas más espaciadas pero alcanzables", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const world = createSkyWorld(seed);
    extendSkyWorld(world, 1600);
    for (let i = 1; i < world.platforms.length; i++) {
      const a = world.platforms[i - 1]!;
      const b = world.platforms[i]!;
      const gap = b.height - a.height;
      assert.ok(gap <= 110, `salto vertical imposible en seed ${seed}`);
      assert.ok(gap >= 65, `plataformas demasiado pegadas en seed ${seed}`);
      const horizontalGap = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
      assert.ok(horizontalGap <= 92, `salto horizontal imposible en seed ${seed}`);
      assert.ok(!(a.hazard && b.hazard), `dos trampas seguidas en seed ${seed}`);
      assert.ok(!b.hazard || b.kind === "airplane", `el fuego solo debe aparecer en aviones (seed ${seed})`);
    }
  }
});

test("las plataformas se reparten a lo ancho y no quedan en una sola columna", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const world = createSkyWorld(seed);
    extendSkyWorld(world, 1800);
    const centers = world.platforms.map((p) => p.x + p.width / 2);
    const spread = Math.max(...centers) - Math.min(...centers);
    assert.ok(spread > 150, `poca variedad horizontal en seed ${seed}: ${spread}`);
  }
});

test("el puntaje es la altura: si no subís, no suma", () => {
  assert.equal(skyScore(0, 0), 0);
  assert.equal(skyScore(80, 15), 80);
  assert.equal(skyScore(80.9, 999), 80);
  assert.equal(skyScore(-30, 500), 0);
  assert.equal(skyZone(0).id, "calle");
  assert.equal(skyZone(180).id, "techos");
  assert.equal(skyZone(420).id, "cielo");
  assert.equal(skyZone(780).id, "altura");
  assert.equal(skyZone(1200).id, "espacio");
  assert.equal(skyZone(4000).label, "Espacio");
});

test("la ciudad mezcla veredas, techos, colectivos, aviones y los dos potenciadores", () => {
  const platformKinds = new Set<string>();
  const pickupKinds = new Set<string>();
  for (let seed = 1; seed <= 80; seed++) {
    const world = createSkyWorld(seed);
    extendSkyWorld(world, 2800);
    world.platforms.forEach((platform) => platformKinds.add(platform.kind));
    world.pickups.forEach((pickup) => pickupKinds.add(pickup.kind));
  }
  assert.ok(platformKinds.has("sidewalk"));
  assert.ok(platformKinds.has("roof"));
  assert.ok(platformKinds.has("balcony"));
  assert.ok(platformKinds.has("taxi"));
  assert.ok(platformKinds.has("colectivo"));
  assert.ok(platformKinds.has("awning"));
  assert.ok(platformKinds.has("airplane"));
  assert.ok(pickupKinds.has("balloon"));
  assert.ok(pickupKinds.has("sun"));
});

test("las plataformas-avión permanecen dentro del escenario", () => {
  const world = createSkyWorld(1234);
  for (let i = 0; i < 400; i++) {
    updateMovingPlatforms(world, 0.05);
    for (const platform of world.platforms) {
      if (platform.kind === "airplane") {
        assert.ok(platform.x >= 5);
        assert.ok(platform.x + platform.width <= 315);
      }
    }
  }
});
