import Phaser from "phaser";
import { GROUND_Y, PALETTE, TEXT, WIDTH } from "../constants.js";
import { ITEMS } from "../sim/buildings.js";
import { drawCeres, drawRover } from "../ui/art.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

/**
 * The Phase 2 gate. Shown over the outpost the moment all six buildings
 * stand: the rover blueprint unlocks. Started with { onDone }.
 */
export class RoverBuild extends Phaser.Scene {
  constructor() {
    super("RoverBuild");
  }

  init(data) {
    this.onDone = data.onDone;
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    const state = this.registry.get("state");
    const L = new Layer(this, { depth: 600, keys: true });
    L.dim(0.75);
    L.panel(90, 70, 460, 210, { edge: PALETTE.good, alpha: 1 });
    L.text(WIDTH / 2, 84, "PHASE 2", { size: 24, color: TEXT.good, origin: 0.5 });
    L.text(WIDTH / 2, 116, "BUILD THE ROVER", { size: 16, color: TEXT.accent, origin: 0.5 });
    const g = L.gfx();
    drawRover(g, 200, 250);
    drawCeres(g, 130, 250);
    const packed = state.buildings.rover.packed;
    const daysLeft = state.totalDays - state.day + 1;
    const body = packed
      ? `All six buildings are standing! The rover site at the far right end of the base is unlocked.\n\nIt takes ${ITEMS.rover.buildDays} days to build. Days left: ${daysLeft}. Weather can still slow it, and the crew still needs air, water and food.`
      : "All six buildings are standing! But no rover blueprint was packed, so the crew cannot reach the craters. Keep the base running until the mission ends.";
    L.text(250, 146, body, { wrap: 284 });
    sfx("win");
    const button = L.button(WIDTH / 2, 262, "GOT IT", () => {
      const done = this.onDone;
      this.scene.stop();
      done?.();
    }, { w: 110, key: "ENTER" });
    L.focusFirst(button);
    void GROUND_Y;
  }
}
