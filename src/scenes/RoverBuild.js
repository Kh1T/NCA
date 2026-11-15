import Phaser from "phaser";
import { PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { CORE, ITEMS } from "../sim/buildings.js";
import { drawChips } from "../ui/chips.js";
import { ITEM_ICON, drawIcon } from "../ui/icons.js";
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
    L.panel(80, 50, 480, 250, { edge: PALETTE.good, alpha: 1 });
    const title = L.text(WIDTH / 2, 58, "ALL 6 BUILT!", { size: UI.huge, color: TEXT.good, origin: 0.5 });
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: 500, ease: "Back.easeOut" });

    // Six ticks, one per building.
    const g = L.gfx();
    CORE.forEach((id, i) => {
      const x = 130 + i * 66;
      g.fillStyle(0x0b1018, 1);
      g.fillRect(x - 24, 118, 48, 48);
      drawIcon(g, ITEM_ICON[id], x - 12, 124, 2);
      drawIcon(g, "check", x + 8, 152, 1);
    });

    const packed = state.buildings.rover.packed;
    const daysLeft = state.totalDays - state.day + 1;
    if (packed) {
      drawIcon(g, "rover", 150, 182, 4);
      L.text(220, 186, "NOW BUILD THE ROVER!", { size: UI.big, color: TEXT.accent });
      drawChips(L, 220, 214, [["clock", `${ITEMS.rover.buildDays} DAYS`], ["calendar", `${daysLeft} DAYS LEFT`]]);
    } else {
      drawIcon(g, "cross", 150, 186, 3);
      L.text(200, 186, "No rover was packed.", { size: UI.big, color: TEXT.danger });
      L.text(200, 214, "Keep the base running to the end!", { color: TEXT.muted });
    }
    sfx("win");
    const button = L.button(WIDTH / 2, 272, "GOT IT", () => {
      const done = this.onDone;
      this.scene.stop();
      done?.();
    }, { w: 140, h: 36, key: "ENTER", icon: "check" });
    L.focusFirst(button);
  }
}
