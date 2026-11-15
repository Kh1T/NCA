import { drawIcon, ICON_COLOR } from "./icons.js";

const BAR = { w: 56, h: 12 };
const CELL_W = 80;
const GOOD = 0x5ce7a0;
const BAD = 0xff5d5d;
const WARN = 0xffb347;

/**
 * A row of small bars that preview a day. Each bar is today's level with a
 * blinking "ghost" piece: green where it will grow, red where it will shrink
 * (orange for radiation, which is bad when it grows).
 *
 * @param {import('./kit.js').Layer} layer
 * @param {number} x  left edge
 * @param {number} y  top edge
 * @param {{id: string, now: number, max: number, delta: number, badWhenUp?: boolean}[]} rows
 */
export function drawGhostBars(layer, x, y, rows) {
  const g = layer.gfx();
  const ghost = layer.gfx();
  rows.forEach(({ id, now, max, delta, badWhenUp }, i) => {
    const cx = x + i * CELL_W;
    const share = (v) => Math.min(1, Math.max(0, v / max));
    const from = share(now);
    const to = share(now + delta);
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const bad = badWhenUp ? delta > 0 : delta < 0;
    drawIcon(g, id, cx, y, 1.3);
    const bx = cx + 20;
    g.fillStyle(0x232a36, 1);
    g.fillRect(bx, y + 2, BAR.w, BAR.h);
    g.fillStyle(ICON_COLOR[id] ?? 0xffffff, 1);
    g.fillRect(bx, y + 2, Math.round(BAR.w * lo), BAR.h);
    const gx = bx + Math.round(BAR.w * lo);
    const gw = Math.max(2, Math.round(BAR.w * (hi - lo)));
    ghost.fillStyle(bad ? (badWhenUp ? WARN : BAD) : GOOD, 1);
    ghost.fillRect(gx, y + 2, gw, BAR.h);
    g.lineStyle(1, 0x3a4658, 1);
    g.strokeRect(bx, y + 2, BAR.w, BAR.h);
  });
  const blink = layer.scene.tweens.add({ targets: ghost, alpha: 0.25, duration: 420, yoyo: true, repeat: -1 });
  ghost.once("destroy", () => blink.stop());
}
