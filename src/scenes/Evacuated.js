import Phaser from "phaser";
import { GROUND_Y, TEXT, WIDTH } from "../constants.js";
import { drawShip } from "../ui/art.js";
import { drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { Layer, clearFocusFor } from "../ui/kit.js";

const REASON = {
  air: "The clean air ran out.",
  oxygen: "The oxygen ran out.",
  water: "There was no water for two days.",
  food: "There was no food for two days.",
  dose: "The crew reached the radiation limit.",
  timer: "Time ran out in the cold, away from the rover.",
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
    drawHills(this, { seed: "evac-hills" });
    drawGround(this, { seed: "evac-ground" });

    const ship = this.add.graphics();
    const pos = { y: GROUND_Y };
    const draw = () => {
      ship.clear();
      drawShip(ship, WIDTH / 2, pos.y, { flame: pos.y < GROUND_Y, door: false });
    };
    draw();
    this.tweens.add({ targets: pos, y: -120, duration: 3600, delay: 900, ease: "Quad.easeIn", onUpdate: draw });

    const L = new Layer(this, { depth: 10, keys: true });
    L.text(WIDTH / 2, 40, "EVACUATED", { size: 24, color: TEXT.danger, origin: 0.5 });
    L.text(WIDTH / 2, 76, "RETREAT TO THE ISS", { size: 16, color: TEXT.accent, origin: 0.5 });
    L.text(WIDTH / 2, 108, `${REASON[state?.outcome?.cause] ?? "The mission could not go on."}\nMission Control called the crew home early. Everyone is safe.`, { origin: 0.5, wrap: 520, align: "center" });
    const button = L.button(WIDTH / 2, 340, "SEE WHAT HAPPENED", () => this.scene.start("Debrief"), { w: 190, key: "ENTER" });
    L.focusFirst(button);
  }
}
