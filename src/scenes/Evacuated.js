import Phaser from "phaser";
import { GROUND_Y, TEXT, UI, WIDTH } from "../constants.js";
import { drawShip } from "../ui/art.js";
import { drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { drawChips } from "../ui/chips.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { sfx, playMusic } from "../ui/sfx.js";

const REASON = {
  air: ["air", "The clean air ran out."],
  oxygen: ["oxygen", "The oxygen ran out."],
  water: ["water", "No water for two days."],
  food: ["food", "No food for two days."],
  dose: ["dose", "Too much radiation."],
  timer: ["cold", "Time ran out in the cold."],
};

/** The soft ending: nobody dies. The crew lifts off and retreats to the ISS. */
export class Evacuated extends Phaser.Scene {
  constructor() {
    super("Evacuated");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    const state = this.registry.get("state");
    drawStars(this, { seed: "evac", maxY: GROUND_Y - 20 });
    playMusic("menu");
    drawHills(this, { seed: "evac-hills" });
    drawGround(this, { seed: "evac-ground" });

    const ship = this.add.graphics();
    const pos = { y: GROUND_Y };
    const draw = () => {
      ship.clear();
      drawShip(ship, WIDTH / 2, pos.y, { flame: pos.y < GROUND_Y, door: false });
    };
    draw();
    this.tweens.add({ targets: pos, y: -120, duration: 3600, delay: 900, ease: "Quad.easeIn", onUpdate: draw, onStart: () => sfx("engine") });

    const L = new Layer(this, { depth: 10, keys: true });
    L.text(WIDTH / 2, 16, "SENT HOME EARLY", { size: UI.huge, color: TEXT.danger, origin: 0.5 });
    const [icon, reason] = REASON[state?.outcome?.cause] ?? ["warn", "The mission could not go on."];
    drawChips(L, 200, 76, [[icon, reason, TEXT.white]]);
    drawChips(L, 200, 106, [["crew", "EVERYONE IS SAFE ON THE ISS", TEXT.good]]);
    const button = L.button(WIDTH / 2, 336, "WHAT HAPPENED?", () => this.scene.start("Debrief"), { w: 220, h: 36, key: "ENTER", icon: "play" });
    L.focusFirst(button);
  }
}
