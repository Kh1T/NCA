import Phaser from "phaser";
import { GROUND_Y, HEIGHT, PALETTE, WIDTH } from "../constants.js";

/** Black sky with stars. The Moon has no air, so there is no coloured haze. */
export function drawStars(scene, { seed = "outpost", count = 110, maxY = HEIGHT, width = WIDTH, scroll = 1 } = {}) {
  const rng = new Phaser.Math.RandomDataGenerator([seed]);
  const g = scene.add.graphics().setDepth(-50).setScrollFactor(scroll);
  for (let i = 0; i < count; i += 1) {
    g.fillStyle(PALETTE.star, rng.realInRange(0.2, 0.9));
    g.fillRect(rng.between(0, width), rng.between(0, maxY), 1, 1);
  }
  return g;
}

/** A strip of gray lunar ground with a few shallow craters. */
export function drawGround(scene, { width = WIDTH, y = GROUND_Y, dark = false, seed = "ground" } = {}) {
  const rng = new Phaser.Math.RandomDataGenerator([seed]);
  const g = scene.add.graphics().setDepth(-10);
  g.fillStyle(dark ? 0x4a4d54 : PALETTE.regolith, 1);
  g.fillRect(0, y, width, HEIGHT - y);
  g.fillStyle(dark ? 0x6d7078 : PALETTE.regolithLight, 1);
  g.fillRect(0, y, width, 2);
  g.fillStyle(dark ? 0x2c2e33 : PALETTE.crater, 1);
  for (let x = 40; x < width; x += rng.between(90, 170)) {
    g.fillEllipse(x, y + rng.between(16, 46), rng.between(28, 64), 7);
  }
  return g;
}

/** Low hills on the horizon. */
export function drawHills(scene, { width = WIDTH, y = GROUND_Y, color = PALETTE.regolithDark, seed = "hills", scroll = 1 } = {}) {
  const rng = new Phaser.Math.RandomDataGenerator([seed]);
  const g = scene.add.graphics().setDepth(-20).setScrollFactor(scroll);
  g.fillStyle(color, 1);
  for (let x = -40; x < width; ) {
    const w = rng.between(140, 300);
    const h = rng.between(18, 50);
    g.fillTriangle(x, y, x + w * rng.realInRange(0.35, 0.65), y - h, x + w, y);
    x += w * rng.realInRange(0.5, 0.9);
  }
  return g;
}

/** Small blue Earth. Only drawn on the near side: the far side never sees it. */
export function drawEarth(scene, x = 540, y = 62) {
  const g = scene.add.graphics().setDepth(-40).setScrollFactor(0.1);
  g.fillStyle(PALETTE.earth, 1);
  g.fillCircle(x, y, 14);
  g.fillStyle(0xe9f4ff, 0.85);
  g.fillRect(x - 8, y - 6, 9, 3);
  g.fillRect(x + 1, y + 4, 8, 2);
  g.fillStyle(PALETTE.sky, 0.55);
  g.fillCircle(x + 6, y + 4, 12);
  return g;
}
