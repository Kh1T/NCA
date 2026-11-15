import Phaser from "phaser";
import { GROUND_Y, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { niceDate } from "../data/nasa.js";
import { BUILD_ORDER, ITEMS, MAX_ACTIVE_BUILDS, activeBuilds, canStartBuild, cancelBuild, startBuild } from "../sim/buildings.js";
import { ALERTS, alertsForToday, dateForDay, onAlertStart } from "../sim/events.js";
import {
  ACTIONS, ALLOC_KEYS, C, advanceDay, autoPlan, buildPower, canLaunch, clampAlloc, guideLine, powerBudget, powerIn,
  powerNeeds, repairTarget, roverBatteryAtLaunch, useSpareKit,
} from "../sim/rules.js";
import { drawCeres } from "../ui/art.js";
import { BuildQueue } from "../ui/BuildQueue.js";
import { runTutorial } from "../ui/Coach.js";
import { seen } from "../utils/progress.js";
import { SITE_X } from "./Outpost.js";
import { ITEM_MAKES as MAKES, ITEM_NEEDS as NEEDS, drawChips } from "../ui/chips.js";
import { dataBadge } from "../ui/DataBadge.js";
import { ICON_COLOR, ITEM_ICON, drawIcon } from "../ui/icons.js";
import { drawArt, infoButton, openGlossary, openInfo } from "../ui/InfoCard.js";
import { Layer, clearFocusFor, dialog } from "../ui/kit.js";
import { Meter } from "../ui/Meter.js";
import { isMuted, sfx } from "../ui/sfx.js";
import { openSound } from "../ui/SoundPanel.js";
import { celebrateBadges, toast } from "../ui/Toast.js";
import { Slider } from "../ui/Slider.js";
import { Toggle } from "../ui/Toggle.js";

const METERS = ["power", "oxygen", "air", "food", "water", "shield"];
const ALLOC_LABEL = { life: "AIR + WATER", greenhouse: "GREENHOUSE", shield: "SHIELD WALL", science: "SCIENCE" };
const ALLOC_ICON = { life: "oxygen", greenhouse: "food", shield: "shield", science: "science" };
const ALLOC_COLOR = { life: ICON_COLOR.oxygen, greenhouse: ICON_COLOR.food, shield: ICON_COLOR.shield, science: ICON_COLOR.science };
const ACTION_ORDER = ["work", "rest", "repair", "explore", "grow"];
const CHANGE_ICON = { power: "power", oxygen: "oxygen", air: "air", water: "water", food: "food", doseMSv: "dose", science: "science" };

/** HUD, panels and the daily PLAN -> RUN DAY -> ALERT loop for the Outpost scene. */
export class OutpostUi extends Phaser.Scene {
  constructor() {
    super("OutpostUi");
  }

  get state() {
    return this.registry.get("state");
  }

  get world() {
    return this.scene.get("Outpost");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.modal = null;
    this.busy = false;

    const H = (this.hud = new Layer(this, { depth: 100 }));
    H.rect(0, 0, WIDTH, 84, 0x05060a, 0.94);
    H.rect(0, 320, WIDTH, 40, 0x05060a, 0.94);
    this.meters = {};
    const dots = H.gfx();
    METERS.forEach((id, i) => {
      const x = 8 + i * 105;
      this.meters[id] = new Meter(H, { id, x, y: 6, width: 94, onInfo: (key) => this.info(`meter.${key}`) });
      // A tiny "i" says: tap me to learn more.
      dots.fillStyle(0x163050, 1);
      dots.fillCircle(x + 22, 7, 4);
      dots.fillStyle(0x6cc5ff, 1);
      dots.fillRect(x + 21, 6, 2, 4);
    });

    const icons = H.gfx();
    drawIcon(icons, "calendar", 8, 40, 1.4);
    this.dayText = H.text(30, 36, "", { size: UI.big, color: TEXT.accent });
    this.tapArea(H, 4, 36, 110, () => this.info("meter.day"));
    drawIcon(icons, "dose", 140, 40, 1.4);
    this.doseText = H.text(162, 36, "", { size: UI.big });
    this.tapArea(H, 136, 36, 130, () => this.info("meter.dose"));
    drawIcon(icons, "science", 290, 40, 1.4);
    this.scienceText = H.text(312, 36, "", { size: UI.big });
    this.tapArea(H, 286, 36, 80, () => this.info("meter.science"));
    this.dateText = H.text(632, 38, "", { origin: 1, color: TEXT.muted });

    const ceres = H.gfx();
    drawCeres(ceres, 0, 0);
    ceres.setScale(0.6).setPosition(16, 82);
    this.guide = H.text(32, 62, "", { color: TEXT.good });

    this.queue = new BuildQueue(H, { x: 8, y: 324 });
    this.muteButton = H.iconButton(470, 340, isMuted() ? "mute" : "sound", () => this.openSoundPanel(), { size: 34 });
    H.iconButton(510, 340, "book", () => this.openWords(), { size: 34 });
    this.planButton = H.button(586, 340, "PLAN DAY", () => this.openPlan(), { w: 104, h: 34, icon: "ship" });

    this.input.keyboard.on("keydown-P", () => !this.modal && !this.busy && this.openPlan());
    this.input.keyboard.on("keydown-G", () => !this.modal && !this.busy && this.openWords());

    this.newDay();
    this.registry.set("hintsShown", this.state.day === 1 ? [] : this.registry.get("hintsShown") ?? []);
    if (this.state.day === 1 && !seen("outpost")) this.showHelp();
  }

  openSoundPanel() {
    if (this.modal || this.busy) return;
    this.world.frozen = true;
    this.modal = openSound(this, { onClose: () => {
      this.muteButton.setIcon(isMuted() ? "mute" : "sound");
      this.modal = null;
      this.close();
    } });
  }

  tapArea(layer, x, y, w, fn) {
    const hit = layer.rect(x, y, w, 24, 0, 0.001).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", fn);
    return hit;
  }

  // ---------- HUD ----------

  refresh() {
    const s = this.state;
    const low = (key) => s[key] <= C.LOW_SUPPLY;
    this.meters.power.set(s.power, s.batteryCap, { text: `${Math.round(s.power)}`, danger: s.power < 1 && s.buildings.solar.status !== "done" });
    this.meters.oxygen.set(s.oxygen, C.CAP, { danger: low("oxygen") });
    this.meters.air.set(s.air, C.CAP, { danger: low("air") });
    this.meters.food.set(s.food, C.CAP, { danger: low("food") });
    this.meters.water.set(s.water, C.CAP, { danger: low("water") });
    this.meters.shield.set(s.wallLevel, 3, { text: `${s.wallLevel}/3` });
    this.dayText.setText(`DAY ${Math.min(s.day, s.totalDays)}/${s.totalDays}`);
    this.doseText.setText(`${s.doseMSv.toFixed(1)}/${s.doseLimit}`).setColor(s.doseMSv > s.doseLimit * 0.75 ? TEXT.danger : TEXT.white);
    this.scienceText.setText(`${Math.round(s.science)}`);
    this.dateText.setText(niceDate(dateForDay(s.missionDate, Math.min(s.day, s.totalDays))).toUpperCase());
    this.queue.update(s);

    const guide = guideLine(s);
    this.guide.setText(guide.text);
    for (const [id, meter] of Object.entries(this.meters)) meter.pulse(guide.focus === id);
    this.planButton.setSelected(guide.focus === "plan");
    this.world.setFocus(guide.focus === "plan" ? "ship" : guide.focus);
    this.world.refresh();
    this.checkHints();
  }

  info(id) {
    if (this.modal || this.busy) return;
    this.world.frozen = true;
    this.modal = openInfo(this, id, { onClose: () => this.close() });
  }

  newDay() {
    const auto = autoPlan(this.state);
    this.plan = { alloc: auto.alloc, action: "work" };
    this.refresh();
  }

  // ---------- Modal handling ----------

  open(layer) {
    this.modal = layer;
    this.world.frozen = true;
    return layer;
  }

  close() {
    this.modal?.destroy?.();
    this.modal = null;
    if (!this.busy) this.world.frozen = false;
    this.refresh();
  }

  modalLayer() {
    this.modal?.destroy();
    const layer = new Layer(this, { depth: 200, keys: true });
    layer.dim(0.6);
    return this.open(layer);
  }

  /** First visit: a 4-step tutorial that points at the real things on screen. */
  showHelp() {
    const world = this.world;
    const onScreen = (worldX) => worldX - world.cameras.main.scrollX;
    const firstSite = BUILD_ORDER.find((id) => this.state.buildings[id].packed) ?? "solar";
    this.world.frozen = true;
    this.modal = { destroy: () => this.coach?.active && this.coach.finish() };
    this.coach = runTutorial(this, "outpost", [
      { icon: "crew", text: "This is you! Walk with the arrows, or tap the ground.", target: () => ({ x: onScreen(world.player.x) - 16, y: world.player.y - 26, w: 32, h: 50 }) },
      { icon: "build", text: "Walk to a flag. Press E or tap it to build.", target: () => ({ x: onScreen(SITE_X[firstSite]) - 28, y: GROUND_Y - 64, w: 56, h: 66 }) },
      { icon: "info", text: "These bars are your supplies. Tap one to learn more.", target: () => ({ x: 4, y: 2, w: 632, h: 32 }) },
      { icon: "ship", text: "When ready, plan the day and run it!", target: () => ({ x: 534, y: 323, w: 104, h: 34 }) },
    ], { onDone: () => { this.coach = null; this.modal = null; this.close(); } });
  }

  /** Ceres pops up with a short tip when something needs attention, once each. */
  checkHints() {
    if (this.modal || this.busy || this.hintLayer) return;
    if (this.time.now < (this.hintCooldown ?? 0)) return;
    const s = this.state;
    const shown = (this.registry.get("hintsShown") ?? []);
    const hints = [
      ["air-low", s.air <= 2, "air", "Clean air is low! Power the air recycler."],
      ["food-low", s.food <= 2, "food", "Food is low! Grow food in the greenhouse."],
      ["broken", Object.values(s.buildings).some((b) => b.status === "done" && b.health < 100), "wrench", "Something broke! Pick REPAIR in the plan."],
      ["power-low", s.power <= 1, "power", "Power is almost gone!"],
      ["dose-high", s.doseMSv > s.doseLimit * 0.6, "dose", "Radiation is adding up. Rest or shelter more."],
      ["slots", s.day >= 2 && activeBuilds(s).length === 0 && BUILD_ORDER.some((id) => canStartBuild(s, id).ok), "build", "Build slots are empty. Start a building!"],
    ];
    const hint = hints.find(([id, when]) => when && !shown.includes(id));
    if (!hint) return;
    const [id, , icon, text] = hint;
    this.registry.set("hintsShown", [...shown, id]);
    this.hintCooldown = this.time.now + 15000;
    this.showHint(icon, text);
  }

  showHint(icon, text) {
    const L = (this.hintLayer = new Layer(this, { depth: 150 }));
    const panel = L.panel(8, 90, 380, 44, { edge: PALETTE.good, alpha: 1 });
    const g = L.gfx();
    drawCeres(g, 0, 0);
    g.setScale(0.8).setPosition(28, 128);
    drawIcon(L.gfx(), icon, 48, 104, 1.4);
    L.text(72, 101, text, { wrap: 308, color: TEXT.good });
    sfx("hint");
    const all = [...L.items];
    for (const obj of all) obj.x -= 400;
    this.tweens.add({ targets: all, x: "+=400", duration: 300, ease: "Back.easeOut" });
    const hide = () => {
      if (this.hintLayer !== L) return;
      this.hintLayer = null;
      this.tweens.add({ targets: all, alpha: 0, duration: 300, onComplete: () => L.destroy() });
    };
    panel.setInteractive({ useHandCursor: true }).on("pointerdown", hide);
    this.time.delayedCall(5000, hide);
  }

  openWords() {
    if (this.modal || this.busy) return;
    this.world.frozen = true;
    this.modal = { destroy() {} };
    openGlossary(this, null, () => this.close());
  }

  // ---------- Building panel ----------

  openSite(id) {
    if (this.busy) return;
    const s = this.state;
    const item = ITEMS[id];
    const building = s.buildings[id];
    const L = this.modalLayer();
    const x = 80;
    const y = 36;
    const w = 480;
    const h = 288;
    L.panel(x, y, w, h, { edge: PALETTE.accent });

    // Picture of the finished building.
    L.rect(x + 14, y + 14, 140, 130, 0x0b1018, 1).setStrokeStyle(1, PALETTE.panelEdge);
    const art = L.gfx();
    const pictured = building.status === "done" ? { building: id === "rover" ? null : id, rover: id === "rover" } : { icon: ITEM_ICON[id] };
    drawArt(art, pictured.building || pictured.rover ? pictured : { icon: ITEM_ICON[id] }, x + 84, y + 72, building.status === "done" ? 0.9 : 0.8);
    if (building.status !== "done") art.setAlpha(building.packed ? 0.9 : 0.35);

    const tx = x + 170;
    L.text(tx, y + 12, item.name.toUpperCase(), { size: UI.title, color: TEXT.accent });
    infoButton(L, x + w - 24, y + 26, `item.${id}`, { focus: false });

    // Status, as an icon plus a few words.
    let status;
    if (!building.packed) status = ["cross", "NO BLUEPRINT PACKED", TEXT.danger];
    else if (building.status === "idle") status = ["build", `NOT BUILT: ${item.buildDays} DAY${item.buildDays > 1 ? "S" : ""} OF WORK`, TEXT.muted];
    else if (building.status === "building") status = ["clock", `BUILDING: ${Math.ceil(building.daysLeft)} DAY${Math.ceil(building.daysLeft) > 1 ? "S" : ""} LEFT`, TEXT.accent];
    else if (building.health < 100) status = ["broken", "BROKEN: HALF POWER", TEXT.danger];
    else status = building.on ? ["check", "WORKING", TEXT.good] : ["mute", "SWITCHED OFF", TEXT.muted];
    drawChips(L, tx, y + 50, [status], { size: UI.big });

    L.text(tx, y + 82, "MAKES", { color: TEXT.muted });
    drawChips(L, tx + 62, y + 80, MAKES[id] ?? []);
    L.text(tx, y + 108, "NEEDS", { color: TEXT.muted });
    drawChips(L, tx + 62, y + 106, NEEDS[id] ?? []);
    const catchG = L.gfx();
    drawIcon(catchG, "warn", tx, y + 136, 1.4);
    L.text(tx + 24, y + 134, item.tradeoff, { wrap: w - 196, color: "#ffb347" });

    const by = y + h - 26;
    const buttons = [];
    const add = (label, fn, o = {}) => buttons.push({ label, fn, o });
    const noteY = y + 168;

    if (building.packed && building.status === "idle") {
      const check = canStartBuild(s, id);
      add("BUILD", () => {
        startBuild(s, id);
        sfx("build");
        this.close();
      }, { enabled: check.ok, w: 120, icon: "build" });
      if (!check.ok) drawChips(L, x + 16, noteY, [["lock", check.reason.toUpperCase(), TEXT.danger]], { size: UI.body });
      else this.slotPips(L, x + 16, noteY, activeBuilds(s).length);
      // Dependencies are warnings, not blocks.
      if (id === "oxygen" && s.buildings.water.status === "idle") drawChips(L, x + 16, noteY + 26, [["water", "NEEDS WATER TO WORK", "#ffb347"]], { size: UI.body });
    } else if (building.status === "building") {
      add("STOP", () => {
        cancelBuild(s, id);
        this.close();
      }, { w: 100, icon: "cross" });
      L.text(x + 16, noteY, "Stopping frees a slot but loses the work.", { color: TEXT.muted });
    } else if (building.status === "done") {
      if (id === "rover") {
        add("LAUNCH!", () => this.confirmLaunch(), { w: 140, enabled: canLaunch(s), icon: "rover" });
        L.text(x + 16, noteY, "Drive to the far side to take photos.", { color: TEXT.muted, wrap: w - 32 });
      } else if (id !== "shield") {
        drawChips(L, x + 16, noteY + 2, [["power", "POWER"]]);
        new Toggle(L, { x: x + 110, y: noteY, value: building.on, onChange: (value) => {
          building.on = value;
          this.plan.alloc = clampAlloc(s, this.plan.alloc);
          this.world.refresh();
        } });
      } else {
        drawChips(L, x + 16, noteY, [["shield", `WALL ${s.wallLevel}/3: POWER IT IN THE PLAN`]], { size: UI.body });
      }
      if (building.health < 100 && s.kits.spares > 0) {
        add(`FIX (${s.kits.spares})`, () => {
          building.health = 100;
          s.kits.spares -= 1;
          s.log.push({ day: s.day, type: "repair", target: item.name });
          sfx("good");
          this.close();
        }, { w: 120, icon: "wrench" });
      } else if (building.health < 100) {
        drawChips(L, x + 16, noteY + 36, [["wrench", "NO SPARES: PICK REPAIR IN THE PLAN", "#ffb347"]], { size: UI.body });
      }
    }
    add("CLOSE", () => this.close(), { w: 100, key: "ESCAPE" });

    let bx = x + w - 14;
    const made = [];
    for (const b of [...buttons].reverse()) {
      const bw = b.o.w ?? 100;
      made.unshift(L.button(bx - bw / 2, by, b.label, b.fn, { ...b.o, w: bw, h: 36 }));
      bx -= bw + 10;
    }
    // Focus order should read left to right.
    L.focus.items = [...L.focus.items.filter((i) => !made.includes(i)), ...made];
    // Start on the main action if it can be used, otherwise on CLOSE.
    L.focusFirst(made[0].enabled && made.length > 1 ? made[0] : made[made.length - 1]);
  }

  /** Three boxes: which build slots are in use. */
  slotPips(L, x, y, used) {
    const g = L.gfx();
    drawIcon(g, "build", x, y + 2, 1.4);
    for (let i = 0; i < MAX_ACTIVE_BUILDS; i += 1) {
      g.fillStyle(i < used ? PALETTE.accent : 0x232a36, 1);
      g.fillRect(x + 26 + i * 22, y + 2, 18, 18);
    }
    L.text(x + 26 + MAX_ACTIVE_BUILDS * 22 + 6, y + 2, `${used} OF ${MAX_ACTIVE_BUILDS} SLOTS BUSY`, { color: TEXT.muted });
  }

  confirmLaunch() {
    const s = this.state;
    const daysLeft = s.totalDays - s.day + 1;
    this.modal?.destroy();
    this.open(dialog(this, {
      title: "LAUNCH?",
      icon: "rover",
      body: `No coming back to base!\nRover battery: ${roverBatteryAtLaunch(s)}%. Days left: ${daysLeft}.`,
      buttons: [
        { label: "NOT YET", onClick: () => this.close() },
        { label: "LAUNCH!", icon: "rover", onClick: () => this.launch() },
      ],
    }));
  }

  launch() {
    const s = this.state;
    s.phase = 3;
    s.roverBattery = roverBatteryAtLaunch(s);
    s.stats.daysSurvived = Math.max(s.stats.daysSurvived, s.day - 1);
    s.log.push({ day: s.day, type: "phase", phase: 3 });
    sfx("win");
    this.modal = null;
    this.scene.stop("Outpost");
    this.scene.start("PhotoMission");
  }

  // ---------- Plan panel ----------

  openPlan() {
    if (this.busy) return;
    const s = this.state;
    const L = this.modalLayer();
    const x = 24;
    const y = 8;
    const w = 592;
    L.panel(x, y, w, 344, { edge: PALETTE.accent });
    L.text(x + 14, y + 6, `PLAN DAY ${s.day}`, { size: UI.title, color: TEXT.accent });

    this.plan.alloc = clampAlloc(s, this.plan.alloc);
    const needs = powerNeeds(s);
    const budget = powerBudget(s);
    const builds = buildPower(s);
    // Power to share, shown as a sum of icons and numbers.
    drawChips(L, x + 230, y + 12, [
      ["battery", `${Math.round(s.power)}`],
      ["sun", `+${powerIn(s)}`],
      ...(builds ? [["build", `-${builds}`]] : []),
      ["power", `= ${budget} TO SHARE`, TEXT.accent],
    ], { gap: 10 });

    const sliders = {};
    const counts = {};
    const sumOthers = (key) => ALLOC_KEYS.reduce((sum, k) => sum + (k === key ? 0 : this.plan.alloc[k]), 0);
    const leftText = L.text(x + 14, y + 178, "", { color: TEXT.muted });
    const updateLeft = () => {
      const used = ALLOC_KEYS.reduce((sum, k) => sum + this.plan.alloc[k], 0);
      const left = budget - used;
      leftText.setText(`SPARE: ${left} → BATTERY (HOLDS ${s.batteryCap})`).setColor(left > s.batteryCap ? "#ffb347" : TEXT.muted);
      for (const key of ALLOC_KEYS) counts[key].setText(needs[key] > 0 ? `${this.plan.alloc[key]}/${needs[key]}` : "");
    };
    const g = L.gfx();
    ALLOC_KEYS.forEach((key, i) => {
      const ry = y + 50 + i * 31;
      drawIcon(g, ALLOC_ICON[key], x + 14, ry + 3, 1.4);
      L.text(x + 38, ry + 1, ALLOC_LABEL[key], { color: needs[key] > 0 ? TEXT.white : TEXT.muted });
      if (needs[key] > 0) {
        sliders[key] = new Slider(L, {
          x: x + 170, y: ry, max: needs[key], value: this.plan.alloc[key], color: ALLOC_COLOR[key], pip: 20,
          limit: () => budget - sumOthers(key),
          onChange: (value) => {
            this.plan.alloc[key] = value;
            updateLeft();
          },
        });
      } else {
        L.text(x + 170, ry + 1, key === "shield" ? (s.wallLevel >= 3 ? "WALL IS FULL" : "BUILD THE WALL FIRST") : "NOTHING BUILT YET", { color: "#4c5566" });
      }
      counts[key] = L.text(x + w - 14, ry + 1, "", { color: TEXT.accent, origin: 1, size: UI.big });
    });
    updateLeft();

    L.text(x + 14, y + 202, "PICK ONE JOB", { color: TEXT.accent });
    const fix = repairTarget(s);
    const usable = {
      work: true, rest: true, explore: true,
      repair: Boolean(fix),
      grow: s.buildings.greenhouse.status === "done",
    };
    if (!usable[this.plan.action]) this.plan.action = "work";
    const actionButtons = {};
    let chipLayer = null;
    const showAction = () => {
      for (const [id, button] of Object.entries(actionButtons)) button.setSelected(id === this.plan.action);
      chipLayer?.destroy();
      chipLayer = new Layer(this, { depth: 201 });
      const action = ACTIONS[this.plan.action];
      const gain = drawChips(chipLayer, x + 14, y + 266, action.gain.map(([i, t]) => [i, t, TEXT.good]));
      drawChips(chipLayer, x + 14 + gain.width + 30, y + 266, action.cost.map(([i, t]) => [i, t, TEXT.danger]));
      if (this.plan.action === "repair" && fix) chipLayer.text(x + w - 14, y + 268, `FIXES ${fix.label.toUpperCase()}`, { origin: 1, color: TEXT.muted });
    };
    ACTION_ORDER.forEach((id, i) => {
      actionButtons[id] = L.button(x + 70 + i * 113, y + 238, ACTIONS[id].label.toUpperCase(), () => {
        this.plan.action = id;
        showAction();
      }, { w: 106, h: 36, icon: ACTIONS[id].icon, enabled: usable[id] });
    });
    showAction();
    const baseDestroy = L.destroy.bind(L);
    L.destroy = () => {
      chipLayer?.destroy();
      baseDestroy();
    };

    const by = y + 318;
    if (fix && s.kits.spares > 0) {
      L.button(x + 82, by, `SPARE (${s.kits.spares})`, () => {
        useSpareKit(s);
        sfx("good");
        this.openPlan();
      }, { w: 140, h: 36, icon: "wrench" });
    }
    L.button(x + 250, by, "CERES PICKS", () => {
      this.plan = autoPlan(s);
      this.openPlan();
    }, { w: 150, h: 36 });
    L.button(x + 390, by, "CLOSE", () => this.close(), { w: 100, h: 36, key: "ESCAPE" });
    const run = L.button(x + w - 76, by, "RUN DAY", () => this.runDay(), { w: 130, h: 36, key: "R", icon: "play" });
    L.focusFirst(run);
    this.coach = runTutorial(this, "plan", [
      { icon: "power", text: "This is today's power. Share it out.", target: () => ({ x: x + 226, y: y + 8, w: 360, h: 28 }) },
      { icon: "air", text: "Tap the boxes to power each part of the base.", target: () => ({ x: x + 8, y: y + 46, w: w - 16, h: 126 }) },
      { icon: "build", text: "Pick one job for the crew today.", target: () => ({ x: x + 8, y: y + 218, w: w - 16, h: 42 }) },
      { icon: "play", text: "Press RUN DAY to see what happens!", target: () => ({ x: x + w - 141, y: by - 18, w: 130, h: 36 }) },
    ], { onDone: () => { this.coach = null; } });
  }

  // ---------- The day ----------

  runDay() {
    if (this.busy) return;
    this.busy = true;
    this.modal?.destroy();
    this.modal = null;
    this.world.frozen = true;
    const { alerts, notices } = alertsForToday(this.state);
    this.todayNotices = notices;
    this.alertNotes = [];
    this.nextAlert([...alerts]);
  }

  nextAlert(queue) {
    const event = queue.shift();
    if (!event) {
      this.finishDay();
      return;
    }
    onAlertStart(this.state, event);
    this.world.refresh();
    sfx(`alert-${event.id}`);
    this.scene.launch("Alert", {
      event,
      onDone: (note) => {
        this.alertNotes.push({ icon: ALERTS[event.id].icon, text: note });
        this.refresh();
        this.nextAlert(queue);
      },
    });
    this.scene.bringToTop("Alert");
  }

  finishDay() {
    const before = this.state;
    this.world.playDay(before.day + 1, () => {
      const { state: next, report } = advanceDay(before, this.plan);
      this.registry.set("state", next);
      this.refresh();
      this.showSummary(report, before.phase);
      // Celebrate each finished building, then any badge just earned.
      for (const id of report.completed) toast(this, { icon: ITEM_ICON[id], title: `${ITEMS[id].name} built!` });
      celebrateBadges(this, next, "day");
    });
  }

  showSummary(report, phaseBefore) {
    const s = this.state;
    const L = this.modalLayer();
    const x = 60;
    const y = 24;
    const w = 520;
    const h = 312;
    L.panel(x, y, w, h, { edge: PALETTE.accent });
    L.text(x + 14, y + 8, `DAY ${report.day} DONE`, { size: UI.title, color: TEXT.accent });

    // What went up and down, as icons with + and - numbers.
    const chips = [];
    for (const [key, icon] of Object.entries(CHANGE_ICON)) {
      const value = report.changes[key];
      if (!value) continue;
      const good = key === "doseMSv" ? value < 0 : value > 0;
      chips.push([icon, `${value > 0 ? "+" : ""}${value}`, key === "doseMSv" ? "#ffb347" : good ? TEXT.good : TEXT.danger]);
    }
    const row = drawChips(L, x + 16, y + 50, chips, { maxWidth: w - 32 });
    const supplies = ["oxygen", "air", "water", "food"].reduce((sum, key) => sum + (report.changes[key] ?? 0), 0);
    sfx(supplies < 0 ? "loss" : "gain");
    let cy = y + 50 + row.height + 12;
    const g = L.gfx();
    g.fillStyle(PALETTE.panelEdge, 1);
    g.fillRect(x + 14, cy - 6, w - 28, 1);

    const lines = [];
    for (const id of report.completed) lines.push({ icon: ITEM_ICON[id], text: `${ITEMS[id].name} built!`, color: TEXT.good });
    for (const note of this.alertNotes) lines.push({ icon: note.icon, text: note.text, color: TEXT.white });
    for (const note of report.notes) lines.push({ icon: "info", text: note, color: TEXT.white });
    for (const line of lines.slice(0, 5)) {
      drawIcon(g, line.icon, x + 16, cy + 2, 1.4);
      const text = L.text(x + 42, cy, line.text, { wrap: w - 60, color: line.color });
      cy += Math.max(22, text.height + 6);
    }
    for (const notice of (this.todayNotices ?? []).slice(0, 1)) {
      if (cy > y + h - 80) break;
      drawIcon(g, notice.kind === "gst" ? "earth" : "sun", x + 16, cy + 2, 1.4);
      const text = L.text(x + 42, cy, notice.short ?? notice.text, { wrap: w - 60, color: TEXT.muted });
      cy += text.height + 4;
      dataBadge(L, x + 42, cy, { label: notice.badge, real: true, link: notice.link }, { maxWidth: w - 60 });
    }

    let label = "NEXT DAY";
    if (s.outcome?.kind === "evacuated") label = "OH NO...";
    else if (s.outcome) label = "RESULTS";
    const next = L.button(x + w - 80, y + h - 26, label, () => this.afterDay(phaseBefore), { w: 136, h: 36, key: "ENTER", icon: "play" });
    L.focusFirst(next);
  }

  afterDay(phaseBefore) {
    const s = this.state;
    this.modal?.destroy();
    this.modal = null;
    this.busy = false;

    if (s.outcome?.kind === "evacuated") {
      sfx("bad");
      this.scene.stop("Outpost");
      this.scene.start("Evacuated");
      return;
    }
    if (s.outcome) {
      this.scene.stop("Outpost");
      this.scene.start("Debrief");
      return;
    }
    if (s.day > s.totalDays) {
      // The rover is ready and this was the last day: go now or never.
      this.open(dialog(this, {
        title: "LAST CHANCE!",
        icon: "rover",
        body: "The rover must leave now to reach the far side.",
        buttons: [{ label: "LAUNCH!", icon: "rover", onClick: () => this.launch() }],
      }));
      return;
    }
    this.world.frozen = false;
    this.newDay();
    if (phaseBefore === 1 && s.phase === 2) {
      this.world.frozen = true;
      this.scene.launch("RoverBuild", { onDone: () => { this.world.frozen = false; } });
      this.scene.bringToTop("RoverBuild");
    }
  }
}
