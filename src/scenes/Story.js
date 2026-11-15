import Phaser from "phaser";
import { GROUND_Y, HEIGHT, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { drawShip } from "../ui/art.js";
import { drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { sfx, playMusic } from "../ui/sfx.js";
import { markSeen } from "../utils/progress.js";

const SCENE_MS = 5600;

/**
 * The opening story: six short animated scenes, one line each, about 35
 * seconds in all. Plays by itself the first time, and from STORY on the menu.
 * Tap or press Enter for the next scene; SKIP ends it.
 */
export class Story extends Phaser.Scene {
  constructor() {
    super("Story");
  }

  init(data) {
    this.next = data?.next ?? "Title";
  }

  create() {
    this.events.once("shutdown", () => {
      clearFocusFor(this);
      if (this.updateFn) this.events.off("update", this.updateFn);
    });
    this.index = -1;
    playMusic("menu");
    this.done = false;
    this.stage = null;
    this.scenes_ = [
      () => this.sceneEarth(),
      () => this.sceneCrater(),
      () => this.scenePicked(),
      () => this.sceneLaunch(),
      () => this.sceneFlight(),
      () => this.sceneArrive(),
    ];
    const UIL = (this.ui = new Layer(this, { depth: 50, keys: true }));
    this.caption = UIL.text(WIDTH / 2, 296, "", { size: UI.big + 4, origin: 0.5, wrap: 600, align: "center" });
    this.caption.setStroke("#05060a", 5);
    this.dots = UIL.gfx();
    UIL.button(580, 30, "SKIP", () => this.finish(), { w: 96, h: 32, key: "ESCAPE", icon: "play" });
    UIL.focus.hotkey("ENTER", () => this.advance());
    UIL.focus.hotkey("SPACE", () => this.advance());
    this.input.on("pointerdown", (pointer, over) => {
      if (over.length === 0) this.advance();
    });
    this.advance();
  }

  advance() {
    if (this.done) return;
    this.timer?.remove();
    this.index += 1;
    if (this.index >= this.scenes_.length) {
      this.finish();
      return;
    }
    this.stage?.destroy();
    this.tweens.killAll();
    if (this.updateFn) this.events.off("update", this.updateFn);
    this.updateFn = null;
    this.stage = new Layer(this, { depth: 1 });
    this.cameras.main.fadeIn(300);
    this.scenes_[this.index]();
    this.dots.clear();
    this.scenes_.forEach((_, i) => {
      this.dots.fillStyle(i === this.index ? PALETTE.accent : 0x3a4658, 1);
      this.dots.fillCircle(WIDTH / 2 - 40 + i * 16, 344, 4);
    });
    this.timer = this.time.delayedCall(SCENE_MS, () => this.advance());
  }

  say(text) {
    this.caption.setText(text).setAlpha(0);
    this.tweens.add({ targets: this.caption, alpha: 1, duration: 500, delay: 300 });
  }

  starfield(seed) {
    const g = this.stage.gfx();
    const rng = new Phaser.Math.RandomDataGenerator([seed]);
    for (let i = 0; i < 120; i += 1) {
      g.fillStyle(0xdfe7f2, rng.realInRange(0.3, 1));
      g.fillRect(rng.between(0, WIDTH), rng.between(0, HEIGHT), 1, 1);
    }
    return g;
  }

  /** A round planet or moon with simple pixel shading. */
  planet(x, y, r, color, shade) {
    const g = this.stage.gfx();
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, r);
    // Night side: a darker crescent that stays inside the planet.
    g.fillStyle(shade, 1);
    g.fillCircle(r * 0.3, 0, r * 0.68);
    g.fillStyle(color, 1);
    g.fillCircle(-r * 0.12, 0, r * 0.78);
    g.setPosition(x, y);
    return g;
  }

  // 1. Earth: scientists spot something.
  sceneEarth() {
    this.starfield("s1");
    const earth = this.planet(220, 150, 80, PALETTE.earth, 0x2f6f99);
    const land = this.stage.gfx();
    land.fillStyle(0x7ddc6a, 1);
    land.fillRect(-40, -30, 30, 20);
    land.fillRect(10, 10, 36, 24);
    land.fillRect(-20, 30, 20, 14);
    land.setPosition(220, 150);
    this.tweens.add({ targets: [earth, land], x: 230, duration: SCENE_MS, ease: "Sine.easeInOut" });
    // A telescope dish on Earth looking up at the Moon.
    const moon = this.planet(500, 80, 26, 0xcfd6e4, 0x8a8d94);
    this.tweens.add({ targets: moon, scale: { from: 0.8, to: 1.1 }, duration: SCENE_MS });
    const beam = this.stage.gfx();
    this.tweens.addCounter({
      from: 0, to: 1, duration: 1800, repeat: -1,
      onUpdate: (t) => {
        beam.clear();
        beam.lineStyle(2, PALETTE.accent, 1 - t.getValue());
        const p = t.getValue();
        beam.lineBetween(290, 120, 290 + (480 - 290) * p, 120 + (90 - 120) * p);
      },
    });
    this.say("Scientists spot something strange on the Moon.");
  }

  // 2. The mystery crater on the far side.
  sceneCrater() {
    this.starfield("s2");
    const moon = this.planet(WIDTH / 2, 150, 110, 0xb9bcc2, 0x8a8d94);
    this.tweens.add({ targets: moon, angle: 12, duration: SCENE_MS });
    const crater = this.stage.gfx();
    crater.fillStyle(0x55585f, 1);
    crater.fillCircle(0, 0, 22);
    crater.lineStyle(3, 0xff5d5d, 1);
    crater.strokeCircle(0, 0, 32);
    crater.setPosition(WIDTH / 2 + 30, 130);
    this.tweens.add({ targets: crater, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    const mark = this.stage.text(WIDTH / 2 + 30, 66, "?", { size: UI.huge, origin: 0.5, color: TEXT.accent });
    this.tweens.add({ targets: mark, y: 60, duration: 500, yoyo: true, repeat: -1 });
    this.say("A mystery crater on the far side!");
  }

  // 3. You are picked.
  scenePicked() {
    this.starfield("s3");
    const spot = this.stage.gfx();
    spot.fillStyle(0xfff3a0, 0.15);
    spot.fillTriangle(WIDTH / 2, 0, WIDTH / 2 - 90, 250, WIDTH / 2 + 90, 250);
    if (this.textures.exists("astro-walk-1")) {
      const astro = this.stage.add(this.add.sprite(WIDTH / 2, 190, "astro-walk-1").setScale(3));
      this.tweens.add({ targets: astro, y: 184, duration: 600, yoyo: true, repeat: -1 });
    }
    const badge = this.stage.text(WIDTH / 2, 70, "YOU!", { size: UI.huge, origin: 0.5, color: TEXT.accent });
    this.tweens.add({ targets: badge, scale: { from: 0.2, to: 1 }, duration: 600, ease: "Back.easeOut" });
    this.say("You are picked to go and find out.");
  }

  // 4. Lift-off.
  sceneLaunch() {
    this.starfield("s4");
    const ground = this.stage.gfx();
    ground.fillStyle(0x2c4a3a, 1);
    ground.fillRect(0, GROUND_Y - 10, WIDTH, HEIGHT);
    const ship = this.stage.gfx();
    const smoke = this.stage.gfx();
    const pos = { y: GROUND_Y - 10 };
    const count = this.stage.text(WIDTH / 2, 90, "3", { size: 80, origin: 0.5, color: TEXT.accent });
    this.say("3... 2... 1... LIFT-OFF!");
    ["3", "2", "1"].forEach((n, i) => this.time.delayedCall(i * 700, () => { count.setText(n); sfx("tick"); }));
    this.time.delayedCall(2100, () => {
      count.setText("GO!");
      sfx("engine");
      this.cameras.main.shake(800, 0.01);
      this.tweens.add({ targets: pos, y: -120, duration: 2800, ease: "Quad.easeIn" });
    });
    const puffs = [];
    this.updateFn = () => {
      if (!ship.scene) return;
      ship.clear();
      drawShip(ship, WIDTH / 2, pos.y, { flame: pos.y < GROUND_Y - 12, door: false });
      if (pos.y < GROUND_Y - 12 && puffs.length < 60) puffs.push({ x: WIDTH / 2 + Phaser.Math.Between(-30, 30), y: GROUND_Y - 12, r: 6 });
      smoke.clear();
      smoke.fillStyle(0xdfe7f2, 0.5);
      for (const p of puffs) {
        p.r += 0.4;
        p.x += (p.x - WIDTH / 2) * 0.02;
        smoke.fillCircle(p.x, p.y, p.r);
      }
    };
    this.events.on("update", this.updateFn);
  }

  // 5. The trip to the Moon.
  sceneFlight() {
    const stars = this.starfield("s5");
    this.tweens.add({ targets: stars, x: -60, duration: SCENE_MS });
    const earth = this.planet(60, 260, 50, PALETTE.earth, 0x2f6f99);
    const moon = this.planet(590, 90, 36, 0xcfd6e4, 0x8a8d94);
    this.tweens.add({ targets: earth, x: 20, duration: SCENE_MS });
    this.tweens.add({ targets: moon, scale: 1.4, duration: SCENE_MS });
    const ship = this.stage.gfx();
    drawShip(ship, 0, 0, { flame: true, door: false });
    ship.setScale(0.5).setAngle(55).setPosition(120, 230);
    this.tweens.add({ targets: ship, x: 520, y: 110, duration: SCENE_MS - 400, ease: "Sine.easeInOut" });
    const trail = this.stage.gfx();
    this.time.addEvent({ delay: 120, repeat: 40, callback: () => { trail.fillStyle(PALETTE.accent, 0.6); trail.fillRect(ship.x - 14, ship.y + 10, 2, 2); } });
    this.say("Three days later, the Moon is close.");
  }

  // 6. Arrival and the goal.
  sceneArrive() {
    drawStars(this, { seed: "story-end", maxY: GROUND_Y - 30 });
    const hills = drawHills(this, { seed: "story-hills" });
    const ground = drawGround(this, { seed: "story-ground", dark: true });
    for (const obj of [hills, ground]) if (obj) this.stage.add(obj);
    const ship = this.stage.gfx();
    const pos = { y: -40 };
    this.tweens.add({
      targets: pos, y: GROUND_Y, duration: 2400, ease: "Cubic.easeOut",
      onUpdate: () => { ship.clear(); drawShip(ship, 200, pos.y, { flame: pos.y < GROUND_Y - 4 }); },
    });
    const goals = ["BUILD A BASE.", "STAY SAFE.", "FIND THE CRATER!"];
    goals.forEach((line, i) => {
      const text = this.stage.text(440, 90 + i * 40, line, { size: UI.title, origin: 0.5, color: i === 2 ? TEXT.accent : TEXT.white }).setAlpha(0);
      this.tweens.add({ targets: text, alpha: 1, duration: 400, delay: 900 + i * 700 });
    });
    this.say("Your mission starts now.");
  }

  finish() {
    if (this.done) return;
    this.done = true;
    markSeen("story");
    this.timer?.remove();
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start(this.next));
  }
}
