import Phaser from "phaser";
import { COLORS, HEIGHT, WIDTH } from "../config.js";

export function createStarfield(scene, { starCount = 90, grid = true } = {}) {
  const container = scene.add.container(0, 0).setDepth(-100);

  const background = scene.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.background).setOrigin(0);
  container.add(background);

  if (grid) {
    const lines = scene.add.graphics();
    lines.lineStyle(1, COLORS.grid, 0.7);

    for (let x = 0; x <= WIDTH; x += 60) {
      lines.lineBetween(x, 0, x, HEIGHT);
    }
    for (let y = 0; y <= HEIGHT; y += 60) {
      lines.lineBetween(0, y, WIDTH, y);
    }

    container.add(lines);
  }

  for (let i = 0; i < starCount; i += 1) {
    const radius = Phaser.Math.FloatBetween(0.5, 1.7);
    const star = scene.add.circle(
      Phaser.Math.Between(0, WIDTH),
      Phaser.Math.Between(0, HEIGHT),
      radius,
      Phaser.Math.RND.pick([COLORS.cyan, COLORS.white, COLORS.pink, COLORS.gold]),
      Phaser.Math.FloatBetween(0.15, 0.7),
    );

    container.add(star);

    scene.tweens.add({
      targets: star,
      alpha: Phaser.Math.FloatBetween(0.05, 0.25),
      duration: Phaser.Math.Between(900, 3200),
      delay: Phaser.Math.Between(0, 1500),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  return container;
}
