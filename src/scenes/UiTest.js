import Phaser from "phaser";
import { TEXT } from "../constants.js";
import { startBuild } from "../sim/buildings.js";
import { createState } from "../sim/state.js";
import { BuildQueue } from "../ui/BuildQueue.js";
import { dataBadge } from "../ui/DataBadge.js";
import { ICON_COLOR } from "../ui/icons.js";
import { Layer, clearFocusFor, drawStars } from "../ui/kit.js";
import { Meter } from "../ui/Meter.js";
import { Slider } from "../ui/Slider.js";
import { Toggle } from "../ui/Toggle.js";
import { showTooltip } from "../ui/Tooltip.js";

/**
 * Developer screen that shows every reusable UI component in one place.
 * Open it with ?scene=UiTest in the address bar.
 */
export class UiTest extends Phaser.Scene {
  constructor() {
    super("UiTest");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    const L = new Layer(this, { keys: true });
    L.text(8, 8, "UI COMPONENTS", { size: 16, color: TEXT.accent });

    // Six resource bars. Air is in danger, so it is the only one flashing.
    const meters = [["power", "POWER", 6, 8], ["oxygen", "OXYGEN", 5, 10], ["air", "AIR", 1, 10], ["food", "FOOD", 7, 10], ["water", "WATER", 4.5, 10], ["shield", "SHIELD", 1, 3]];
    meters.forEach(([id, label, value, max], i) => {
      const meter = new Meter(L, { id, label, x: 5 + i * 106, y: 36, width: 102, onInfo: () => showTooltip(this, label, "A one-line explanation appears here.") });
      meter.set(value, max, { danger: id === "air" });
    });

    // Dose counter and stars.
    L.text(8, 70, "DOSE 3.2/22 mSv", {});
    const g = L.gfx();
    drawStars(g, 200, 74, 2, 3, 6);

    // Build queue with two slots in use.
    const state = createState({ packed: { solar: 1, water: 1, oxygen: 1, air: 1, greenhouse: 1, shield: 1, rover: 1 } });
    startBuild(state, "solar");
    startBuild(state, "oxygen");
    state.buildings.oxygen.daysLeft = 1;
    new BuildQueue(L, { x: 8, y: 104 }).update(state);

    // Four power sliders that share one budget.
    const budget = 9;
    const values = { life: 5, greenhouse: 2, shield: 0, science: 1 };
    const keys = Object.keys(values);
    const left = L.text(330, 196, "", { color: TEXT.muted });
    const show = () => left.setText(`LEFT: ${budget - keys.reduce((sum, key) => sum + values[key], 0)} of ${budget}`);
    keys.forEach((key, i) => {
      L.text(330, 103 + i * 22, key.toUpperCase(), {});
      new Slider(L, {
        x: 440, y: 100 + i * 22, max: key === "life" ? 5 : 3, value: values[key],
        color: [ICON_COLOR.oxygen, ICON_COLOR.food, ICON_COLOR.shield, ICON_COLOR.science][i],
        limit: () => budget - keys.reduce((sum, other) => sum + (other === key ? 0 : values[other]), 0),
        onChange: (value) => { values[key] = value; show(); },
      });
    });
    show();

    L.text(8, 150, "TOGGLE", { color: TEXT.muted });
    new Toggle(L, { x: 80, y: 146, value: true });
    L.text(8, 180, "TOOLTIP", { color: TEXT.muted });
    L.button(140, 184, "REGOLITH?", () => showTooltip(this, "Regolith", "The loose gray dust and rocks that cover the Moon.", 140, 200), { w: 100 });

    L.text(8, 226, "DATA BADGES", { color: TEXT.muted });
    dataBadge(L, 8, 240, { label: "Real X2.2 solar flare, 2024-05-09, NASA DONKI", real: true, url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" });
    dataBadge(L, 8, 276, { label: "Simplified from real lunar science", real: false });

    L.button(580, 340, "TITLE", () => this.scene.start("Title"), { w: 96, key: "ESCAPE" });
    L.focusFirst();
  }
}
