import { PALETTE, TEXT, UI } from "../constants.js";
import { drawChips } from "./chips.js";
import { dataBadge } from "./DataBadge.js";
import { drawIcon } from "./icons.js";
import { infoButton } from "./InfoCard.js";
import { Layer } from "./kit.js";
import { runTutorial } from "./Coach.js";
import { sfx } from "./sfx.js";

/** Card geometry. `area` is where choices and mini-games are drawn. */
export const CARD = {
  x: 24, y: 10, w: 592, h: 340,
  area: { x: 40, y: 132, w: 560, h: 170 },
  buttonY: 324,
};

/**
 * The one card every alert uses: a big picture and title, one short line,
 * the data badge, a timer, then choices (or a mini-game) and the result.
 */
export class AlertCard {
  /** @param {{icon: string, title: string, explain: string, source: object, info?: string}} o */
  constructor(scene, o) {
    this.scene = scene;
    this.frame = new Layer(scene, { depth: 500 });
    const F = this.frame;
    F.dim(0.7);
    F.panel(CARD.x, CARD.y, CARD.w, CARD.h, { edge: PALETTE.danger, alpha: 1 });
    // A flashing warning stripe across the top.
    const stripe = F.rect(CARD.x + 1, CARD.y + 1, CARD.w - 2, 6, PALETTE.danger, 1);
    scene.tweens.add({ targets: stripe, alpha: 0.3, duration: 300, yoyo: true, repeat: 5 });
    const icon = F.gfx();
    drawIcon(icon, o.icon, CARD.x + 16, CARD.y + 18, 3);
    scene.tweens.add({ targets: icon, x: { from: -1, to: 1 }, duration: 60, yoyo: true, repeat: 6 });
    F.text(CARD.x + 64, CARD.y + 14, o.title.toUpperCase(), { size: UI.title, color: TEXT.accent });
    F.text(CARD.x + 64, CARD.y + 48, o.explain, { size: UI.big, wrap: CARD.w - 120 });
    dataBadge(F, CARD.x + 16, CARD.y + 84, o.source, { maxWidth: CARD.w - 32 });
    if (o.info) this.infoBtn = infoButton(F, CARD.x + CARD.w - 26, CARD.y + 30, o.info, { focus: false, r: 11 });
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
    const y = CARD.area.y - 10;
    this.timer.clear();
    if (share === null) return;
    drawIcon(this.timer, "clock", x, y - 5, 1);
    this.timer.fillStyle(0x232a36, 1);
    this.timer.fillRect(x + 18, y, w - 18, 6);
    this.timer.fillStyle(share < 0.3 ? PALETTE.danger : PALETTE.accent, 1);
    this.timer.fillRect(x + 18, y, Math.round((w - 18) * share), 6);
  }

  /**
   * One big card per choice: the action, then what it costs as icons.
   * @param {Array<{label: string, chips: Array, onPick: Function}>} options
   */
  showChoices(options) {
    const B = this.clearBody();
    const { x, y, w } = CARD.area;
    B.text(x, y, "EVERY CHOICE COSTS SOMETHING", { color: TEXT.muted });
    const columnW = w / options.length;
    options.forEach((option, i) => {
      const left = x + columnW * i + 6;
      const cw = columnW - 12;
      const cx = left + cw / 2;
      const button = B.button(cx, y + 50, option.label.toUpperCase(), option.onPick, { w: cw - 16, h: 40, key: String(i + 1), icon: option.icon });
      B.text(cx, y + 76, `KEY ${i + 1}`, { origin: 0.5, color: "#4c5566" });
      const panel = B.rect(left, y + 96, cw, 70, 0x0b1018, 1).setStrokeStyle(1, PALETTE.panelEdge).setInteractive({ useHandCursor: true });
      panel.on("pointerdown", () => button.activate());
      B.text(left + 10, y + 102, "COSTS", { color: "#ffb347" });
      drawChips(B, left + 10, y + 124, option.chips.map(([icon, label]) => [icon, label, TEXT.danger]), { maxWidth: cw - 20 });
    });
    B.focusFirst();
    this.coach = runTutorial(this.scene, "alert", [
      { icon: "warn", text: "Every choice costs something. Look before you pick!", target: () => ({ x, y: y + 94, w, h: 74 }) },
      { icon: "info", text: "Tap i to learn the real science.", target: () => ({ x: CARD.x + CARD.w - 42, y: CARD.y + 14, w: 32, h: 32 }) },
    ]);
  }

  /** The outcome of the alert: a big tick or cross, one line, the changes. */
  showResult(note, chips, good, onContinue) {
    this.setTimer(null);
    const B = this.clearBody();
    const { x, y, w } = CARD.area;
    const g = B.gfx();
    drawIcon(g, good ? "check" : "cross", x + 4, y + 12, 4);
    B.text(x + 72, y + 14, note, { size: UI.big, wrap: w - 80 });
    if (chips.length > 0) drawChips(B, x + 72, y + 70, chips, { maxWidth: w - 80 });
    sfx(good ? "good" : "bad");
    const button = B.button(CARD.x + CARD.w - 84, CARD.buttonY, "OK", onContinue, { w: 140, h: 36, key: "ENTER", icon: "play" });
    B.focusFirst(button);
  }

  destroy() {
    this.bodyLayer?.destroy();
    this.frame.destroy();
  }
}
