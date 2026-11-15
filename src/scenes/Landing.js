import Phaser from "phaser";
import { GROUND_Y, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { drawShip } from "../ui/art.js";
import { drawEarth, drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const SHIP_X = 200;

/**
 * The animated landing: the ship drops in on its thrusters, dust sprays out,
 * a thud, and the crew climbs out. One line of text. Skippable at any time.
 */
export class Landing extends Phaser.Scene {
  constructor() {
    super("Landing");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.done = false;
    drawStars(this, { seed: "landing", maxY: GROUND_Y - 30 });
    drawEarth(this, 540, 64);
    drawHills(this, { seed: "landing-hills" });
    drawGround(this, { seed: "landing-ground" });

    this.ship = this.add.graphics();
    this.shipY = -40;
    this.flame = this.add.graphics();
    this.dust = this.add.graphics();
    this.layer = new Layer(this, { depth: 10, keys: true });
    this.caption = this.layer.text(WIDTH / 2, 40, "", { origin: 0.5, size: UI.title, color: TEXT.accent });
    this.skip = this.layer.button(572, 336, "SKIP", () => this.finish(), { w: 104, h: 36, key: "ESCAPE", icon: "play" });
    this.layer.focus.hotkey("ENTER", () => this.finish());
    this.layer.focus.hotkey("SPACE", () => this.finish());

    sfx("engine");
    this.tweens.add({
      targets: this,
      shipY: GROUND_Y,
      duration: 3000,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => this.drawShip(1 - tween.progress * 0.6),
      onComplete: () => this.touchdown(),
    });
    this.drawShip(1);
  }

  drawShip(thrust) {
    this.ship.clear();
    drawShip(this.ship, SHIP_X, this.shipY, { flame: false });
    // Flickering thruster flame, shorter as the ship slows down.
    this.flame.clear();
    if (thrust <= 0) return;
    const len = (14 + Math.random() * 8) * thrust;
    this.flame.fillStyle(0xffb347, 1);
    this.flame.fillTriangle(SHIP_X - 8, this.shipY - 6, SHIP_X + 8, this.shipY - 6, SHIP_X, this.shipY - 6 + len * 1.6);
    this.flame.fillStyle(0xfff3a0, 1);
    this.flame.fillTriangle(SHIP_X - 4, this.shipY - 6, SHIP_X + 4, this.shipY - 6, SHIP_X, this.shipY - 6 + len);
    // Dust starts blowing before the legs touch the ground.
    if (GROUND_Y - this.shipY < 60) this.puff(2);
  }

  puff(count) {
    this.puffs ??= [];
    for (let i = 0; i < count; i += 1) {
      this.puffs.push({ x: SHIP_X, y: GROUND_Y - 2, vx: Phaser.Math.Between(-110, 110), vy: Phaser.Math.Between(-60, -10), t: 0 });
    }
  }

  touchdown() {
    this.flame.clear();
    this.drawShip(0);
    this.puff(30);
    sfx("thud");
    this.cameras.main.shake(260, 0.012);
    this.caption.setText("TOUCHDOWN!");
    this.tweens.add({ targets: this.caption, scale: { from: 1.6, to: 1 }, duration: 400, ease: "Back.easeOut" });

    // The crew climbs out and walks to the right.
    this.time.delayedCall(700, () => {
      if (!this.textures.exists("astro-walk-1")) return;
      [0, 1, 2].forEach((i) => {
        const astro = this.add.sprite(SHIP_X, GROUND_Y - 22, "astro-walk-1").setAlpha(0);
        this.tweens.add({ targets: astro, alpha: 1, delay: i * 450, duration: 200 });
        this.tweens.add({
          targets: astro,
          x: SHIP_X + 90 + i * 50,
          delay: i * 450,
          duration: 1400,
          onStart: () => astro.play("astro-walk"),
          onComplete: () => astro.anims.stop(),
        });
      });
    });
    this.time.delayedCall(1600, () => this.caption.setText("WELCOME TO THE MOON!"));
    this.time.delayedCall(4200, () => this.finish());
  }

  update(time, delta) {
    if (!this.puffs?.length) return;
    // With no air, moon dust flies in clean arcs and drops straight back.
    const dt = delta / 1000;
    this.dust.clear();
    this.dust.fillStyle(PALETTE.regolithLight, 1);
    this.puffs = this.puffs.filter((p) => {
      p.t += dt;
      const y = p.y + p.vy * p.t + 60 * p.t * p.t;
      if (y > GROUND_Y || p.t > 1.6) return false;
      this.dust.fillRect(p.x + p.vx * p.t, y, 2, 2);
      return true;
    });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(260, () => this.scene.start("Outpost"));
  }
}
