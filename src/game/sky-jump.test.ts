import test from "node:test";
import assert from "node:assert/strict";
import { createSkyWorld, extendSkyWorld, skyScore, updateMovingPlatforms } from "./sky-jump.ts";

test("Sky Jump genera plataformas alcanzables y separadas", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const world = createSkyWorld(seed);
    extendSkyWorld(world, 1600);
    for (let i = 1; i < world.platforms.length; i++) {
      const a = world.platforms[i - 1]!;
      const b = world.platforms[i]!;
      assert.ok(b.height - a.height <= 82.1, `salto vertical imposible en seed ${seed}`);
      const horizontalGap = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
      assert.ok(horizontalGap <= 92, `salto horizontal imposible en seed ${seed}`);
      assert.ok(!(a.hazard && b.hazard), `dos trampas seguidas en seed ${seed}`);
    }
  }
});

test("Sky Jump suma altura y bonus sin producir puntajes negativos", () => {
  assert.equal(skyScore(0, 0), 0);
  assert.equal(skyScore(80, 15), 25);
  assert.equal(skyScore(-30, -500), 0);
});

test("la ciudad mezcla colectivos, aviones y los dos potenciadores", () => {
  const platformKinds = new Set<string>();
  const pickupKinds = new Set<string>();
  for (let seed = 1; seed <= 80; seed++) {
    const world = createSkyWorld(seed);
    extendSkyWorld(world, 2800);
    world.platforms.forEach((platform) => platformKinds.add(platform.kind));
    world.pickups.forEach((pickup) => pickupKinds.add(pickup.kind));
  }
  assert.ok(platformKinds.has("colectivo"));
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
