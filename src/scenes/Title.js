import Phaser from "phaser";
import { GROUND_Y, HEIGHT, TEXT, WIDTH, textStyle } from "../constants.js";
import { defaultMission, readBest } from "../data/mission.js";
import { drawEarth, drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { isMuted, toggleMute } from "../ui/sfx.js";

export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    drawStars(this, { seed: "outpost-title", maxY: GROUND_Y - 40 });
    // The title shows the near-side landing site, where Earth is in the sky.
    drawEarth(this, 540, 62);
    drawHills(this, { seed: "title-hills" });
    drawGround(this, { seed: "title-ground" });

    this.add.text(WIDTH / 2, 62, "OUTPOST", textStyle(40, TEXT.white)).setOrigin(0.5);
    this.add.text(WIDTH / 2, 104, "DARK SIDE", textStyle(24, TEXT.accent)).setOrigin(0.5);
    this.add
      .text(WIDTH / 2, 136, "Build a Moon base. Survive real space weather.\nPhotograph five craters on the far side.", textStyle(8, TEXT.muted, { align: "center", lineSpacing: 4 }))
      .setOrigin(0.5);

    if (this.textures.exists("astro-walk-1")) {
      const astronaut = this.add.sprite(60, GROUND_Y - 22, "astro-walk-1").play("astro-walk");
      this.tweens.add({ targets: astronaut, x: WIDTH + 30, duration: 16000, repeat: -1 });
    }

    const L = new Layer(this, { depth: 5, keys: true });
    const start = L.button(WIDTH / 2, 184, "START MISSION", () => this.startGame(), { w: 180, h: 24, key: "ENTER" });
    L.button(WIDTH / 2, 214, "SCIENCE SOURCES", () => this.scene.start("Credits", { from: "Title" }), { w: 180, h: 20 });
    const mute = L.button(WIDTH / 2, 240, isMuted() ? "SOUND: OFF" : "SOUND: ON", () => mute.setLabel(toggleMute() ? "SOUND: OFF" : "SOUND: ON"), { w: 180, h: 20 });
    L.focusFirst(start);

    const best = readBest();
    if (best > 0) this.add.text(WIDTH / 2, 266, `BEST SCORE: ${best}`, textStyle(8, TEXT.good)).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT - 26, "ENTER OR CLICK TO START. TAB / ARROWS MOVE BETWEEN BUTTONS.", textStyle(8, "#23262d")).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT - 12, "NASA SPACE APPS - GAME NUMBERS ARE SIMPLIFIED", textStyle(8, "#23262d")).setOrigin(0.5);
  }

  startGame() {
    // A fresh mission keeps the last pack and choices, so a retry is quick.
    if (!this.registry.get("mission")) this.registry.set("mission", defaultMission());
    this.registry.remove("outpostX");
    this.registry.remove("outpostHelpShown");
    this.scene.start("Blueprints");
  }
}
