import Phaser from "phaser";
import { PALETTE, TEXT } from "../constants.js";
import { budgetOf, getMission } from "../data/mission.js";
import { BUDGETS, ITEMS, ITEM_ORDER, packCost, packWarnings, starterPlan } from "../sim/buildings.js";
import { forecast } from "../sim/rules.js";
import { drawStars } from "../ui/backdrop.js";
import { ICON_COLOR, drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor, dialog } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const ITEM_ICON = {
  solar: "power", water: "water", oxygen: "oxygen", air: "air", greenhouse: "food", shield: "shield",
  rover: "rock", antenna: "dish", battery: "power", spares: "thermo", foodpack: "food",
};
const ROW_Y = 52;
const ROW_H = 21;
const LAST = [
  ["power", "POWER"], ["oxygen", "OXYGEN"], ["air", "AIR"], ["water", "WATER"], ["food", "FOOD"],
];

/** Screen 1 of 3: spend Mission Points on blueprints and kits. */
export class Blueprints extends Phaser.Scene {
  constructor() {
    super("Blueprints");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.mission = getMission(this);
    if (Object.keys(this.mission.packed).length === 0) this.mission.packed = {};
    this.packed = this.mission.packed;
    this.selected = "solar";

    drawStars(this, { seed: "blueprints" });
    this.layer = new Layer(this, { keys: true });
    const L = this.layer;
    L.text(8, 8, "1/3 PACK YOUR BLUEPRINTS", { size: 16, color: TEXT.accent });
    this.pointsText = L.text(632, 8, "", { origin: 1 });
    this.pointsHint = L.text(632, 20, "MISSION POINTS LEFT", { origin: 1, color: TEXT.muted });

    L.text(8, 34, "BUDGET:", { color: TEXT.muted });
    this.difficultyButtons = {};
    Object.keys(BUDGETS).forEach((id, i) => {
      this.difficultyButtons[id] = L.button(112 + i * 92, 37, `${id.toUpperCase()} ${BUDGETS[id]}`, () => this.setDifficulty(id), { w: 86, h: 14 });
    });

    this.rows = ITEM_ORDER.map((id, i) => this.makeRow(id, ROW_Y + i * ROW_H));

    L.panel(340, 48, 292, 240);
    this.detail = new Layer(this, { depth: 1 });

    this.guide = L.text(8, 296, "", { wrap: 624, color: TEXT.good });
    L.button(70, 340, "STARTER PLAN", () => this.fillStarter(), { w: 124, key: "S" });
    L.button(196, 340, "CLEAR", () => this.clearAll(), { w: 64 });
    L.button(470, 340, "< BACK", () => this.scene.start("Title"), { w: 80, key: "ESCAPE" });
    this.nextButton = L.button(580, 340, "NEXT >", () => this.next(), { w: 96, key: "ENTER" });

    this.refresh();
    L.focusFirst(this.rows[0]);
  }

  makeRow(id, y) {
    const L = this.layer;
    const item = ITEMS[id];
    const bg = L.rect(4, y - 3, 330, ROW_H - 1, 0x1a2230, 0).setInteractive({ useHandCursor: true });
    const icon = L.gfx();
    drawIcon(icon, ITEM_ICON[id], 10, y);
    L.text(28, y + 2, item.name.toUpperCase(), {});
    L.text(232, y + 2, `${item.cost}`, { origin: 1, color: TEXT.accent });
    const tag = L.text(236, y + 2, item.core || item.required ? "NEED" : "", { color: TEXT.muted });
    const minus = L.text(276, y + 2, "-", { color: TEXT.accent }).setInteractive({ useHandCursor: true });
    const count = L.text(300, y + 2, "0", { origin: 0.5 });
    const plus = L.text(318, y + 2, "+", { color: TEXT.accent }).setInteractive({ useHandCursor: true });

    const row = {
      id,
      bg,
      count,
      tag,
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

  setDifficulty(id) {
    this.mission.difficulty = id;
    // Drop extras if the smaller budget no longer covers the pack.
    while (this.left() < 0) {
      const extra = [...ITEM_ORDER].reverse().find((itemId) => (this.packed[itemId] ?? 0) > 0);
      if (!extra) break;
      this.packed[extra] -= 1;
      if (this.packed[extra] === 0) delete this.packed[extra];
    }
    this.refresh();
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
    this.pointsText.setText(`${this.left()} / ${budgetOf(this.mission)}`);
    for (const [id, button] of Object.entries(this.difficultyButtons)) button.setSelected(id === this.mission.difficulty);
    for (const row of this.rows) this.paintRow(row);
    this.warnings = packWarnings(this.packed);
    this.drawDetail();
    const nothing = Object.keys(this.packed).length === 0;
    if (nothing) this.guide.setText("CERES: Not sure what to bring? Press STARTER PLAN for a safe pack.").setColor(TEXT.good);
    else if (this.warnings.length > 0) this.guide.setText(`CERES: ${this.warnings[0]}`).setColor(TEXT.danger);
    else if (this.left() >= 4) this.guide.setText(`CERES: Looks safe! You have ${this.left()} points left for a backup.`).setColor(TEXT.good);
    else this.guide.setText("CERES: Looks safe! Every point is spent. Press NEXT.").setColor(TEXT.good);
  }

  drawDetail() {
    this.detail.destroy();
    this.detail = new Layer(this, { depth: 1 });
    const D = this.detail;
    const item = ITEMS[this.selected];
    const x = 348;
    D.text(x, 56, item.name.toUpperCase(), { color: TEXT.accent });
    D.text(x, 70, `MAKES: ${item.makes}`, { wrap: 276 });
    D.text(x, 94, `NEEDS: ${item.needs}`, { wrap: 276, color: TEXT.muted });
    D.text(x, 118, `CATCH: ${item.tradeoff}`, { wrap: 276, color: "#ffb347" });
    const buildLine = item.kind === "building" ? `BUILD TIME: ${item.buildDays} DAY${item.buildDays > 1 ? "S" : ""}` : "KIT: WORKS FROM DAY 1";
    D.text(x, 152, buildLine, { color: TEXT.muted });

    // "Will it last?" Plays a 10-day mission with this pack and no weather.
    D.text(x, 172, "WILL IT LAST? (10 DAYS, NO WEATHER)", { color: TEXT.accent });
    const result = forecast(this.packed, 10);
    const g = D.gfx();
    LAST.forEach(([key, label], i) => {
      const y = 186 + i * 13;
      const failDay = result[key];
      const share = failDay === null ? 1 : Math.max(0.08, (failDay - 1) / 10);
      drawIcon(g, key, x, y - 2, 0.75);
      D.text(x + 14, y, label, { color: TEXT.muted });
      g.fillStyle(0x232a36, 1);
      g.fillRect(x + 70, y, 110, 7);
      g.fillStyle(failDay === null ? ICON_COLOR[key] : PALETTE.danger, 1);
      g.fillRect(x + 70, y, Math.round(110 * share), 7);
      const verdict = failDay === null ? "LASTS" : key === "power" ? `SHORT D${failDay}` : `OUT DAY ${failDay}`;
      D.text(x + 186, y, verdict, { color: failDay === null ? TEXT.good : TEXT.danger });
    });
    const rover = result.roverDay === null ? "ROVER: NOT READY IN 10 DAYS" : `ROVER READY: DAY ${result.roverDay}`;
    D.text(x, 256, rover, { color: result.roverDay === null ? TEXT.danger : TEXT.good });
    D.text(x, 270, "GAME NUMBERS ARE SIMPLIFIED", { color: TEXT.muted });
  }

  next() {
    const go = () => this.scene.start("WeatherDeck");
    if (Object.keys(this.packed).length === 0) {
      dialog(this, {
        title: "NOTHING PACKED",
        body: "Your ship is empty! Press STARTER PLAN to fill in a safe pack, then change it if you like.",
        buttons: [{ label: "STARTER PLAN", onClick: () => this.fillStarter() }, { label: "BACK" }],
      });
      return;
    }
    if (this.warnings.length === 0) {
      go();
      return;
    }
    // Warnings, not blocks: the player may still fly a risky pack.
    dialog(this, {
      title: "ARE YOU SURE?",
      body: `${this.warnings.slice(0, 3).join("\n\n")}\n\nYou can still go. It will be a hard mission.`,
      buttons: [{ label: "GO BACK" }, { label: "FLY ANYWAY", onClick: go }],
    });
  }
}
