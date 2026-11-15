import Phaser from "phaser";
import { PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { getMission, scenarioOf } from "../data/mission.js";
import { drawBuilding, drawRover } from "../ui/art.js";
import { drawStars } from "../ui/backdrop.js";
import { ICON_COLOR, drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { playMusic, sfx } from "../ui/sfx.js";

/**
 * Four picture cards that show the whole game before it starts:
 * build, explore while you wait, watch your supplies, survive the night to win.
 * Swipe, tap NEXT, or press the arrow keys.
 */
const CARDS = [
  { title: "BUILD YOUR BASE", line: "Walk to a flag and tap it. 3 builds at once.", art: "build" },
  { title: "EXPLORE WHILE YOU WAIT", line: "Builds take days. Drive the rover and snap crater photos!", art: "explore" },
  { title: "WATCH YOUR SUPPLIES", line: "One choice a day. Keep every bar out of the red!", art: "supplies" },
  { title: "SURVIVE THE NIGHT TO WIN", line: "No sun at night! Charge your battery before dark.", art: "win" },
];

const PANEL = { x: 40, y: 40, w: 560, h: 250 };

export class HowTo extends Phaser.Scene {
  constructor() {
    super("HowTo");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    drawStars(this, { seed: "howto" });
    playMusic("menu");
    this.index = 0;
    const scenario = scenarioOf(getMission(this));

    const L = (this.frame = new Layer(this, { keys: true }));
    L.text(WIDTH / 2, 6, scenario.title.toUpperCase(), { size: UI.big, origin: 0.5, color: TEXT.muted });
    L.panel(PANEL.x, PANEL.y, PANEL.w, PANEL.h, { edge: PALETTE.accent });
    this.dots = L.gfx();
    this.backButton = L.button(80, 330, "BACK", () => this.go(-1), { w: 110, h: 36, key: "ARROWLEFT", icon: "back" });
    L.button(WIDTH / 2, 330, "SKIP", () => this.done(), { w: 100, h: 36, key: "ESCAPE" });
    this.nextButton = L.button(548, 330, "NEXT", () => this.go(1), { w: 160, h: 36, key: "ARROWRIGHT", icon: "play" });
    L.focus.arrowsMove = false;
    L.focusFirst(this.nextButton);

    // Swipe left or right on the card.
    this.input.on("pointerdown", (p) => { this.swipeX = p.x; });
    this.input.on("pointerup", (p) => {
      if (this.swipeX === undefined) return;
      const dx = p.x - this.swipeX;
      this.swipeX = undefined;
      if (Math.abs(dx) > 60) this.go(dx < 0 ? 1 : -1);
    });
    this.show();
  }

  go(step) {
    const next = this.index + step;
    if (next < 0) {
      this.scene.start("Scenario");
      return;
    }
    if (next >= CARDS.length) {
      this.done();
      return;
    }
    this.index = next;
    sfx("tick");
    this.show();
  }

  done() {
    sfx("done");
    this.scene.start("Blueprints");
  }

  show() {
    this.card?.destroy();
    this.tweens.killAll();
    const C = (this.card = new Layer(this, { depth: 1 }));
    const card = CARDS[this.index];
    const { x, y, w } = PANEL;
    // Big step number, title and one line.
    const g = C.gfx();
    g.fillStyle(PALETTE.accent, 1);
    g.fillCircle(x + 30, y + 30, 18);
    C.text(x + 30, y + 30, String(this.index + 1), { size: UI.title, origin: [0.5, 0.5], color: "#05060a" });
    C.text(x + 60, y + 12, card.title, { size: UI.title, color: TEXT.accent });
    C.text(x + w / 2, y + 206, card.line, { size: UI.big, origin: 0.5, wrap: w - 40, align: "center" });
    this[`art_${card.art}`](C, x + w / 2, y + 120);

    // Little dots: which card of four.
    this.dots.clear();
    CARDS.forEach((_, i) => {
      this.dots.fillStyle(i === this.index ? PALETTE.accent : 0x3a4658, 1);
      this.dots.fillCircle(WIDTH / 2 - 30 + i * 20, PANEL.y + PANEL.h + 10, 5);
    });
    this.nextButton.setLabel(this.index === CARDS.length - 1 ? "PACK UP!" : "NEXT");
    // Slide in.
    for (const obj of C.items) obj.x += 40;
    this.tweens.add({ targets: C.items, x: "-=40", duration: 220, ease: "Quad.easeOut" });
  }

  // ---------- The pictures ----------

  art_build(C, cx, cy) {
    const ids = ["solar", "air", "oxygen", "greenhouse", "shield"];
    ids.forEach((id, i) => {
      const g = C.gfx();
      drawBuilding(g, id, 0, 0);
      g.setPosition(cx - 200 + i * 100, cy + 40).setScale(1.6);
      // Each building pops up in turn, like it is being built.
      g.setScale(0);
      this.tweens.add({ targets: g, scale: 1.6, duration: 360, delay: 200 + i * 260, ease: "Back.easeOut", onStart: () => sfx("tick") });
    });
    const flag = C.gfx();
    flag.fillStyle(0x6b7384, 1);
    flag.fillRect(cx - 202, cy - 50, 2, 26);
    flag.fillStyle(PALETTE.accent, 1);
    flag.fillTriangle(cx - 200, cy - 50, cx - 186, cy - 44, cx - 200, cy - 38);
  }

  art_explore(C, cx, cy) {
    const ground = C.gfx();
    ground.fillStyle(0x55585f, 1);
    ground.fillRect(cx - 240, cy + 40, 480, 8);
    const rover = C.gfx();
    drawRover(rover, 0, 0);
    rover.setPosition(cx - 180, cy + 40).setScale(2);
    this.tweens.add({ targets: rover, x: cx + 60, duration: 2200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const cam = C.gfx();
    drawIcon(cam, "camera", 0, 0, 4);
    cam.setPosition(cx + 140, cy - 60);
    this.tweens.add({ targets: cam, alpha: 0.4, duration: 300, yoyo: true, repeat: -1, hold: 900 });
    const clock = C.gfx();
    drawIcon(clock, "clock", 0, 0, 3);
    clock.setPosition(cx - 220, cy - 60);
  }

  art_supplies(C, cx, cy) {
    const bars = [["power", 0.7], ["oxygen", 0.6], ["air", 0.2], ["water", 0.5], ["food", 0.8]];
    bars.forEach(([id, share], i) => {
      const y = cy - 70 + i * 26;
      const g = C.gfx();
      drawIcon(g, id, cx - 150, y, 1.6);
      g.fillStyle(0x232a36, 1);
      g.fillRect(cx - 120, y + 4, 200, 12);
      const low = share < 0.3;
      const fill = C.gfx();
      fill.fillStyle(low ? PALETTE.danger : ICON_COLOR[id], 1);
      fill.fillRect(0, 0, 200 * share, 12);
      fill.setPosition(cx - 120, y + 4);
      if (low) {
        this.tweens.add({ targets: fill, alpha: 0.3, duration: 380, yoyo: true, repeat: -1 });
        const warn = C.gfx();
        drawIcon(warn, "warn", 0, 0, 1.6);
        warn.setPosition(cx + 90, y);
      }
    });
    // A choice card with two picks.
    const card = C.gfx();
    card.fillStyle(0x1a2230, 1);
    card.fillRect(cx + 130, cy - 70, 110, 120);
    card.lineStyle(1, PALETTE.accent, 1);
    card.strokeRect(cx + 130, cy - 70, 110, 120);
    drawIcon(card, "build", cx + 146, cy - 50, 2);
    drawIcon(card, "crew", cx + 196, cy - 50, 2);
    card.fillStyle(PALETTE.good, 1);
    card.fillTriangle(cx + 150, cy + 10, cx + 162, cy + 10, cx + 156, cy);
    card.fillStyle(PALETTE.danger, 1);
    card.fillTriangle(cx + 200, cy, cx + 212, cy, cx + 206, cy + 10);
  }

  art_win(C, cx, cy) {
    // Sun sets, moon rises: the night is coming.
    const sun = C.gfx();
    drawIcon(sun, "sun", 0, 0, 4);
    sun.setPosition(cx - 230, cy - 70);
    this.tweens.add({ targets: sun, y: cy - 20, alpha: 0.2, duration: 1600, yoyo: true, repeat: -1 });
    const moon = C.gfx();
    drawIcon(moon, "moon", 0, 0, 4);
    moon.setPosition(cx - 170, cy - 20);
    this.tweens.add({ targets: moon, y: cy - 70, duration: 1600, yoyo: true, repeat: -1 });
    // What a win needs: everything built + 5 photos + the night.
    const goals = [["build", "BUILD ALL"], ["camera", "5 PHOTOS"], ["battery", "NIGHT"]];
    goals.forEach(([icon, label], i) => {
      const gx = cx - 60 + i * 110;
      const g = C.gfx();
      g.fillStyle(0x0b1018, 1);
      g.fillRect(gx - 46, cy - 70, 92, 104);
      g.lineStyle(1, PALETTE.panelEdge, 1);
      g.strokeRect(gx - 46, cy - 70, 92, 104);
      drawIcon(g, icon, gx - 24, cy - 56, 4);
      C.text(gx, cy + 10, label, { origin: 0.5, color: TEXT.accent });
      if (i < 2) C.text(gx + 55, cy - 26, "+", { origin: [0.5, 0.5], size: UI.title });
    });
  }
}
