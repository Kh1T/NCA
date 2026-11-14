import { PALETTE, TEXT } from "../constants.js";
import { sfx } from "./sfx.js";

/** An ON / OFF switch. The knob position and the word both show the state. */
export class Toggle {
  /**
   * @param {import('./kit.js').Layer} layer
   * @param {{x: number, y: number, value?: boolean, onChange?: (value: boolean) => void}} o
   */
  constructor(layer, o) {
    this.layer = layer;
    this.x = o.x;
    this.y = o.y;
    this.value = o.value ?? true;
    this.onChange = o.onChange ?? (() => {});
    this.focused = false;
    this.enabled = true;

    this.g = layer.gfx();
    this.label = layer.text(o.x + 40, o.y + 3, "", {});
    const hit = layer.rect(o.x - 2, o.y - 2, 70, 18, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => this.activate());
    if (layer.focus) layer.focus.add(this);
    this.draw();
  }

  activate() {
    if (!this.enabled) {
      sfx("deny");
      return;
    }
    this.value = !this.value;
    sfx("click");
    this.draw();
    this.onChange(this.value);
  }

  adjust() {
    this.activate();
  }

  setFocus(value) {
    this.focused = value;
    this.draw();
  }

  isEnabled() {
    return this.enabled;
  }

  draw() {
    const g = this.g;
    g.clear();
    g.fillStyle(this.value ? 0x2c4a3a : 0x3a2530, 1);
    g.fillRect(this.x, this.y, 34, 14);
    g.lineStyle(this.focused ? 2 : 1, this.focused ? 0xffffff : this.value ? PALETTE.good : PALETTE.danger, 1);
    g.strokeRect(this.x, this.y, 34, 14);
    g.fillStyle(this.value ? PALETTE.good : PALETTE.danger, 1);
    g.fillRect(this.value ? this.x + 20 : this.x + 2, this.y + 2, 12, 10);
    this.label.setText(this.value ? "ON" : "OFF");
    this.label.setColor(this.value ? TEXT.good : TEXT.danger);
  }
}
