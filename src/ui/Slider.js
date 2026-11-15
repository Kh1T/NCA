import { PALETTE } from "../constants.js";
import { sfx } from "./sfx.js";

const BTN = 26; // the - and + boxes

/**
 * A stepped slider drawn as a row of boxes ("pips"). Tap a box, tap the
 * - / + buttons, or use Left / Right when it has keyboard focus.
 * Whole steps are easier for young players than a free-sliding handle.
 */
export class Slider {
  /**
   * @param {import('./kit.js').Layer} layer
   * @param {{x: number, y: number, max: number, value?: number, color?: number, pip?: number,
   *          limit?: () => number, onChange?: (value: number) => void}} o
   */
  constructor(layer, o) {
    this.layer = layer;
    this.x = o.x;
    this.y = o.y;
    this.max = o.max;
    this.value = Math.min(o.value ?? 0, o.max);
    this.color = o.color ?? PALETTE.accent;
    this.pip = o.pip ?? 20;
    this.limit = o.limit ?? (() => this.max);
    this.onChange = o.onChange ?? (() => {});
    this.focused = false;
    this.enabled = true;

    const size = this.pip;
    const midY = o.y + size / 2;
    this.pipsX = o.x + BTN + 6;
    this.g = layer.gfx();
    this.hits = [];
    for (let i = 0; i < this.max; i += 1) {
      const hit = layer.rect(this.pipsX + i * (size + 3), o.y - 6, size + 3, size + 12, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      // Tapping the last filled box empties it, so every value can be reached.
      hit.on("pointerdown", () => this.set(this.value === i + 1 ? i : i + 1));
      this.hits.push(hit);
    }
    const plusX = this.pipsX + this.max * (size + 3) + 3;
    for (const [bx, step] of [[o.x, -1], [plusX, 1]]) {
      const hit = layer.rect(bx - 4, midY - BTN / 2 - 6, BTN + 8, BTN + 12, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.adjust(step));
    }
    this.plusX = plusX;
    if (layer.focus) layer.focus.add(this);
    this.draw();
  }

  get width() {
    return this.plusX + BTN - this.x;
  }

  set(value, silent = false) {
    const capped = Math.max(0, Math.min(this.max, this.limit(), Math.round(value)));
    if (capped !== value && !silent) sfx("deny");
    if (capped === this.value) return;
    this.value = capped;
    this.draw();
    if (!silent) {
      sfx("tick");
      this.onChange(this.value);
    }
  }

  adjust(step) {
    this.set(this.value + step);
  }

  activate() {
    this.adjust(1);
  }

  setFocus(value) {
    this.focused = value;
    this.draw();
  }

  isEnabled() {
    return this.enabled && this.max > 0;
  }

  draw() {
    const size = this.pip;
    const g = this.g;
    const midY = this.y + size / 2;
    g.clear();
    // - and + boxes
    for (const [bx, plus] of [[this.x, false], [this.plusX, true]]) {
      g.fillStyle(0x1a2230, 1);
      g.fillRect(bx, midY - BTN / 2, BTN, BTN);
      g.lineStyle(1, PALETTE.accent, 1);
      g.strokeRect(bx, midY - BTN / 2, BTN, BTN);
      g.fillStyle(PALETTE.accent, 1);
      g.fillRect(bx + 7, midY - 1, BTN - 14, 3);
      if (plus) g.fillRect(bx + BTN / 2 - 1, midY - BTN / 2 + 7, 3, BTN - 14);
    }
    for (let i = 0; i < this.max; i += 1) {
      const px = this.pipsX + i * (size + 3);
      g.fillStyle(i < this.value ? this.color : 0x232a36, 1);
      g.fillRect(px, this.y, size, size);
    }
    if (this.focused && this.max > 0) {
      g.lineStyle(2, 0xffffff, 1);
      g.strokeRect(this.x - 3, this.y - 4, this.width + 6, size + 8);
    }
  }
}
