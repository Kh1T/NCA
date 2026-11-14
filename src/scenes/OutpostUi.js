import Phaser from "phaser";
import { HEIGHT, PALETTE, TEXT, WIDTH } from "../constants.js";
import { niceDate } from "../data/nasa.js";
import { ITEMS, MAX_ACTIVE_BUILDS, activeBuilds, canStartBuild, cancelBuild, startBuild } from "../sim/buildings.js";
import { ALERTS, alertsForToday, dateForDay, onAlertStart } from "../sim/events.js";
import {
  ACTIONS, ALLOC_KEYS, C, advanceDay, autoPlan, buildPower, canLaunch, clampAlloc, guideLine, powerBudget, powerIn,
  powerNeeds, repairTarget, roverBatteryAtLaunch, useSpareKit,
} from "../sim/rules.js";
import { drawCeres } from "../ui/art.js";
import { BuildQueue } from "../ui/BuildQueue.js";
import { dataBadge } from "../ui/DataBadge.js";
import { ICON_COLOR, drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor, dialog, openLink } from "../ui/kit.js";
import { Meter } from "../ui/Meter.js";
import { isMuted, sfx, toggleMute } from "../ui/sfx.js";
import { Slider } from "../ui/Slider.js";
import { Toggle } from "../ui/Toggle.js";
import { METER_INFO, showGlossary, showTooltip } from "../ui/Tooltip.js";

const METERS = [
  ["power", "POWER"], ["oxygen", "OXYGEN"], ["air", "AIR"], ["food", "FOOD"], ["water", "WATER"], ["shield", "SHIELD"],
];
const ALLOC_LABEL = { life: "LIFE SUPPORT", greenhouse: "GREENHOUSE", shield: "SHIELD WALL", science: "SCIENCE" };
const ALLOC_COLOR = { life: ICON_COLOR.oxygen, greenhouse: ICON_COLOR.food, shield: ICON_COLOR.shield, science: ICON_COLOR.science };
const ACTION_ORDER = ["work", "rest", "repair", "explore", "grow"];
const CHANGE_LABEL = { power: "POWER", oxygen: "OXYGEN", air: "AIR", water: "WATER", food: "FOOD", doseMSv: "DOSE", science: "SCIENCE" };

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
    H.rect(0, 0, WIDTH, 60, 0x05060a, 0.94);
    H.rect(0, 322, WIDTH, 38, 0x05060a, 0.94);
    this.meters = {};
    METERS.forEach(([id, label], i) => {
      this.meters[id] = new Meter(H, { id, label, x: 5 + i * 106, y: 6, width: 102, onInfo: (key) => this.info(key) });
    });
    this.dayText = H.text(5, 31, "", { color: TEXT.accent });
    const icons = H.gfx();
    drawIcon(icons, "dose", 112, 29, 0.9);
    this.doseText = H.text(126, 31, "");
    const doseHit = H.rect(108, 28, 170, 12, 0, 0.001).setInteractive({ useHandCursor: true });
    doseHit.on("pointerdown", () => this.info("dose"));
    drawIcon(icons, "science", 300, 29, 0.9);
    this.scienceText = H.text(314, 31, "");
    const scienceHit = H.rect(296, 28, 110, 12, 0, 0.001).setInteractive({ useHandCursor: true });
    scienceHit.on("pointerdown", () => this.info("science"));
    this.dateText = H.text(635, 31, "", { origin: 1, color: TEXT.muted });

    const ceres = H.gfx();
    drawCeres(ceres, 12, 60);
    ceres.setScale(0.5).setPosition(6, 28);
    this.guide = H.text(26, 47, "", { color: TEXT.good });

    this.queue = new BuildQueue(H, { x: 5, y: 337 });
    this.planButton = H.button(566, 345, "P: PLAN + RUN DAY", () => this.openPlan(), { w: 140, h: 20 });
    H.button(452, 345, "G: WORDS", () => this.openWords(), { w: 76, h: 20 });
    this.muteButton = H.button(380, 345, isMuted() ? "SOUND OFF" : "SOUND ON", () => this.muteButton.setLabel(toggleMute() ? "SOUND OFF" : "SOUND ON"), { w: 76, h: 20 });

    this.input.keyboard.on("keydown-P", () => !this.modal && !this.busy && this.openPlan());
    this.input.keyboard.on("keydown-G", () => !this.modal && !this.busy && this.openWords());

    this.newDay();
    if (this.state.day === 1 && !this.registry.get("outpostHelpShown")) {
      this.registry.set("outpostHelpShown", true);
      this.showHelp();
    }
  }

  // ---------- HUD ----------

  refresh() {
    const s = this.state;
    const low = (key) => s[key] <= C.LOW_SUPPLY;
    this.meters.power.set(s.power, s.batteryCap, { text: `${Math.round(s.power)}/${s.batteryCap}`, danger: s.power < 1 && s.buildings.solar.status !== "done" });
    this.meters.oxygen.set(s.oxygen, C.CAP, { danger: low("oxygen") });
    this.meters.air.set(s.air, C.CAP, { danger: low("air") });
    this.meters.food.set(s.food, C.CAP, { danger: low("food") });
    this.meters.water.set(s.water, C.CAP, { danger: low("water") });
    this.meters.shield.set(s.wallLevel, 3, { text: s.wallLevel > 0 ? `${s.wallLevel}/3` : "SHIP" });
    this.dayText.setText(`DAY ${Math.min(s.day, s.totalDays)}/${s.totalDays}`);
    this.doseText.setText(`DOSE ${s.doseMSv.toFixed(1)}/${s.doseLimit} mSv`).setColor(s.doseMSv > s.doseLimit * 0.75 ? TEXT.danger : TEXT.white);
    this.scienceText.setText(`SCIENCE ${Math.round(s.science)}`);
    this.dateText.setText(niceDate(dateForDay(s.missionDate, Math.min(s.day, s.totalDays))).toUpperCase());
    this.queue.update(s);

    const guide = guideLine(s);
    this.guide.setText(guide.text);
    for (const [id, meter] of Object.entries(this.meters)) meter.pulse(guide.focus === id);
    this.planButton.setSelected(guide.focus === "plan");
    this.world.setFocus(guide.focus === "plan" ? "ship" : guide.focus);
    this.world.refresh();
  }

  info(key) {
    if (this.modal || this.busy) return;
    const [title, body] = METER_INFO[key];
    showTooltip(this, title, body, WIDTH / 2, 62);
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
    this.modal?.destroy();
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

  showHelp() {
    this.open(dialog(this, {
      title: "HOW TO PLAY",
      body: "WALK: arrow keys or A / D. Or click the ground.\nJUMP: up arrow, W or Space.\nUSE: stand by a site or the ship and press E.\n\n1. Walk to a flagged site and start a build (3 at once).\n2. Open the PLAN at the ship, or press P.\n3. Press RUN DAY and watch what happens.\n\nClick any bar at the top to learn what it means.",
      buttons: [{ label: "LET'S GO", onClick: () => this.close() }],
    }));
  }

  openWords() {
    if (this.modal || this.busy) return;
    this.open(showGlossary(this, () => {
      this.modal = null;
      this.world.frozen = false;
    }));
  }

  // ---------- Building panel ----------

  openSite(id) {
    if (this.busy) return;
    const s = this.state;
    const item = ITEMS[id];
    const building = s.buildings[id];
    const L = this.modalLayer();
    const x = 100;
    const y = 66;
    L.panel(x, y, 440, 236, { edge: PALETTE.accent });
    L.text(x + 14, y + 12, item.name.toUpperCase(), { size: 16, color: TEXT.accent });

    let status;
    if (!building.packed) status = "NO BLUEPRINT PACKED. You cannot build this on this mission.";
    else if (building.status === "idle") status = `NOT BUILT YET. Takes ${item.buildDays} day${item.buildDays > 1 ? "s" : ""} and 1 power per day.`;
    else if (building.status === "building") status = `BEING BUILT: ${building.daysLeft.toFixed(1)} day(s) of work left.`;
    else if (building.health < 100) status = "BROKEN: it runs at half output until repaired.";
    else status = building.on ? "RUNNING." : "SWITCHED OFF.";
    L.text(x + 14, y + 38, status, { wrap: 412, color: building.health < 100 ? TEXT.danger : TEXT.good });
    L.text(x + 14, y + 68, `MAKES: ${item.makes}`, { wrap: 412 });
    L.text(x + 14, y + 92, `NEEDS: ${item.needs}${item.power ? ` (${item.power} power/day)` : ""}`, { wrap: 412, color: TEXT.muted });
    L.text(x + 14, y + 116, `CATCH: ${item.tradeoff}`, { wrap: 412, color: "#ffb347" });

    const by = y + 212;
    const buttons = [];
    const add = (label, fn, o = {}) => buttons.push({ label, fn, o });

    if (building.packed && building.status === "idle") {
      const check = canStartBuild(s, id);
      add("START BUILD", () => {
        startBuild(s, id);
        sfx("build");
        this.close();
      }, { enabled: check.ok, w: 120 });
      if (!check.ok) L.text(x + 14, y + 150, check.reason, { wrap: 412, color: TEXT.danger });
      else L.text(x + 14, y + 150, `Build slots in use: ${activeBuilds(s).length} of ${MAX_ACTIVE_BUILDS}.`, { color: TEXT.muted });
      // Dependencies are warnings, not blocks.
      if (id === "oxygen" && s.buildings.water.status === "idle") L.text(x + 14, y + 164, "Warning: without the water extractor this makes nothing.", { wrap: 412, color: "#ffb347" });
    } else if (building.status === "building") {
      add("STOP BUILD", () => {
        cancelBuild(s, id);
        this.close();
      }, { w: 110 });
      L.text(x + 14, y + 150, "Stopping frees the slot but loses the work done so far.", { wrap: 412, color: TEXT.muted });
    } else if (building.status === "done") {
      if (id === "rover") {
        add("LAUNCH PHOTO MISSION", () => this.confirmLaunch(), { w: 180, enabled: canLaunch(s) });
        L.text(x + 14, y + 150, "Drive to the far side when you are ready. Staying longer earns science but adds radiation.", { wrap: 412, color: TEXT.muted });
      } else if (id !== "shield") {
        L.text(x + 14, y + 154, "POWER SWITCH", { color: TEXT.muted });
        new Toggle(L, { x: x + 126, y: y + 150, value: building.on, onChange: (value) => {
          building.on = value;
          this.plan.alloc = clampAlloc(s, this.plan.alloc);
          this.world.refresh();
        } });
      } else {
        L.text(x + 14, y + 150, `Wall level ${s.wallLevel} of 3. Give it power in the PLAN to make it thicker.`, { wrap: 412, color: TEXT.muted });
      }
      if (building.health < 100 && s.kits.spares > 0) {
        add(`USE SPARE KIT (${s.kits.spares})`, () => {
          building.health = 100;
          s.kits.spares -= 1;
          s.log.push({ day: s.day, type: "repair", target: item.name });
          sfx("good");
          this.close();
        }, { w: 160 });
      } else if (building.health < 100) {
        L.text(x + 14, y + 178, "No spare kits. Choose REPAIR as today's action in the PLAN.", { wrap: 412, color: "#ffb347" });
      }
    }
    if (item.learn) add("LEARN MORE", () => openLink(item.learn.url), { w: 100 });
    add("CLOSE", () => this.close(), { w: 70, key: "ESCAPE" });

    let bx = x + 440 - 12;
    const made = [];
    for (const b of [...buttons].reverse()) {
      const w = b.o.w ?? 90;
      made.unshift(L.button(bx - w / 2, by, b.label, b.fn, { ...b.o, w }));
      bx -= w + 8;
    }
    // Focus order should read left to right.
    L.focus.items = [...L.focus.items.filter((i) => !made.includes(i)), ...made];
    // Start on the main action if it can be used, otherwise on CLOSE.
    L.focusFirst(made[0].enabled && made.length > 1 && buttons[0].label !== "LEARN MORE" ? made[0] : made[made.length - 1]);
  }

  confirmLaunch() {
    const s = this.state;
    const daysLeft = s.totalDays - s.day + 1;
    this.modal?.destroy();
    this.open(dialog(this, {
      title: "LAUNCH THE PHOTO MISSION?",
      body: `You will drive to the far side and cannot come back to the base.\n\nDays left in the launch window: ${daysLeft}. Stored power becomes rover battery: ${roverBatteryAtLaunch(s)}%.`,
      buttons: [
        { label: "NOT YET", onClick: () => this.close() },
        { label: "LAUNCH!", onClick: () => this.launch() },
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
    const x = 50;
    const y = 58;
    L.panel(x, y, 540, 270, { edge: PALETTE.accent });
    L.text(x + 14, y + 10, `PLAN FOR DAY ${s.day}`, { size: 16, color: TEXT.accent });

    this.plan.alloc = clampAlloc(s, this.plan.alloc);
    const needs = powerNeeds(s);
    const budget = powerBudget(s);
    const builds = buildPower(s);
    L.text(x + 14, y + 34, `POWER TO SHARE: ${Math.round(s.power)} stored + ${powerIn(s)} today${builds ? ` - ${builds} for builds` : ""} = ${budget}`, { color: TEXT.white });

    const sliders = {};
    const sumOthers = (key) => ALLOC_KEYS.reduce((sum, k) => sum + (k === key ? 0 : this.plan.alloc[k]), 0);
    const leftText = L.text(x + 14, y + 138, "", { color: TEXT.muted });
    const updateLeft = () => {
      const used = ALLOC_KEYS.reduce((sum, k) => sum + this.plan.alloc[k], 0);
      const left = budget - used;
      leftText.setText(`NOT USED: ${left}  ->  saved in the battery (it holds ${s.batteryCap})`).setColor(left > s.batteryCap ? "#ffb347" : TEXT.muted);
      for (const key of ALLOC_KEYS) counts[key].setText(needs[key] > 0 ? `${this.plan.alloc[key]}/${needs[key]}` : "");
    };
    const counts = {};
    ALLOC_KEYS.forEach((key, i) => {
      const ry = y + 54 + i * 20;
      L.text(x + 14, ry + 3, ALLOC_LABEL[key], { color: needs[key] > 0 ? TEXT.white : TEXT.muted });
      if (needs[key] > 0) {
        sliders[key] = new Slider(L, {
          x: x + 130, y: ry, max: needs[key], value: this.plan.alloc[key], color: ALLOC_COLOR[key],
          limit: () => budget - sumOthers(key),
          onChange: (value) => {
            this.plan.alloc[key] = value;
            updateLeft();
          },
        });
      } else {
        L.text(x + 130, ry + 3, key === "shield" ? (s.wallLevel >= 3 ? "WALL IS FULL HEIGHT" : "BUILD THE WALL FIRST") : "NOTHING BUILT YET", { color: "#4c5566" });
      }
      counts[key] = L.text(x + 300, ry + 3, "", { color: TEXT.accent });
      const hint = { life: "air, oxygen, water", greenhouse: "food in 2 days", shield: "less dose outside", science: s.buildings.antenna.status === "done" ? "x2 with antenna" : "+1 science each" }[key];
      L.text(x + 350, ry + 3, hint, { color: TEXT.muted });
    });
    updateLeft();

    L.text(x + 14, y + 158, "TODAY'S ACTION (PICK ONE)", { color: TEXT.accent });
    const actionText = L.text(x + 14, y + 198, "", { wrap: 512 });
    const fix = repairTarget(s);
    const usable = {
      work: true, rest: true, explore: true,
      repair: Boolean(fix),
      grow: s.buildings.greenhouse.status === "done",
    };
    if (!usable[this.plan.action]) this.plan.action = "work";
    const actionButtons = {};
    const showAction = () => {
      for (const [id, button] of Object.entries(actionButtons)) button.setSelected(id === this.plan.action);
      const action = ACTIONS[this.plan.action];
      const extra = this.plan.action === "repair" && fix ? ` Fixes ${fix.label}.` : "";
      actionText.setText(`GAIN: ${action.gain}.${extra}\nCOST: ${action.cost}.`);
    };
    ACTION_ORDER.forEach((id, i) => {
      actionButtons[id] = L.button(x + 62 + i * 104, y + 180, ACTIONS[id].label.toUpperCase(), () => {
        this.plan.action = id;
        showAction();
      }, { w: 98, enabled: usable[id] });
    });
    showAction();

    if (fix && s.kits.spares > 0) {
      L.button(x + 110, y + 250, `SPARE KIT (${s.kits.spares})`, () => {
        useSpareKit(s);
        sfx("good");
        this.openPlan();
      }, { w: 150 });
    }
    L.button(x + 270, y + 250, "CERES PICKS", () => {
      this.plan = autoPlan(s);
      this.openPlan();
    }, { w: 110 });
    L.button(x + 370, y + 250, "CLOSE", () => this.close(), { w: 70, key: "ESCAPE" });
    const run = L.button(x + 474, y + 250, "RUN DAY", () => this.runDay(), { w: 112, key: "R" });
    L.focusFirst(run);
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
    sfx("alert");
    this.scene.launch("Alert", {
      event,
      onDone: (note) => {
        this.alertNotes.push(`${(event.title ?? ALERTS[event.id].title).toUpperCase()}: ${note}`);
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
      if (report.completed.length > 0) sfx("done");
      this.refresh();
      this.showSummary(report, before.phase);
    });
  }

  showSummary(report, phaseBefore) {
    const s = this.state;
    const L = this.modalLayer();
    const x = 70;
    const y = 60;
    L.panel(x, y, 500, 268, { edge: PALETTE.accent });
    L.text(x + 14, y + 10, `DAY ${report.day} REPORT`, { size: 16, color: TEXT.accent });

    let cy = y + 36;
    const g = L.gfx();
    let cx = x + 14;
    for (const [key, label] of Object.entries(CHANGE_LABEL)) {
      const value = report.changes[key];
      if (!value) continue;
      const good = key === "doseMSv" ? value < 0 : value > 0;
      const text = `${label} ${value > 0 ? "+" : ""}${value}`;
      if (cx + text.length * 8 > x + 486) {
        cx = x + 14;
        cy += 14;
      }
      L.text(cx, cy, text, { color: key === "doseMSv" ? "#ffb347" : good ? TEXT.good : TEXT.danger });
      cx += text.length * 8 + 14;
    }
    cy += 20;

    const lines = [];
    for (const id of report.completed) lines.push({ text: `BUILT: ${ITEMS[id].name}!`, color: TEXT.good });
    for (const note of this.alertNotes) lines.push({ text: note, color: TEXT.white });
    for (const note of report.notes) lines.push({ text: note, color: TEXT.white });
    for (const line of lines.slice(0, 5)) {
      const text = L.text(x + 14, cy, line.text, { wrap: 472, color: line.color });
      cy += text.height + 6;
    }
    for (const notice of (this.todayNotices ?? []).slice(0, 1)) {
      const text = L.text(x + 14, cy, notice.text, { wrap: 472, color: TEXT.muted });
      cy += text.height + 4;
      cy += dataBadge(L, x + 14, cy, { label: notice.badge, real: true, link: notice.link }, { maxWidth: 472 }).height + 4;
    }
    g.fillStyle(PALETTE.panelEdge, 1);
    g.fillRect(x + 14, y + 30, 472, 1);

    let label = "NEXT DAY";
    if (s.outcome?.kind === "evacuated") label = "OH NO...";
    else if (s.outcome) label = "SEE DEBRIEF";
    const next = L.button(x + 500 - 70, y + 250, label, () => this.afterDay(phaseBefore), { w: 116, key: "ENTER" });
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
        title: "LAUNCH WINDOW CLOSING",
        body: "This is the last chance to reach the far side. The rover leaves now!",
        buttons: [{ label: "LAUNCH!", onClick: () => this.launch() }],
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
