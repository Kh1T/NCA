import Phaser from "phaser";
import { GROUND_Y, TEXT, UI, WIDTH } from "../constants.js";
import { readBest } from "../data/mission.js";
import { drawEarth, drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { isMuted, playMusic } from "../ui/sfx.js";
import { openSound } from "../ui/SoundPanel.js";
import { resetSeen, seen } from "../utils/progress.js";

export class Title extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    drawStars(this, { seed: "outpost-title", maxY: GROUND_Y - 40 });
    // The title shows the near-side landing site, where Earth is in the sky.
    drawEarth(this, 560, 70);
    drawHills(this, { seed: "title-hills" });
    drawGround(this, { seed: "title-ground" });

    const L = new Layer(this, { depth: 5, keys: true });
    L.text(WIDTH / 2, 18, "OUTPOST", { size: 80, origin: 0.5 });
    L.text(WIDTH / 2, 92, "DARK SIDE", { size: UI.huge, color: TEXT.accent, origin: 0.5 });
    L.text(WIDTH / 2, 140, "Build a Moon base. Survive real space weather.", { origin: 0.5, color: TEXT.muted });

    if (this.textures.exists("astro-walk-1")) {
      const astronaut = this.add.sprite(60, GROUND_Y - 22, "astro-walk-1").play("astro-walk");
      this.tweens.add({ targets: astronaut, x: WIDTH + 30, duration: 16000, repeat: -1 });
    }

    const play = L.button(WIDTH / 2, 190, "PLAY", () => this.startGame(), { w: 220, h: 48, key: "ENTER", icon: "play", size: UI.title });
    this.tweens.add({ targets: [play.bg], scaleX: 1.03, scaleY: 1.06, duration: 700, yoyo: true, repeat: -1 });
    // The rest of the menu: each is a picture plus one word.
    const menu = [
      ["STORY", "book", () => this.scene.start("Story", { next: "Title" }), "Story"],
      ["BADGES", "medal", () => this.scene.start("Badges"), "Badges"],
      ["WORDS", "question", () => this.scene.start("Glossary", { from: "Title" }), "Glossary"],
      ["SOURCES", "science", () => this.scene.start("Credits", { from: "Title" }), "Credits"],
    ].filter(([, , , key]) => this.scene.manager.keys[key]);
    menu.forEach(([label, icon, go], i) => {
      const bx = WIDTH / 2 + (i - (menu.length - 1) / 2) * 132;
      L.button(bx, 246, label, go, { w: 124, h: 36, icon });
    });
    const mute = L.iconButton(612, 28, isMuted() ? "mute" : "sound", () => openSound(this, { onClose: () => mute.setIcon(isMuted() ? "mute" : "sound") }));
    playMusic("menu");
    // Show every tutorial and the story again (for a new player on the same device).
    const tipsNote = L.text(52, 22, "", { color: TEXT.good });
    L.iconButton(28, 28, "question", () => {
      resetSeen();
      tipsNote.setText("TIPS ON AGAIN!");
      this.time.delayedCall(1800, () => tipsNote.setText(""));
    });
    L.focusFirst(play);

    const best = readBest();
    if (best > 0) {
      const g = L.gfx();
      drawIcon(g, "star", 14, 336, 1.4);
      L.text(36, 334, `BEST ${best}`, { color: "#23262d", size: UI.big });
    }
    L.text(WIDTH - 10, 338, "NASA SPACE APPS · NUMBERS SIMPLIFIED", { origin: 1, color: "#23262d" });
  }

  startGame() {
    this.registry.remove("outpostX");
    // The story plays by itself the very first time.
    if (this.scene.manager.keys.Story && !seen("story")) {
      this.scene.start("Story", { next: "Scenario" });
      return;
    }
    this.scene.start("Scenario");
  }
}
