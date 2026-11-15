import { TEXT, UI } from "../constants.js";
import { ICON_COLOR, drawIcon } from "./icons.js";
import { sfx } from "./sfx.js";

/**
 * One resource bar: a big icon, the number and a bar. No words: the icon's
 * shape and colour say what it is, and tapping it opens the info card.
 * Only a bar in danger flashes, so a child sees at a glance what needs help.
 */
export class Meter {
  /**
   * @param {import('./kit.js').Layer} layer
   * @param {{id: string, x: number, y: number, width?: number, onInfo?: Function}} o
   */
  constructor(layer, o) {
    this.layer = layer;
    this.scene = layer.scene;
    this.id = o.id;
    this.x = o.x;
    this.y = o.y;
    const width = o.width ?? 100;
    this.barX = o.x + 24;
    this.barW = width - 26;
    this.color = ICON_COLOR[o.id] ?? 0xffffff;

    this.icon = layer.gfx();
    drawIcon(this.icon, o.id, o.x, o.y + 4, 1.5);
    this.bar = layer.gfx();
    this.value = layer.text(o.x + width - 2, o.y - 2, "", { origin: 1, size: UI.big });
    this.danger = false;
    this.pulsing = false;
    this.ring = layer.gfx();
    this.width = width;

    if (o.onInfo) {
      const hit = layer.rect(o.x - 3, o.y - 3, width + 4, 32, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => o.onInfo(o.id));
    }
  }

  /** @param {number} value @param {number} max @param {{text?: string, danger?: boolean}} [o] */
  set(value, max, o = {}) {
    const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
    const danger = Boolean(o.danger);
    const by = this.y + 18;
    this.bar.clear();
    this.bar.fillStyle(0x232a36, 1);
    this.bar.fillRect(this.barX, by, this.barW, 7);
    this.bar.fillStyle(danger ? 0xff5d5d : o.zone ?? this.color, 1);
    this.bar.fillRect(this.barX, by, Math.round(this.barW * share), 7);
    // A notch pattern in danger, so the warning does not rely on colour alone.
    if (danger) {
      this.bar.fillStyle(0x05060a, 1);
      for (let nx = this.barX + 3; nx < this.barX + this.barW * share; nx += 6) this.bar.fillRect(nx, by, 2, 7);
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
      sfx("warn");
      this.flashTween = this.scene.tweens.add({ targets: [this.icon, this.bar, this.value], alpha: 0.3, duration: 380, yoyo: true, repeat: -1 });
    }
  }

  /** A pulsing yellow frame: Ceres is pointing at this meter. */
  pulse(on) {
    if (on === this.pulsing) return;
    this.pulsing = on;
    this.pulseTween?.stop();
    this.ring.clear();
    this.ring.setAlpha(1);
    if (!on) return;
    this.ring.lineStyle(2, 0xffd166, 1);
    this.ring.strokeRect(this.x - 4, this.y - 3, this.width + 6, 31);
    this.pulseTween = this.scene.tweens.add({ targets: this.ring, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
  }
}
