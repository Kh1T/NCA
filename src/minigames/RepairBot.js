import Phaser from "phaser";
import { TEXT } from "../constants.js";
import { sfx } from "../ui/sfx.js";

const SPEED = 130;
const BOT = 7; // half size

/**
 * Micrometeorite: steer the repair bot around the junk to the hole.
 * Arrow keys or WASD. Holding the pointer down also pulls the bot toward it.
 */
export class RepairBot {
  constructor(scene, layer, area, ctx, done) {
    this.scene = scene;
    this.done = done;
    this.finished = false;
    this.time = 0;
    layer.focus.arrowsMove = false;
    this.box = { x: area.x, y: area.y + 16, w: area.w, h: 116 };
    const b = this.box;

    layer.text(area.x, area.y, "STEER THE BOT TO THE HOLE! (ARROW KEYS OR HOLD CLICK)", { color: TEXT.accent });
    const bg = layer.gfx();
    bg.fillStyle(0x1b2029, 1);
    bg.fillRect(b.x, b.y, b.w, b.h);

    // Blocks in the way, with a gap to steer through.
    this.blocks = [
      { x: b.x + 130, y: b.y, w: 16, h: 66 },
      { x: b.x + 250, y: b.y + 50, w: 16, h: 66 },
      { x: b.x + 370, y: b.y, w: 16, h: 60 },
    ];
    bg.fillStyle(0x55585f, 1);
    for (const block of this.blocks) bg.fillRect(block.x, block.y, block.w, block.h);

    this.hole = { x: b.x + b.w - 36, y: Phaser.Math.Between(b.y + 24, b.y + b.h - 24) };
    this.bot = { x: b.x + 26, y: b.y + b.h / 2 };
    this.g = layer.gfx();
    this.keys = scene.input.keyboard.addKeys({ left: "LEFT", right: "RIGHT", up: "UP", down: "DOWN", a: "A", d: "D", w: "W", s: "S" });
    this.draw();
  }

  blocked(x, y) {
    const b = this.box;
    if (x - BOT < b.x || x + BOT > b.x + b.w || y - BOT < b.y || y + BOT > b.y + b.h) return true;
    return this.blocks.some((k) => x + BOT > k.x && x - BOT < k.x + k.w && y + BOT > k.y && y - BOT < k.y + k.h);
  }

  update(dt) {
    if (this.finished) return;
    this.time += dt;
    const k = this.keys;
    let dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    let dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    const pointer = this.scene.input.activePointer;
    if (!dx && !dy && pointer.isDown) {
      const px = pointer.x - this.bot.x;
      const py = pointer.y - this.bot.y;
      if (Math.abs(px) > 4) dx = Math.sign(px);
      if (Math.abs(py) > 4) dy = Math.sign(py);
    }
    // Move one axis at a time so the bot slides along walls.
    const nx = this.bot.x + dx * SPEED * dt;
    if (!this.blocked(nx, this.bot.y)) this.bot.x = nx;
    const ny = this.bot.y + dy * SPEED * dt;
    if (!this.blocked(this.bot.x, ny)) this.bot.y = ny;
    this.draw();
    if (Phaser.Math.Distance.Between(this.bot.x, this.bot.y, this.hole.x, this.hole.y) < 12) {
      sfx("good");
      this.finish(1);
    }
  }

  draw() {
    const g = this.g;
    g.clear();
    const blink = Math.floor(this.time * 5) % 2 === 0;
    g.lineStyle(2, 0xff5d5d, 1);
    g.strokeCircle(this.hole.x, this.hole.y, blink ? 10 : 7);
    g.fillStyle(0x05060a, 1);
    g.fillCircle(this.hole.x, this.hole.y, 5);
    const { x, y } = this.bot;
    g.fillStyle(0xdfe7f2, 1);
    g.fillRect(x - BOT, y - BOT, BOT * 2, BOT * 2);
    g.fillStyle(0x163540, 1);
    g.fillRect(x - 4, y - 4, 8, 4);
    g.fillStyle(0xffd166, 1);
    g.fillRect(x - 5, y + 3, 10, 2);
  }

  timeUp() {
    this.finish(0);
  }

  finish(quality) {
    if (this.finished) return;
    this.finished = true;
    this.done({ quality });
  }

  destroy() {}
}
