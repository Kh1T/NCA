import Phaser from "phaser";
import { HEIGHT, TEXT, WIDTH, textStyle } from "../constants.js";
import { preloadCraterImages, preloadNasa } from "../data/nasa.js";

const WALK_FRAMES = [1, 2, 3, 4, 5, 6];

export class Boot extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    this.add.text(WIDTH / 2, HEIGHT / 2, "LOADING...", textStyle(8, TEXT.muted)).setOrigin(0.5);
    this.load.on("loaderror", (file) => {
      console.warn(`OUTPOST: could not load ${file.src}`);
    });

    // Astronaut walk cycle, made by scripts/generate-sprites.mjs (48x48 frames).
    for (const n of WALK_FRAMES) {
      this.load.image(`astro-walk-${n}`, `sprites/normal/walk-0${n}-48px.png`);
    }
    // Cached NASA data. The game never fetches from NASA while it runs.
    preloadNasa(this);
  }

  async create() {
    // Wait for the pixel font so the first text is not drawn in a fallback font.
    try {
      await document.fonts.load('8px "Press Start 2P"');
    } catch {
      // Offline or blocked: the monospace fallback is fine.
    }

    this.makeFallbackAstronaut();
    if (!this.anims.exists("astro-walk")) {
      this.anims.create({
        key: "astro-walk",
        frames: WALK_FRAMES.map((n) => ({ key: `astro-walk-${n}` })),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Crater photos are listed in a data file, so they load in a second pass.
    preloadCraterImages(this);
    if (this.load.list.size === 0) {
      this.startGame();
      return;
    }
    this.load.once("complete", () => this.startGame());
    this.load.start();
  }

  /** If the sprite files are missing, draw a simple astronaut so the game still runs. */
  makeFallbackAstronaut() {
    for (const n of WALK_FRAMES) {
      const key = `astro-walk-${n}`;
      if (this.textures.exists(key)) continue;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xe4edf2, 1);
      g.fillRect(17, 14, 14, 12);
      g.fillRect(18, 26, 12, 12);
      g.fillStyle(0x163540, 1);
      g.fillRect(21, 17, 9, 6);
      g.fillStyle(0xf1845e, 1);
      g.fillRect(18, 30, 12, 2);
      g.fillStyle(0xb8c5ce, 1);
      const step = n % 2 === 0 ? 2 : 0;
      g.fillRect(18 + step, 38, 5, 8);
      g.fillRect(25 - step, 38, 5, 8);
      g.generateTexture(key, 48, 48);
      g.destroy();
    }
  }

  startGame() {
    // ?scene=UiTest (or any scene key) jumps straight there, for testing.
    const wanted = new URLSearchParams(window.location.search).get("scene");
    this.scene.start(wanted && this.scene.manager.keys[wanted] ? wanted : "Title");
  }
}
