// The alerts that are answered with a control instead of a timed game:
// switches, sliders, and the wait-or-decide radio call.

import { PALETTE, TEXT } from "../constants.js";
import { ICON_COLOR } from "../ui/icons.js";
import { sfx } from "../ui/sfx.js";
import { Slider } from "../ui/Slider.js";
import { Toggle } from "../ui/Toggle.js";

const optionById = (def, id) => def.options.find((option) => option.id === id);

/** Long shadow: pick which modules stay alive on battery. */
export class NightSwitches {
  constructor(scene, layer, area, ctx, done) {
    const { def, state } = ctx;
    const hasGreenhouse = state.buildings.greenhouse.status === "done";
    let greenhouse = true;
    let building = true;
    layer.text(area.x, area.y, "PICK WHAT STAYS ON BATTERY FOR 2 DAYS", { color: TEXT.accent });
    layer.text(area.x, area.y + 24, "GREENHOUSE LIGHTS", {});
    layer.text(area.x, area.y + 50, "BUILDING CREW", {});
    layer.text(area.x, area.y + 76, "LIFE SUPPORT", {});
    layer.text(area.x + 180, area.y + 76, "ALWAYS ON", { color: TEXT.good });
    const cost = layer.text(area.x, area.y + 100, "", { wrap: area.w, color: "#ffb347" });
    const pick = () => (greenhouse && building ? "all-on" : !greenhouse && !building ? "both-off" : greenhouse ? "build-off" : "greenhouse-off");
    const show = () => cost.setText(`COST: ${optionById(def, pick()).costText}.`);
    const first = new Toggle(layer, { x: area.x + 180, y: area.y + 20, value: true, onChange: (value) => { greenhouse = value; show(); } });
    new Toggle(layer, { x: area.x + 180, y: area.y + 46, value: true, onChange: (value) => { building = value; show(); } });
    if (!hasGreenhouse) layer.text(area.x + 270, area.y + 24, "(NOT BUILT YET)", { color: "#4c5566" });
    show();
    layer.button(area.x + area.w - 60, area.y + 138, "CONFIRM", () => done({ option: pick() }), { w: 112, key: "ENTER" });
    layer.focus.focusItem(first);
  }
}

/** Temperature swing: more heat keeps work going, but costs power. */
export class HeatSlider {
  constructor(scene, layer, area, ctx, done) {
    const { def, state } = ctx;
    layer.text(area.x, area.y, "SET THE HEATERS (LEFT / RIGHT)", { color: TEXT.accent });
    const max = Math.min(3, Math.floor(state.power));
    const cost = layer.text(area.x, area.y + 62, "", { wrap: area.w, color: "#ffb347" });
    const name = layer.text(area.x + 120, area.y + 30, "", {});
    const show = (value) => {
      const option = optionById(def, `heat${value}`);
      name.setText(option.label.toUpperCase());
      cost.setText(`COST: ${option.costText}.`);
    };
    const slider = new Slider(layer, { x: area.x, y: area.y + 24, max: 3, value: Math.min(2, max), color: PALETTE.danger, pip: 20, limit: () => max, onChange: show });
    show(slider.value);
    if (max < 3) layer.text(area.x, area.y + 96, `Only ${max} power stored, so that is the most heat you can run.`, { wrap: area.w, color: TEXT.muted });
    layer.button(area.x + area.w - 60, area.y + 138, "CONFIRM", () => done({ option: `heat${slider.value}` }), { w: 112, key: "ENTER" });
    layer.focus.focusItem(slider);
  }
}

/** Sick plants: extra water helps them, but water is needed for oxygen too. */
export class PlantBalance {
  constructor(scene, layer, area, ctx, done) {
    const { def, state } = ctx;
    layer.text(area.x, area.y, "HOW MUCH EXTRA WATER FOR THE PLANTS?", { color: TEXT.accent });
    const max = Math.min(3, Math.floor(state.water / 0.3));
    const cost = layer.text(area.x, area.y + 62, "", { wrap: area.w - 110, color: "#ffb347" });
    const name = layer.text(area.x + 120, area.y + 30, "", {});
    const plant = layer.gfx();
    const show = (value) => {
      const option = optionById(def, `water${value}`);
      name.setText(option.label.toUpperCase());
      cost.setText(`COST: ${option.costText}.\nWater you have: ${state.water.toFixed(1)}`);
      // The plant stands taller the more water it gets.
      plant.clear();
      const px = area.x + area.w - 60;
      const py = area.y + 120;
      plant.fillStyle(0x6a4a2c, 1);
      plant.fillRect(px - 16, py, 32, 8);
      plant.fillStyle(value >= 2 ? ICON_COLOR.food : 0xb7a24a, 1);
      const height = 16 + value * 12;
      plant.fillRect(px - 2, py - height, 4, height);
      const droop = (3 - value) * 5;
      plant.fillRect(px - 14, py - height + droop, 12, 5);
      plant.fillRect(px + 2, py - height + 6 + droop, 12, 5);
    };
    const slider = new Slider(layer, { x: area.x, y: area.y + 24, max: 3, value: Math.min(2, max), color: ICON_COLOR.water, pip: 20, limit: () => max, onChange: show });
    show(slider.value);
    layer.button(area.x + area.w - 60, area.y + 138, "CONFIRM", () => done({ option: `water${slider.value}` }), { w: 112, key: "ENTER" });
    layer.focus.focusItem(slider);
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
    layer.text(area.x, area.y, "VALVE A OR VALVE B? EARTH KNOWS. YOU ARE NOT SURE.", { color: TEXT.accent });
    const half = area.w / 2;
    const waitCost = antenna ? "1 power (the big antenna is fast)" : optionById(def, "wait").costText;
    layer.panel(area.x, area.y + 18, half - 8, 96);
    layer.panel(area.x + half + 8, area.y + 18, half - 8, 96);
    layer.text(area.x + half / 2, area.y + 62, `COST: ${waitCost}`, { origin: 0.5, wrap: half - 32, align: "center", color: "#ffb347" });
    layer.text(area.x + half + half / 2 + 4, area.y + 62, `COST: ${optionById(def, "guess").costText}`, { origin: 0.5, wrap: half - 32, align: "center", color: "#ffb347" });
    const status = layer.text(area.x, area.y + 122, "", { wrap: area.w, color: TEXT.good });
    const signal = layer.gfx();

    let busy = false;
    const wait = layer.button(area.x + half / 2 - 4, area.y + 38, "1: ASK EARTH", () => {
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
          signal.fillStyle(0x232a36, 1);
          signal.fillRect(area.x, area.y + 138, area.w - 130, 2);
          signal.fillStyle(PALETTE.accent, 1);
          signal.fillRect(area.x + there * (area.w - 140), area.y + 135, 8, 8);
          status.setText(t < 0.5 ? "Question on its way to Earth..." : "Answer on its way back...");
        },
        onComplete: () => {
          sfx("good");
          done({ option: "wait" });
        },
      });
    }, { w: half - 48, h: 24, key: "1" });
    layer.button(area.x + half + half / 2 + 4, area.y + 38, "2: DECIDE NOW", () => {
      if (busy) return;
      busy = true;
      done({ option: "guess" });
    }, { w: half - 48, h: 24, key: "2" });
    layer.focus.focusItem(wait);
  }
}
