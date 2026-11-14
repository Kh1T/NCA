import Phaser from "phaser";
import { COLORS, FONT, HEIGHT, WIDTH } from "../config.js";
import { readBestScore } from "../utils/storage.js";
import { createButton } from "../ui/Button.js";
import { createStarfield } from "../ui/Starfield.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.starting = false;
    this.cameras.main.fadeIn(450, 5, 8, 16);
    createStarfield(this, { starCount: 120 });

    this.add
      .circle(WIDTH / 2, HEIGHT / 2 - 30, 190, COLORS.cyan, 0.04)
      .setStrokeStyle(1, COLORS.cyan, 0.12);
    this.add
      .circle(WIDTH / 2, HEIGHT / 2 - 30, 260, COLORS.pink, 0.025)
      .setStrokeStyle(1, COLORS.pink, 0.08);

    const title = this.add
      .text(WIDTH / 2, 160, "ASTROPEER", {
        fontFamily: FONT,
        fontSize: "132px",
        color: "#4de2ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setShadow(0, 0, "#4de2ff", 28, true, true);

    this.tweens.add({
      targets: title,
      y: 170,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .rectangle(WIDTH / 2, 238, 300, 2, COLORS.cyan, 0.5)
      .setOrigin(0.5);

    this.add
      .text(WIDTH / 2, 266, "DEEP SPACE ARCADE", {
        fontFamily: FONT,
        fontSize: "20px",
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setLetterSpacing(6);

    this.add
      .text(WIDTH / 2, 300, "A quick arcade run in deep space.", {
        fontFamily: FONT,
        fontSize: "16px",
        color: COLORS.muted,
      })
      .setOrigin(0.5);

    createButton(this, WIDTH / 2, 366, "LAUNCH RUN", () => this.startGame());

    const best = readBestScore();
    this.add
      .text(WIDTH / 2, 436, `BEST SCORE  ${best.toString().padStart(4, "0")}`, {
        fontFamily: FONT,
        fontSize: "16px",
        color: COLORS.muted,
      })
      .setOrigin(0.5);

    this.add
      .text(
        WIDTH / 2,
        480,
        "WASD / ARROWS TO FLY   \u00b7   COLLECT CORES   \u00b7   DODGE DRONES",
        {
          fontFamily: FONT,
          fontSize: "13px",
          color: COLORS.muted,
        },
      )
      .setOrigin(0.5);

    this.add
      .text(WIDTH / 2, HEIGHT - 16, "PRESS ENTER OR SPACE TO START", {
        fontFamily: FONT,
        fontSize: "12px",
        color: "#4d6280",
      })
      .setOrigin(0.5)
      .setLetterSpacing(2);

    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update() {
    if (
      !this.starting &&
      (Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey))
    ) {
      this.startGame();
    }
  }

  startGame() {
    if (this.starting) {
      return;
    }

    this.starting = true;
    this.cameras.main.fadeOut(250, 5, 8, 16);
    this.time.delayedCall(260, () => this.scene.start("GameScene"));
  }
}
