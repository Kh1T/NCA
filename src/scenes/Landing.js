import Phaser from "phaser";
import { GROUND_Y, PALETTE, TEXT, WIDTH } from "../constants.js";
import { drawCeres, drawShip } from "../ui/art.js";
import { drawEarth, drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const SHIP_X = 150;

/** Short landing cutscene, then Ceres the robot gives the briefing. */
export class Landing extends Phaser.Scene {
  constructor() {
    super("Landing");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.state = this.registry.get("state");
    this.step = 0;
    drawStars(this, { seed: "landing", maxY: GROUND_Y - 30 });
    drawEarth(this, 560, 54);
    drawHills(this, { seed: "landing-hills" });
    drawGround(this, { seed: "landing-ground" });

    this.ship = this.add.graphics();
    this.shipY = 40;
    this.dust = this.add.graphics();
    this.layer = new Layer(this, { depth: 10, keys: true });
    this.caption = this.layer.text(WIDTH / 2, 20, "", { origin: 0.5, wrap: 560, align: "center" });
    this.sub = this.layer.text(WIDTH / 2, 62, "", { origin: 0.5, wrap: 560, align: "center", color: TEXT.accent });
    this.skip = this.layer.button(572, 340, "SKIP >", () => this.finish(), { w: 96, key: "ESCAPE" });
    this.layer.focus.hotkey("ENTER", () => this.advance());
    this.layer.focus.hotkey("SPACE", () => this.advance());
    this.input.on("pointerdown", (pointer, over) => {
      if (over.length === 0) this.advance();
    });

    this.caption.setText("Coming in to land...");
    this.tweens.add({
      targets: this,
      shipY: GROUND_Y,
      duration: 2600,
      ease: "Sine.easeOut",
      onUpdate: () => this.drawShip(true),
      onComplete: () => {
        this.drawShip(false);
        this.kickDust();
        sfx("done");
        this.landed = true;
        this.advance();
      },
    });
    this.drawShip(true);
  }

  drawShip(flame) {
    this.ship.clear();
    drawShip(this.ship, SHIP_X, this.shipY, { flame });
  }

  kickDust() {
    // With no air, lunar dust flies out in clean arcs and drops straight back.
    const puffs = [];
    for (let i = 0; i < 26; i += 1) {
      puffs.push({ x: SHIP_X, y: GROUND_Y - 2, vx: Phaser.Math.Between(-90, 90), vy: Phaser.Math.Between(-70, -10) });
    }
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1400,
      onUpdate: (tween) => {
        const t = tween.getValue() * 1.4;
        this.dust.clear();
        this.dust.fillStyle(PALETTE.regolithLight, 1 - tween.getValue());
        for (const p of puffs) {
          const y = Math.min(GROUND_Y - 1, p.y + p.vy * t + 60 * t * t);
          this.dust.fillRect(p.x + p.vx * t, y, 2, 2);
        }
      },
      onComplete: () => this.dust.clear(),
    });
  }

  advance() {
    if (!this.landed || this.done) return;
    this.step += 1;
    sfx("tick");
    if (this.step === 1) {
      this.caption.setText("TOUCHDOWN!\nThe sky is black, even in daylight. The Moon has no air, so there is no blue haze.");
      this.sub.setText("");
    } else if (this.step === 2) {
      this.caption.setText("Radio waves need time to cross space.\nHere on the near side, Earth hears you after:");
      this.sub.setText("0.0 seconds");
      this.tweens.addCounter({ from: 0, to: 1.3, duration: 1300, onUpdate: (tween) => this.step === 2 && this.sub.setText(`${tween.getValue().toFixed(1)} seconds, one way`) });
    } else if (this.step === 3) {
      this.caption.setText("Your target is on the FAR SIDE, which never faces Earth. No direct radio line there!");
      this.sub.setText("A relay satellite passes messages around the Moon.\nChina's Chang'e-4 lander used one in 2019.");
    } else if (this.step === 4) {
      this.showBriefing();
    } else {
      this.finish();
    }
  }

  showBriefing() {
    this.caption.setText("");
    this.sub.setText("");
    const g = this.layer.gfx();
    drawCeres(g, 236, GROUND_Y);
    this.layer.panel(60, 96, 520, 132, { edge: PALETTE.accent });
    this.layer.text(76, 108, "CERES, YOUR HELPER ROBOT", { color: TEXT.accent });
    const days = this.state?.totalDays ?? 7;
    this.layer.text(
      76,
      126,
      `Goal: build 6 buildings, then the rover, by Day ${days}. Then drive to the far side and photograph 5 craters.\n\nThe ship only has air, water and food for a few days. Only 3 things can be built at once, so choose well!`,
      { wrap: 488 },
    );
    this.skip.setLabel("START DAY 1");
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.scene.start("Outpost");
  }
}
