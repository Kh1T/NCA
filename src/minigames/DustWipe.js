import Phaser from "phaser";
import { TEXT } from "../constants.js";
import { sfx } from "../ui/sfx.js";

const COLS = 12;
const ROWS = 4;
const CELL = 26;

/**
 * Moon dust: wipe the solar panel clean before the timer ends. Move the
 * pointer over the dusty squares, or move the cloth with the arrow keys.
 */
export class DustWipe {
  constructor(scene, layer, area, ctx, done) {
    this.scene = scene;
    this.done = done;
    this.finished = false;
    layer.focus.arrowsMove = false;
    this.left = area.x + (area.w - COLS * CELL) / 2;
    this.top = area.y + 20;
    this.cursor = { col: 0, row: 0 };
    this.cells = [];
    for (let i = 0; i < COLS * ROWS; i += 1) this.cells.push(true);
    this.dirty = COLS * ROWS;

    layer.text(area.x, area.y, "RUB THE DUST OFF THE PANEL!", { color: TEXT.accent });
    this.g = layer.gfx();
    this.count = layer.text(area.x + area.w, area.y + 140, "", { origin: 1, color: TEXT.muted, size: 22 });

    this.onMove = (pointer) => {
      const col = Math.floor((pointer.x - this.left) / CELL);
      const row = Math.floor((pointer.y - this.top) / CELL);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
      this.cursor = { col, row };
      this.clean(col, row);
    };
    scene.input.on("pointermove", this.onMove);
    scene.input.on("pointerdown", this.onMove);
    this.onKey = (event) => {
      const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      if (!step || this.finished) return;
      this.cursor.col = Phaser.Math.Clamp(this.cursor.col + step[0], 0, COLS - 1);
      this.cursor.row = Phaser.Math.Clamp(this.cursor.row + step[1], 0, ROWS - 1);
      this.clean(this.cursor.col, this.cursor.row);
    };
    scene.input.keyboard.on("keydown", this.onKey);
    this.clean(0, 0);
  }

  clean(col, row) {
    if (this.finished) return;
    const index = row * COLS + col;
    if (this.cells[index]) {
      this.cells[index] = false;
      this.dirty -= 1;
      sfx("tick");
    }
    this.draw();
    if (this.dirty === 0) this.finish();
  }

  draw() {
    const g = this.g;
    g.clear();
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const x = this.left + col * CELL;
        const y = this.top + row * CELL;
        g.fillStyle(0x24508f, 1);
        g.fillRect(x, y, CELL - 2, CELL - 2);
        g.fillStyle(0x4c8dff, 1);
        g.fillRect(x + 2, y + 2, CELL - 6, CELL - 6);
        if (this.cells[row * COLS + col]) {
          // Dust is drawn as a speckle pattern, not just a colour change.
          g.fillStyle(0xb9bcc2, 1);
          g.fillRect(x, y, CELL - 2, CELL - 2);
          g.fillStyle(0x6a6d75, 1);
          for (const [dx, dy] of [[4, 4], [14, 6], [8, 14], [18, 18], [4, 20]]) g.fillRect(x + dx, y + dy, 3, 3);
        }
      }
    }
    const cx = this.left + this.cursor.col * CELL;
    const cy = this.top + this.cursor.row * CELL;
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(cx - 1, cy - 1, CELL, CELL);
    this.count.setText(`DUST LEFT: ${this.dirty}`);
  }

  timeUp() {
    this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.done({ quality: 1 - this.dirty / (COLS * ROWS) });
  }

  destroy() {
    this.scene.input.off("pointermove", this.onMove);
    this.scene.input.off("pointerdown", this.onMove);
    this.scene.input.keyboard.off("keydown", this.onKey);
  }
}
