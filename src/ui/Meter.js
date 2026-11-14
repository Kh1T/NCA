import { TEXT } from "../constants.js";
import { ICON_COLOR, drawIcon } from "./icons.js";

/**
 * One resource bar: icon, short label, bar and value. Only a bar that is in
 * danger flashes, so a child can see at a glance which one needs help.
 */
export class Meter {
  /**
   * @param {import('./kit.js').Layer} layer
   * @param {{id: string, label: string, x: number, y: number, width?: number, onInfo?: Function}} o
   */
  constructor(layer, o) {
    this.layer = layer;
    this.scene = layer.scene;
    this.id = o.id;
    this.x = o.x;
    this.y = o.y;
    this.barX = o.x + 16;
    this.barW = (o.width ?? 100) - 18;
    this.color = ICON_COLOR[o.id] ?? 0xffffff;

    this.icon = layer.gfx();
    drawIcon(this.icon, o.id, o.x, o.y + 2);
    this.label = layer.text(this.barX, o.y, o.label, { color: TEXT.muted });
    this.bar = layer.gfx();
    this.value = layer.text(o.x + (o.width ?? 100) - 2, o.y, "", { origin: 1 });
    this.danger = false;
    this.pulsing = false;

    if (o.onInfo) {
      const hit = layer.rect(o.x - 2, o.y - 2, o.width ?? 100, 24, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => o.onInfo(o.id));
    }
  }

  /** @param {number} value @param {number} max @param {{text?: string, danger?: boolean}} [o] */
  set(value, max, o = {}) {
    const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
    const danger = Boolean(o.danger);
    this.bar.clear();
    this.bar.fillStyle(0x232a36, 1);
    this.bar.fillRect(this.barX, this.y + 11, this.barW, 7);
    this.bar.fillStyle(danger ? 0xff5d5d : this.color, 1);
    this.bar.fillRect(this.barX, this.y + 11, Math.round(this.barW * share), 7);
    // A notch pattern in danger, so the warning does not rely on colour alone.
    if (danger) {
      this.bar.fillStyle(0x05060a, 1);
      for (let nx = this.barX + 3; nx < this.barX + this.barW * share; nx += 6) this.bar.fillRect(nx, this.y + 11, 2, 7);
    }
    this.value.setText(o.text ?? String(Math.round(value * 10) / 10));
    this.value.setColor(danger ? TEXT.danger : TEXT.white);
    if (danger !== this.danger) {
      this.danger = danger;
      this.flash(danger);
    }
  }

  flash(on) {
    this.flashTween?.stop();
    this.flashTween = null;
    for (const obj of [this.icon, this.bar, this.value]) obj.setAlpha(1);
    if (on) {
      this.flashTween = this.scene.tweens.add({ targets: [this.icon, this.bar, this.value], alpha: 0.3, duration: 380, yoyo: true, repeat: -1 });
    }
  }

  /** Gentle pulse used by the guide line to point at this meter. */
  pulse(on) {
    if (on === this.pulsing) return;
    this.pulsing = on;
    this.pulseTween?.stop();
    this.label.setColor(on ? TEXT.accent : TEXT.muted);
    this.label.setAlpha(1);
    if (on) this.pulseTween = this.scene.tweens.add({ targets: this.label, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });
  }
}
