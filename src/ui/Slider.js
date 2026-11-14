import { PALETTE, TEXT } from "../constants.js";
import { sfx } from "./sfx.js";

/**
 * A stepped slider drawn as a row of boxes ("pips"). Click a box, press the
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
    this.pip = o.pip ?? 12;
    this.limit = o.limit ?? (() => this.max);
    this.onChange = o.onChange ?? (() => {});
    this.focused = false;
    this.enabled = true;

    const size = this.pip;
    this.minus = layer.text(o.x, o.y + 2, "-", { color: TEXT.accent });
    this.g = layer.gfx();
    this.plus = layer.text(o.x + 14 + this.max * (size + 2) + 4, o.y + 2, "+", { color: TEXT.accent });
    this.hits = [];
    for (let i = 0; i < this.max; i += 1) {
      const hit = layer.rect(o.x + 14 + i * (size + 2), o.y, size, size, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      // Clicking the last filled box empties it, so every value can be reached.
      hit.on("pointerdown", () => this.set(this.value === i + 1 ? i : i + 1));
      this.hits.push(hit);
    }
    for (const [label, step] of [[this.minus, -1], [this.plus, 1]]) {
      label.setInteractive({ useHandCursor: true });
      label.on("pointerdown", () => this.adjust(step));
    }
    if (layer.focus) layer.focus.add(this);
    this.draw();
  }

  get width() {
    return 14 + this.max * (this.pip + 2) + 14;
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
    this.g.clear();
    for (let i = 0; i < this.max; i += 1) {
      const px = this.x + 14 + i * (size + 2);
      this.g.fillStyle(i < this.value ? this.color : 0x232a36, 1);
      this.g.fillRect(px, this.y, size, size);
    }
    if (this.focused && this.max > 0) {
      this.g.lineStyle(1, 0xffffff, 1);
      this.g.strokeRect(this.x + 12, this.y - 2, this.max * (size + 2) + 2, size + 4);
    }
  }
}
