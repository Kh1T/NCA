import { PALETTE, TEXT } from "../constants.js";
import { dataBadge } from "./DataBadge.js";
import { drawIcon } from "./icons.js";
import { Layer } from "./kit.js";

/** Card geometry. `area` is where choices and mini-games are drawn. */
export const CARD = {
  x: 40, y: 20, w: 560, h: 320,
  area: { x: 56, y: 150, w: 528, h: 150 },
  buttonY: 322,
};

/**
 * The one card every alert uses: title, plain-language "what's happening",
 * data badge, timer, a body (choices or a mini-game) and the result.
 */
export class AlertCard {
  /** @param {{icon: string, title: string, explain: string, source: object, sourceNote?: string}} o */
  constructor(scene, o) {
    this.scene = scene;
    this.frame = new Layer(scene, { depth: 500 });
    const F = this.frame;
    F.dim(0.7);
    F.panel(CARD.x, CARD.y, CARD.w, CARD.h, { edge: PALETTE.danger, alpha: 1 });
    const icon = F.gfx();
    drawIcon(icon, o.icon, CARD.x + 14, CARD.y + 12, 2);
    F.text(CARD.x + 48, CARD.y + 16, o.title.toUpperCase(), { size: 16, color: TEXT.accent });
    const explain = F.text(CARD.x + 16, CARD.y + 46, o.explain, { wrap: CARD.w - 32 });
    const badgeY = explain.y + explain.height + 6;
    dataBadge(F, CARD.x + 16, badgeY, o.source, { maxWidth: CARD.w - 32 });
    this.timer = F.gfx();
    this.bodyLayer = null;
    this.clearBody();
  }

  /** A fresh layer for the body. The old one (and its keyboard focus) is dropped. */
  clearBody() {
    this.bodyLayer?.destroy();
    this.bodyLayer = new Layer(this.scene, { depth: 510, keys: true });
    return this.bodyLayer;
  }

  body() {
    return this.bodyLayer;
  }

  /** share 0..1 of time left, or null to hide the bar. */
  setTimer(share) {
    const { x, w } = CARD.area;
    const y = CARD.area.y - 8;
    this.timer.clear();
    if (share === null) return;
    this.timer.fillStyle(0x232a36, 1);
    this.timer.fillRect(x, y, w, 5);
    this.timer.fillStyle(share < 0.3 ? PALETTE.danger : PALETTE.accent, 1);
    this.timer.fillRect(x, y, Math.round(w * share), 5);
  }

  /** @param {Array<{label: string, cost: string, onPick: Function}>} options */
  showChoices(options) {
    const B = this.clearBody();
    const { x, y, w } = CARD.area;
    B.text(x, y, "WHAT WILL YOU DO? EVERY CHOICE HAS A COST.", { color: TEXT.muted });
    const columnW = w / options.length;
    options.forEach((option, i) => {
      const cx = x + columnW * i + columnW / 2;
      B.panel(x + columnW * i + 6, y + 18, columnW - 12, 110);
      B.button(cx, y + 44, option.label.toUpperCase(), option.onPick, { w: columnW - 40, h: 24, key: String(i + 1) });
      B.text(cx, y + 66, `PRESS ${i + 1}`, { origin: 0.5, color: "#4c5566" });
      B.text(cx, y + 84, "COST:", { origin: 0.5, color: "#ffb347" });
      B.text(cx, y + 98, option.cost, { origin: 0.5, wrap: columnW - 32, align: "center" });
    });
    B.focusFirst();
  }

  /** The outcome of the alert, then a button to carry on. */
  showResult(note, lines, onContinue) {
    this.setTimer(null);
    const B = this.clearBody();
    const { x, y, w } = CARD.area;
    B.text(x, y + 6, "RESULT", { color: TEXT.accent });
    const text = B.text(x, y + 24, note, { wrap: w });
    lines.forEach((line, i) => B.text(x, text.y + text.height + 10 + i * 14, line, { color: "#ffb347" }));
    const button = B.button(CARD.x + CARD.w - 76, CARD.buttonY, "CONTINUE", onContinue, { w: 120, key: "ENTER" });
    B.focusFirst(button);
  }

  destroy() {
    this.bodyLayer?.destroy();
    this.frame.destroy();
  }
}
