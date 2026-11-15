// The alerts that are answered with a control instead of a timed game:
// switches, sliders, and the wait-or-decide radio call.

import { PALETTE, TEXT, UI } from "../constants.js";
import { costChips, drawChips } from "../ui/chips.js";
import { ICON_COLOR, drawIcon } from "../ui/icons.js";
import { Layer } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";
import { Slider } from "../ui/Slider.js";
import { Toggle } from "../ui/Toggle.js";

const optionById = (def, id) => def.options.find((option) => option.id === id);

/** A row of red cost chips that can be redrawn. */
function costRow(scene, x, y, maxWidth) {
  let layer = null;
  return (option) => {
    layer?.destroy();
    layer = new Layer(scene, { depth: 512 });
    layer.text(x, y, "COSTS", { color: "#ffb347" });
    drawChips(layer, x + 64, y - 1, costChips(option.cost).map(([i, t]) => [i, t, TEXT.danger]), { maxWidth: maxWidth - 64 });
    return layer;
  };
}

/** Long shadow: pick which modules stay alive on battery. */
export class NightSwitches {
  constructor(scene, layer, area, ctx, done) {
    const { def, state } = ctx;
    const hasGreenhouse = state.buildings.greenhouse.status === "done";
    let greenhouse = true;
    let building = true;
    layer.text(area.x, area.y, "WHAT STAYS ON FOR 2 DARK DAYS?", { color: TEXT.accent });
    const g = layer.gfx();
    const rows = [["food", "GREENHOUSE"], ["build", "BUILDING"], ["air", "LIFE SUPPORT"]];
    rows.forEach(([icon, label], i) => {
      drawIcon(g, icon, area.x, area.y + 30 + i * 36, 1.5);
      layer.text(area.x + 26, area.y + 28 + i * 36, label, { size: UI.big });
    });
    layer.text(area.x + 200, area.y + 100, "ALWAYS ON", { size: UI.big, color: TEXT.good });
    const pick = () => (greenhouse && building ? "all-on" : !greenhouse && !building ? "both-off" : greenhouse ? "build-off" : "greenhouse-off");
    const showCost = costRow(scene, area.x, area.y + 142, area.w - 150);
    this.costLayer = showCost(optionById(def, pick()));
    const update = () => { this.costLayer = showCost(optionById(def, pick())); };
    const first = new Toggle(layer, { x: area.x + 200, y: area.y + 26, value: true, onChange: (value) => { greenhouse = value; update(); } });
    new Toggle(layer, { x: area.x + 200, y: area.y + 62, value: true, onChange: (value) => { building = value; update(); } });
    if (!hasGreenhouse) layer.text(area.x + 320, area.y + 30, "(NOT BUILT YET)", { color: "#4c5566" });
    layer.button(area.x + area.w - 66, area.y + 150, "OK", () => done({ option: pick() }), { w: 120, h: 36, key: "ENTER", icon: "check" });
    layer.focus.focusItem(first);
  }

  destroy() {
    this.costLayer?.destroy();
  }
}

/** Temperature swing: more heat keeps work going, but costs power. */
export class HeatSlider {
  constructor(scene, layer, area, ctx, done) {
    const { def, state } = ctx;
    layer.text(area.x, area.y, "SET THE HEATERS", { color: TEXT.accent });
    const max = Math.min(3, Math.floor(state.power));
    const g = layer.gfx();
    drawIcon(g, "cold", area.x, area.y + 34, 1.5);
    const name = layer.text(area.x + 210, area.y + 32, "", { size: UI.big });
    const showCost = costRow(scene, area.x, area.y + 90, area.w - 150);
    const show = (value) => {
      const option = optionById(def, `heat${value}`);
      name.setText(option.label.toUpperCase());
      this.costLayer = showCost(option);
    };
    const slider = new Slider(layer, { x: area.x + 26, y: area.y + 32, max: 3, value: Math.min(2, max), color: PALETTE.danger, pip: 28, limit: () => max, onChange: show });
    drawIcon(g, "thermo", slider.x + slider.width + 6, area.y + 34, 1.5);
    show(slider.value);
    if (max < 3) drawChips(layer, area.x, area.y + 120, [["power", `ONLY ${max} POWER STORED`, TEXT.muted]], { size: UI.body });
    layer.button(area.x + area.w - 66, area.y + 150, "OK", () => done({ option: `heat${slider.value}` }), { w: 120, h: 36, key: "ENTER", icon: "check" });
    layer.focus.focusItem(slider);
  }

  destroy() {
    this.costLayer?.destroy();
  }
}

/** Sick plants: extra water helps them, but water is needed for oxygen too. */
export class PlantBalance {
  constructor(scene, layer, area, ctx, done) {
    const { def, state } = ctx;
    layer.text(area.x, area.y, "HOW MUCH EXTRA WATER?", { color: TEXT.accent });
    const max = Math.min(3, Math.floor(state.water / 0.3));
    const g = layer.gfx();
    drawIcon(g, "water", area.x, area.y + 34, 1.5);
    const name = layer.text(area.x + 210, area.y + 32, "", { size: UI.big });
    const have = drawChips(layer, area.x, area.y + 122, [["water", `YOU HAVE ${state.water.toFixed(1)}`, TEXT.muted]], { size: UI.body });
    void have;
    const plant = layer.gfx();
    const showCost = costRow(scene, area.x, area.y + 90, area.w - 150);
    const show = (value) => {
      const option = optionById(def, `water${value}`);
      name.setText(option.label.toUpperCase());
      this.costLayer = showCost(option);
      // The plant stands taller the more water it gets.
      plant.clear();
      const px = area.x + area.w - 60;
      const py = area.y + 100;
      plant.fillStyle(0x6a4a2c, 1);
      plant.fillRect(px - 18, py, 36, 10);
      plant.fillStyle(value >= 2 ? ICON_COLOR.food : 0xb7a24a, 1);
      const height = 18 + value * 14;
      plant.fillRect(px - 2, py - height, 5, height);
      const droop = (3 - value) * 6;
      plant.fillRect(px - 16, py - height + droop, 14, 6);
      plant.fillRect(px + 3, py - height + 8 + droop, 14, 6);
    };
    const slider = new Slider(layer, { x: area.x + 26, y: area.y + 32, max: 3, value: Math.min(2, max), color: ICON_COLOR.water, pip: 28, limit: () => max, onChange: show });
    show(slider.value);
    layer.button(area.x + area.w - 66, area.y + 150, "OK", () => done({ option: `water${slider.value}` }), { w: 120, h: 36, key: "ENTER", icon: "check" });
    layer.focus.focusItem(slider);
  }

  destroy() {
    this.costLayer?.destroy();
  }
}

/**
 * Earth calling: send the question and wait for the answer to travel there
 * and back, or decide right now. One real minute becomes one game second.
 */
export class CommsWait {
  constructor(scene, layer, area, ctx, done) {
    const { def, state } = ctx;
    const antenna = state.buildings.antenna.status === "done";
    this.scene = scene;
    layer.text(area.x, area.y, "VALVE A OR B? EARTH KNOWS THE ANSWER.", { color: TEXT.accent });
    const half = area.w / 2;
    layer.panel(area.x, area.y + 22, half - 8, 110);
    layer.panel(area.x + half + 8, area.y + 22, half - 8, 110);
    const waitChips = antenna ? [["power", "-1", TEXT.danger]] : costChips(optionById(def, "wait").cost).map(([i, t]) => [i, t, TEXT.danger]);
    layer.text(area.x + 12, area.y + 84, "COSTS", { color: "#ffb347" });
    drawChips(layer, area.x + 76, area.y + 83, waitChips);
    layer.text(area.x + half + 20, area.y + 84, "COSTS", { color: "#ffb347" });
    drawChips(layer, area.x + half + 84, area.y + 83, [["water", "MAYBE -1", TEXT.danger]]);
    const status = layer.text(area.x, area.y + 140, "", { color: TEXT.good });
    const signal = layer.gfx();

    let busy = false;
    const wait = layer.button(area.x + half / 2 - 4, area.y + 50, "ASK EARTH", () => {
      if (busy) return;
      busy = true;
      // The question goes up to the relay satellite and on to Earth, then back.
      scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: antenna ? 1300 : 2600,
        onUpdate: (tween) => {
          const t = tween.getValue();
          const there = t < 0.5 ? t * 2 : (1 - t) * 2;
          signal.clear();
          drawIcon(signal, "moon", area.x + 250, area.y + 140, 1.4);
          drawIcon(signal, "earth", area.x + area.w - 20, area.y + 140, 1.4);
          signal.fillStyle(0x232a36, 1);
          signal.fillRect(area.x + 272, area.y + 148, area.w - 296, 2);
          signal.fillStyle(PALETTE.accent, 1);
          signal.fillRect(area.x + 272 + there * (area.w - 304), area.y + 145, 8, 8);
          status.setText(t < 0.5 ? "SENDING..." : "ANSWER COMING BACK...");
        },
        onComplete: () => {
          sfx("good");
          done({ option: "wait" });
        },
      });
    }, { w: half - 48, h: 40, key: "1", icon: "dish" });
    layer.button(area.x + half + half / 2 + 4, area.y + 50, "DECIDE NOW", () => {
      if (busy) return;
      busy = true;
      done({ option: "guess" });
    }, { w: half - 48, h: 40, key: "2", icon: "question" });
    layer.focus.focusItem(wait);
  }
}
