import Phaser from "phaser";
import { PALETTE, TEXT, UI } from "../constants.js";
import { budgetOf, getMission, startMission } from "../data/mission.js";
import { ITEMS, ITEM_ORDER, packCost, packWarnings, starterPlan } from "../sim/buildings.js";
import { forecast } from "../sim/rules.js";
import { drawStars } from "../ui/backdrop.js";
import { drawCeres } from "../ui/art.js";
import { ITEM_MAKES, ITEM_NEEDS, drawChips } from "../ui/chips.js";
import { ICON_COLOR, ITEM_ICON, drawIcon } from "../ui/icons.js";
import { infoButton } from "../ui/InfoCard.js";
import { Layer, clearFocusFor, dialog } from "../ui/kit.js";
import { runTutorial } from "../ui/Coach.js";
import { sfx, playMusic } from "../ui/sfx.js";

const ROW_Y = 46;
const ROW_H = 22;
const LAST = ["power", "oxygen", "air", "water", "food"];
const NEXT_SCENE = "Landing";
const BACK_SCENE = "Briefing";

/** Plan resources: spend Mission Points on blueprints and kits. */
export class Blueprints extends Phaser.Scene {
  constructor() {
    super("Blueprints");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.mission = getMission(this);
    if (!this.mission.packed) this.mission.packed = {};
    this.packed = this.mission.packed;
    this.selected = "solar";

    drawStars(this, { seed: "blueprints" });
    playMusic("menu");
    this.layer = new Layer(this, { keys: true });
    const L = this.layer;
    L.text(8, 4, "PACK YOUR SHIP", { size: UI.title, color: TEXT.accent });
    // Points left, as a number and a bar.
    this.pointsText = L.text(632, 4, "", { origin: 1, size: UI.big });
    L.text(632, 24, "POINTS LEFT", { origin: 1, color: TEXT.muted });
    this.pointsBar = L.gfx();

    this.rows = ITEM_ORDER.map((id, i) => this.makeRow(id, ROW_Y + i * ROW_H));

    L.panel(340, 44, 292, 244);
    this.detail = new Layer(this, { depth: 1, keys: false });

    const ceres = L.gfx();
    drawCeres(ceres, 0, 0);
    ceres.setScale(0.6).setPosition(16, 314);
    this.guide = L.text(32, 294, "", { wrap: 600, color: TEXT.good });
    L.button(82, 338, "STARTER", () => this.fillStarter(), { w: 150, h: 36, key: "S", icon: "check" });
    L.button(206, 338, "CLEAR", () => this.clearAll(), { w: 86, h: 36 });
    L.button(456, 338, "BACK", () => this.scene.start(BACK_SCENE), { w: 92, h: 36, key: "ESCAPE" });
    this.nextButton = L.button(570, 338, "NEXT", () => this.next(), { w: 120, h: 36, key: "ENTER", icon: "play" });

    this.refresh();
    L.focusFirst(this.rows[0]);
    this.coach = runTutorial(this, "blueprints", [
      { icon: "crate", text: "Tap + to pack a blueprint. Each costs points.", target: () => ({ x: 4, y: 42, w: 334, h: 244 }) },
      { icon: "check", text: "These bars show if your supplies will last.", target: () => ({ x: 342, y: 176, w: 288, h: 110 }) },
      { icon: "question", text: "Not sure? STARTER packs a safe ship.", target: () => ({ x: 7, y: 320, w: 150, h: 36 }) },
    ]);
  }

  makeRow(id, y) {
    const L = this.layer;
    const item = ITEMS[id];
    const bg = L.rect(4, y - 2, 332, ROW_H - 1, 0x1a2230, 0).setInteractive({ useHandCursor: true });
    const icon = L.gfx();
    drawIcon(icon, ITEM_ICON[id], 10, y + 1, 1.4);
    L.text(34, y, item.name.toUpperCase(), {});
    if (item.core || item.required) drawIcon(icon, "star", 196, y + 3, 1);
    L.text(240, y, `${item.cost}`, { origin: 1, color: TEXT.accent });
    // - and + boxes, big enough to tap.
    const boxes = L.gfx();
    for (const bx of [252, 310]) {
      boxes.fillStyle(0x1a2230, 1);
      boxes.fillRect(bx, y, 22, 18);
      boxes.lineStyle(1, PALETTE.accent, 1);
      boxes.strokeRect(bx, y, 22, 18);
      boxes.fillStyle(PALETTE.accent, 1);
      boxes.fillRect(bx + 6, y + 8, 10, 2);
    }
    boxes.fillRect(310 + 10, y + 4, 2, 10);
    const minus = L.rect(248, y - 2, 30, ROW_H, 0, 0.001).setInteractive({ useHandCursor: true });
    const count = L.text(292, y, "0", { origin: 0.5 });
    const plus = L.rect(306, y - 2, 30, ROW_H, 0, 0.001).setInteractive({ useHandCursor: true });

    const row = {
      id,
      bg,
      count,
      focused: false,
      setFocus: (value) => {
        row.focused = value;
        if (value) this.select(id);
        this.paintRow(row);
      },
      activate: () => this.change(id, (this.packed[id] ?? 0) >= item.max ? -(this.packed[id] ?? 0) : 1),
      adjust: (step) => this.change(id, step),
    };
    bg.on("pointerover", () => this.layer.focus.focusItem(row));
    bg.on("pointerdown", () => {
      this.layer.focus.focusItem(row);
      row.activate();
    });
    minus.on("pointerdown", () => { this.layer.focus.focusItem(row); this.change(id, -1); });
    plus.on("pointerdown", () => { this.layer.focus.focusItem(row); this.change(id, 1); });
    this.layer.focus.add(row);
    return row;
  }

  paintRow(row) {
    const have = this.packed[row.id] ?? 0;
    row.bg.setFillStyle(row.focused ? 0x2a3850 : 0x1a2230, row.focused ? 1 : have > 0 ? 0.55 : 0);
    row.bg.setStrokeStyle(row.focused ? 1 : 0, 0xffffff);
    row.count.setText(String(have)).setColor(have > 0 ? TEXT.good : TEXT.muted);
  }

  left() {
    return budgetOf(this.mission) - packCost(this.packed);
  }

  change(id, step) {
    const item = ITEMS[id];
    const have = this.packed[id] ?? 0;
    const next = Math.max(0, Math.min(item.max, have + step));
    if (next === have) {
      sfx("deny");
      return;
    }
    if (next > have && item.cost * (next - have) > this.left()) {
      sfx("deny");
      this.flashPoints();
      return;
    }
    if (next === 0) delete this.packed[id];
    else this.packed[id] = next;
    sfx(next > have ? "build" : "tick");
    this.refresh();
  }

  flashPoints() {
    this.pointsText.setColor(TEXT.danger);
    this.time.delayedCall(350, () => this.pointsText.setColor(TEXT.white));
  }

  fillStarter() {
    for (const key of Object.keys(this.packed)) delete this.packed[key];
    Object.assign(this.packed, starterPlan(budgetOf(this.mission)));
    sfx("done");
    this.refresh();
  }

  clearAll() {
    for (const key of Object.keys(this.packed)) delete this.packed[key];
    this.refresh();
  }

  select(id) {
    if (this.selected === id) return;
    this.selected = id;
    this.drawDetail();
  }

  refresh() {
    const budget = budgetOf(this.mission);
    this.pointsText.setText(`${this.left()} / ${budget}`);
    this.pointsBar.clear();
    this.pointsBar.fillStyle(0x232a36, 1);
    this.pointsBar.fillRect(400, 30, 120, 8);
    this.pointsBar.fillStyle(PALETTE.accent, 1);
    this.pointsBar.fillRect(400, 30, Math.round(120 * Math.max(0, this.left()) / budget), 8);
    for (const row of this.rows) this.paintRow(row);
    this.warnings = packWarnings(this.packed);
    this.drawDetail();
    const nothing = Object.keys(this.packed).length === 0;
    if (nothing) this.guide.setText("Not sure? Press STARTER for a safe pack.").setColor(TEXT.good);
    else if (this.warnings.length > 0) this.guide.setText(this.warnings[0]).setColor(TEXT.danger);
    else if (this.left() >= 4) this.guide.setText(`Looks safe! ${this.left()} points left for extras.`).setColor(TEXT.good);
    else this.guide.setText("Looks safe! Press NEXT.").setColor(TEXT.good);
  }

  drawDetail() {
    this.detail.destroy();
    this.detail = new Layer(this, { depth: 1 });
    const D = this.detail;
    const item = ITEMS[this.selected];
    const x = 350;
    D.text(x, 50, item.name.toUpperCase(), { size: UI.big, color: TEXT.accent });
    infoButton(D, 612, 60, `item.${this.selected}`, { focus: false });
    D.text(x, 78, "MAKES", { color: TEXT.muted });
    drawChips(D, x + 58, 77, ITEM_MAKES[this.selected] ?? [], { size: UI.body, iconScale: 1.2 });
    D.text(x, 100, "NEEDS", { color: TEXT.muted });
    drawChips(D, x + 58, 99, ITEM_NEEDS[this.selected] ?? [], { size: UI.body, iconScale: 1.2 });
    const g = D.gfx();
    drawIcon(g, "warn", x, 124, 1.2);
    D.text(x + 20, 122, item.tradeoff, { wrap: 262, color: "#ffb347" });
    drawChips(D, x, 160, [item.kind === "building" ? ["clock", `${item.buildDays} DAY${item.buildDays > 1 ? "S" : ""} TO BUILD`, TEXT.muted] : ["check", "WORKS FROM DAY 1", TEXT.muted]], { size: UI.body, iconScale: 1.2 });

    // "Will it last?" Plays a 10-day mission with this pack and no weather.
    D.text(x, 182, "WILL IT LAST 10 DAYS?", { color: TEXT.accent });
    const result = forecast(this.packed, 10);
    LAST.forEach((key, i) => {
      const y = 200 + i * 14;
      const failDay = result[key];
      const share = failDay === null ? 1 : Math.max(0.08, (failDay - 1) / 10);
      drawIcon(g, key, x, y, 1);
      g.fillStyle(0x232a36, 1);
      g.fillRect(x + 18, y + 2, 150, 8);
      g.fillStyle(failDay === null ? ICON_COLOR[key] : PALETTE.danger, 1);
      g.fillRect(x + 18, y + 2, Math.round(150 * share), 8);
      if (failDay === null) drawIcon(g, "check", x + 176, y, 1);
      else D.text(x + 176, y - 3, `DAY ${failDay}`, { color: TEXT.danger });
    });
    const roverOk = result.roverDay !== null;
    drawChips(D, x, 270, [["rover", roverOk ? `READY DAY ${result.roverDay}` : "NOT READY IN 10 DAYS", roverOk ? TEXT.good : TEXT.danger]], { size: UI.body, iconScale: 1.2 });
  }

  next() {
    const go = () => {
      startMission(this);
      this.scene.start(NEXT_SCENE);
    };
    if (Object.keys(this.packed).length === 0) {
      dialog(this, {
        title: "EMPTY SHIP!",
        icon: "crate",
        body: "Press STARTER for a safe pack.",
        buttons: [{ label: "STARTER", onClick: () => this.fillStarter() }, { label: "BACK" }],
      });
      return;
    }
    if (this.warnings.length === 0) {
      go();
      return;
    }
    // Warnings, not blocks: the player may still fly a risky pack.
    dialog(this, {
      title: "SURE?",
      icon: "warn",
      body: this.warnings.slice(0, 2).join("\n"),
      buttons: [{ label: "GO BACK" }, { label: "FLY ANYWAY", onClick: go }],
    });
  }
}
