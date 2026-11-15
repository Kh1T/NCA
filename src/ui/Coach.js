import { HEIGHT, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { markSeen, seen } from "../utils/progress.js";
import { drawIcon } from "./icons.js";
import { Layer, measure } from "./kit.js";
import { sfx } from "./sfx.js";

/**
 * A step-by-step tutorial ("coach marks"). Each step darkens the screen
 * except for the thing to look at, points at it with a bouncing arrow, and
 * says one short line. A dot row shows "step 2 of 4". SKIP and NEXT.
 *
 * steps: [{ target: () => ({x, y, w, h}) | null, text, icon }]
 * A step without a target shows its bubble in the middle of the screen.
 */
export class Coach {
  constructor(scene, id, steps, { onDone, depth = 900 } = {}) {
    this.scene = scene;
    this.id = id;
    this.steps = steps;
    this.onDone = onDone;
    this.depth = depth;
    this.index = 0;
    this.layer = null;
    this.show();
  }

  show() {
    this.layer?.destroy();
    this.tween?.stop();
    const step = this.steps[this.index];
    const L = (this.layer = new Layer(this.scene, { depth: this.depth, fixed: true, keys: true }));
    const box = step.target?.() ?? null;

    // Darken everything except a hole around the target.
    const shade = (x, y, w, h) => {
      if (w > 0 && h > 0) L.rect(x, y, w, h, 0x000000, 0.66).setInteractive();
    };
    if (box) {
      const pad = 4;
      const hx = Math.max(0, box.x - pad);
      const hy = Math.max(0, box.y - pad);
      const hw = Math.min(WIDTH - hx, box.w + pad * 2);
      const hh = Math.min(HEIGHT - hy, box.h + pad * 2);
      shade(0, 0, WIDTH, hy);
      shade(0, hy + hh, WIDTH, HEIGHT - hy - hh);
      shade(0, hy, hx, hh);
      shade(hx + hw, hy, WIDTH - hx - hw, hh);
      const frame = L.gfx();
      frame.lineStyle(2, PALETTE.accent, 1);
      frame.strokeRect(hx, hy, hw, hh);
      this.tween = this.scene.tweens.add({ targets: frame, alpha: 0.35, duration: 450, yoyo: true, repeat: -1 });
    } else {
      shade(0, 0, WIDTH, HEIGHT);
    }

    // The speech bubble goes on whichever side has more room.
    const bw = 340;
    const bh = Math.max(84, measure(this.scene, step.text, bw - 54, UI.big).height + 52);
    const below = !box || box.y + box.h / 2 < HEIGHT / 2;
    const bx = box ? Math.max(8, Math.min(WIDTH - bw - 8, box.x + box.w / 2 - bw / 2)) : (WIDTH - bw) / 2;
    let by;
    if (!box) by = (HEIGHT - bh) / 2;
    else if (below) by = Math.min(HEIGHT - bh - 8, box.y + box.h + 34);
    else by = Math.max(8, box.y - bh - 34);
    L.panel(bx, by, bw, bh, { edge: PALETTE.accent, alpha: 1 });
    const icons = L.gfx();
    drawIcon(icons, step.icon ?? "info", bx + 10, by + 10, 2);
    L.text(bx + 44, by + 8, step.text, { size: UI.big, wrap: bw - 54 });

    // Bouncing arrow from the bubble to the target.
    if (box) {
      const arrow = L.gfx();
      const ax = Math.max(bx + 20, Math.min(bx + bw - 20, box.x + box.w / 2));
      arrow.fillStyle(PALETTE.accent, 1);
      if (below) arrow.fillTriangle(ax - 9, by - 6, ax + 9, by - 6, ax, by - 20);
      else arrow.fillTriangle(ax - 9, by + bh + 6, ax + 9, by + bh + 6, ax, by + bh + 20);
      this.scene.tweens.add({ targets: arrow, y: below ? -6 : 6, duration: 380, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }

    // Progress dots and the buttons.
    const dots = L.gfx();
    this.steps.forEach((_, i) => {
      dots.fillStyle(i === this.index ? PALETTE.accent : 0x3a4658, 1);
      dots.fillCircle(bx + 14 + i * 14, by + bh - 16, 4);
    });
    L.text(bx + 14 + this.steps.length * 14, by + bh - 26, `${this.index + 1}/${this.steps.length}`, { color: TEXT.muted });
    const last = this.index === this.steps.length - 1;
    L.button(bx + bw - 150, by + bh - 18, "SKIP", () => this.finish(), { w: 70, h: 26, key: "ESCAPE" });
    const next = L.button(bx + bw - 52, by + bh - 18, last ? "GOT IT" : "NEXT", () => this.next(), { w: 88, h: 26, key: "ENTER" });
    L.focusFirst(next);
  }

  next() {
    if (this.index >= this.steps.length - 1) {
      this.finish();
      return;
    }
    this.index += 1;
    sfx("tick");
    this.show();
  }

  finish() {
    this.tween?.stop();
    this.layer?.destroy();
    this.layer = null;
    markSeen(this.id);
    this.onDone?.();
  }

  get active() {
    return this.layer !== null;
  }
}

/** Start tutorial `id` unless the player has already seen it. Returns the Coach or null. */
export function runTutorial(scene, id, steps, options = {}) {
  if (seen(id)) {
    options.onDone?.();
    return null;
  }
  return new Coach(scene, id, steps, options);
}
