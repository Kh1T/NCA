import Phaser from "phaser";
import { PALETTE, TEXT } from "../constants.js";
import { sfx } from "../ui/sfx.js";
import { Slider } from "../ui/Slider.js";
import { drawChips } from "../ui/chips.js";
import { Layer } from "../ui/kit.js";

const KEY_SPEED = 150;
const SNAP = 14;

/**
 * Air leak: drag the patch onto the blinking crack (or move it with the arrow
 * keys). Then choose how much stored oxygen to use to refill the cabin.
 * A faster patch loses less air.
 */
export class PatchLeak {
  constructor(scene, layer, area, ctx, done) {
    this.scene = scene;
    this.layer = layer;
    this.area = area;
    this.ctx = ctx;
    this.done = done;
    this.sealed = false;
    this.finished = false;
    this.elapsed = 0;
    this.timeTotal = ctx.def.timerSec;
    layer.focus.arrowsMove = false;

    this.hint = layer.text(area.x, area.y, "DRAG THE PATCH ONTO THE CRACK!", { color: TEXT.accent });
    const wall = layer.gfx();
    wall.fillStyle(0x2a3344, 1);
    wall.fillRect(area.x, area.y + 16, area.w, 112);
    wall.fillStyle(0x364258, 1);
    for (let x = area.x + 40; x < area.x + area.w; x += 88) wall.fillRect(x, area.y + 16, 2, 112);

    this.crack = {
      x: Phaser.Math.Between(area.x + 180, area.x + area.w - 40),
      y: Phaser.Math.Between(area.y + 36, area.y + 108),
    };
    this.crackG = layer.gfx();
    this.puffs = layer.gfx();

    this.patch = layer.add(scene.add.rectangle(area.x + 40, area.y + 100, 20, 20, PALETTE.accent));
    this.patch.setStrokeStyle(2, 0x8a6a1c);
    this.patch.setInteractive({ useHandCursor: true, draggable: true });
    this.patch.on("drag", (pointer, dragX, dragY) => {
      if (this.sealed) return;
      this.patch.setPosition(
        Phaser.Math.Clamp(dragX, area.x + 10, area.x + area.w - 10),
        Phaser.Math.Clamp(dragY, area.y + 26, area.y + 118),
      );
    });
    this.keys = scene.input.keyboard.addKeys({ left: "LEFT", right: "RIGHT", up: "UP", down: "DOWN" });
    this.drawCrack(0);
  }

  drawCrack(time) {
    const { x, y } = this.crack;
    const blink = Math.floor(time * 5) % 2 === 0;
    this.crackG.clear();
    if (this.sealed) return;
    this.crackG.fillStyle(blink ? 0xff5d5d : 0x05060a, 1);
    this.crackG.fillRect(x - 8, y - 2, 6, 3);
    this.crackG.fillRect(x - 3, y, 6, 3);
    this.crackG.fillRect(x + 2, y - 3, 6, 3);
    this.crackG.lineStyle(1, 0xff5d5d, 1);
    this.crackG.strokeCircle(x, y, 12 + (blink ? 2 : 0));
  }

  update(dt) {
    if (this.finished || this.sealed) return;
    this.elapsed += dt;
    const k = this.keys;
    const dx = (k.right.isDown ? 1 : 0) - (k.left.isDown ? 1 : 0);
    const dy = (k.down.isDown ? 1 : 0) - (k.up.isDown ? 1 : 0);
    if (dx || dy) {
      this.patch.x = Phaser.Math.Clamp(this.patch.x + dx * KEY_SPEED * dt, this.area.x + 10, this.area.x + this.area.w - 10);
      this.patch.y = Phaser.Math.Clamp(this.patch.y + dy * KEY_SPEED * dt, this.area.y + 26, this.area.y + 118);
    }
    this.drawCrack(this.elapsed);

    // Little puffs of escaping air.
    this.puffs.clear();
    this.puffs.fillStyle(0x9be7e0, 0.8);
    for (let i = 0; i < 4; i += 1) {
      const t = (this.elapsed * 1.5 + i * 0.25) % 1;
      this.puffs.fillRect(this.crack.x + (i - 1.5) * 6 * t * 3, this.crack.y - 6 - t * 26, 2, 2);
    }

    if (Phaser.Math.Distance.Between(this.patch.x, this.patch.y, this.crack.x, this.crack.y) <= SNAP) this.seal();
  }

  seal() {
    this.sealed = true;
    this.ctx.stopTimer();
    this.patch.setPosition(this.crack.x, this.crack.y).disableInteractive();
    this.crackG.clear();
    this.puffs.clear();
    sfx("good");
    // Faster patch = higher quality. Never below 0.25 once it is sealed.
    this.quality = Math.max(0.25, 1 - this.elapsed / this.timeTotal);

    const { area, layer } = this;
    this.hint.setText("SEALED! NOW REFILL THE AIR.").setColor(TEXT.good);
    layer.focus.arrowsMove = true;
    const cover = layer.rect(area.x, area.y + 18, 300, 150, 0x10141c, 0.95);
    cover.setStrokeStyle(1, PALETTE.panelEdge);
    let chips = null;
    const show = (value) => {
      chips?.destroy();
      chips = new Layer(this.scene, { depth: 512 });
      const amount = (value * 0.25).toFixed(2);
      drawChips(chips, area.x + 10, area.y + 84, [["oxygen", `-${amount}`, TEXT.danger], ["air", `+${amount}`, TEXT.good]]);
    };
    this.chips = () => chips;
    const slider = new Slider(layer, { x: area.x + 10, y: area.y + 36, max: 4, value: 2, color: 0x6cc5ff, pip: 26, onChange: show });
    show(2);
    const confirm = layer.button(area.x + 230, area.y + 140, "OK", () => this.finish(slider.value * 0.25), { w: 110, h: 36, icon: "check" });
    layer.focusFirst(confirm);
    layer.focus.focusItem(slider);
  }

  timeUp() {
    if (this.sealed) return;
    this.finished = true;
    this.done({ quality: 0, refill: 0 });
  }

  finish(refill) {
    if (this.finished) return;
    this.finished = true;
    this.done({ quality: this.quality, refill });
  }

  destroy() {
    this.chips?.()?.destroy();
  }
}
