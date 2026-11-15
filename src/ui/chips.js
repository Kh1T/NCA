import { TEXT, UI } from "../constants.js";
import { drawIcon } from "./icons.js";

/** Which icon and short value show each kind of alert cost. */
const COST_ICON = {
  power: "power", food: "food", water: "water", oxygen: "oxygen", air: "air",
  buildDays: "clock", dose: "dose", output: "broken", sun: "sun", risk: "question",
};

function costValue(key, amount) {
  if (key === "buildDays") return amount >= 1 ? `-${amount} DAY${amount > 1 ? "S" : ""}` : "-½ DAY";
  if (key === "dose") return "MORE";
  if (key === "output" || key === "sun") return "HALF";
  if (key === "risk") return "RISK";
  return `-${amount}`;
}

/** Turn an alert option's `cost` object into [icon, text] chips. */
export function costChips(cost = {}) {
  return Object.entries(cost)
    .filter(([key, amount]) => COST_ICON[key] && amount)
    .map(([key, amount]) => [COST_ICON[key], costValue(key, amount)]);
}

/**
 * Draw a row of [icon, text] chips starting at x, y (top-left). Wraps to a new
 * row if `maxWidth` is given. Returns {width, height}.
 */
export function drawChips(layer, x, y, chips, o = {}) {
  const g = layer.gfx();
  const size = o.size ?? UI.big;
  const color = o.color ?? TEXT.white;
  const gap = o.gap ?? 12;
  const iconScale = o.iconScale ?? 1.5;
  const iconW = 12 * iconScale;
  let cx = x;
  let cy = y;
  let widest = 0;
  for (const [icon, label, chipColor] of chips) {
    const text = layer.text(0, 0, label, { size, color: chipColor ?? color });
    const w = iconW + 4 + text.width;
    if (o.maxWidth && cx > x && cx + w > x + o.maxWidth) {
      cx = x;
      cy += Math.max(iconW, size) + 6;
    }
    drawIcon(g, icon, cx, cy + (size - iconW) / 2 + 1, iconScale);
    text.setPosition(cx + iconW + 4, cy - 1);
    cx += w + gap;
    widest = Math.max(widest, cx - gap - x);
  }
  return { width: widest, height: cy - y + Math.max(iconW, size) };
}

/** What each building makes and needs, as [icon, label] chips. */
export const ITEM_MAKES = {
  solar: [["power", "POWER"]], water: [["water", "WATER"]], oxygen: [["oxygen", "OXYGEN"]], air: [["air", "CLEAN AIR"]],
  greenhouse: [["food", "FOOD"]], shield: [["shield", "SAFER WORK"]], rover: [["camera", "PHOTOS"]], antenna: [["science", "x2 SCIENCE"]],
  battery: [["battery", "+8 STORAGE"]], spares: [["wrench", "1 QUICK FIX"]], foodpack: [["food", "+2 DAYS"]],
};
export const ITEM_NEEDS = {
  solar: [["sun", "SUN"]], water: [["power", "2"]], oxygen: [["power", "2"], ["water", "WATER"]], air: [["power", "1"]],
  greenhouse: [["power", "2"], ["water", "WATER"]], shield: [["build", "TIME"]], rover: [["check", "6 BUILDINGS"]],
  antenna: [["science", "SCIENCE POWER"]],
  battery: [["check", "NOTHING"]], spares: [["check", "NOTHING"]], foodpack: [["check", "NOTHING"]],
};

