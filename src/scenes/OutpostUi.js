import Phaser from "phaser";
import { GROUND_Y, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { startMission } from "../data/mission.js";
import { niceDate } from "../data/nasa.js";
import { BUILD_ORDER, ITEMS, MAX_ACTIVE_BUILDS, activeBuilds, canStartBuild, cancelBuild, startBuild } from "../sim/buildings.js";
import { ALERTS, alertsForToday, dateForDay, onAlertStart } from "../sim/events.js";
import {
  ACTIONS, C, PHOTO, advanceDay, canTrip, checklist, dayCard, daysToNight, guideLine, isNight, nightNeed, previewChoice,
  recordChoice, repairTarget, roverBatteryAtLaunch,
} from "../sim/rules.js";
import { BuildQueue } from "../ui/BuildQueue.js";
import { drawGhostBars } from "../ui/ghostBars.js";
import { ITEM_MAKES as MAKES, ITEM_NEEDS as NEEDS, drawChips } from "../ui/chips.js";
import { runTutorial } from "../ui/Coach.js";
import { dataBadge } from "../ui/DataBadge.js";
import { ITEM_ICON, drawIcon } from "../ui/icons.js";
import { drawArt, infoButton, openGlossary, openInfo } from "../ui/InfoCard.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { Meter } from "../ui/Meter.js";
import { openSettings } from "../ui/Settings.js";
import { sfx } from "../ui/sfx.js";
import { celebrateBadges, toast } from "../ui/Toast.js";
import { SITE_X } from "./Outpost.js";

const METERS = ["power", "oxygen", "air", "water", "food", "dose"];
const CHANGE_ICON = { power: "power", oxygen: "oxygen", air: "air", water: "water", food: "food", doseMSv: "dose" };
const LIST_X = 472;
const LIST_Y = 94;
const LIST_W = 164;

/** One short line that explains today's card. */
function situationLine(state, card) {
  const p = Math.floor(state.power);
  switch (card.id) {
    case "night": return `No sun! Battery ${p}. The night needs ${nightNeed(state)}.`;
    case "dusk": return `Battery ${p} of ${state.batteryCap}. The night needs ${nightNeed(state)}.`;
    case "broken": return `${(repairTarget(state)?.label ?? "Something").replace(/^the /, "The ")} needs fixing.`;
    case "rover": return "Your rover can take crater photos today!";
    case "food": return "Food is running low.";
    case "build": return `${activeBuilds(state).length} building${activeBuilds(state).length > 1 ? "s are" : " is"} going up.`;
    default: return "Nothing is being built today.";
  }
}

/** HUD, checklist, panels and the daily CHOICE -> ALERTS -> SUMMARY loop. */
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
    this.plan = { action: "work" };
    this.listOpen = true;

    const H = (this.hud = new Layer(this, { depth: 100 }));
    H.rect(0, 0, WIDTH, 88, 0x05060a, 0.94);
    H.rect(0, 320, WIDTH, 40, 0x05060a, 0.94);

    // Supplies: icon, number and bar. Tap one for its info card.
    this.meters = {};
    METERS.forEach((id, i) => {
      this.meters[id] = new Meter(H, { id, x: 8 + i * 105, y: 6, width: 96, onInfo: (key) => this.info(`meter.${key}`) });
    });

    // The days: suns, then moons for the night. Tap for the night's info card.
    drawIcon(H.gfx(), "calendar", 8, 44, 1.4);
    this.dayText = H.text(30, 40, "", { size: UI.big, color: TEXT.accent });
    this.timeline = H.gfx();
    this.nightText = H.text(0, 40, "", { size: UI.big });
    this.tapArea(H, 4, 40, 420, 24, () => this.info("meter.night"));
    this.dateText = H.text(632, 42, "", { origin: 1, color: TEXT.muted });

    // DO THIS NOW: the one next step.
    this.guideIcon = H.gfx();
    this.guide = H.text(30, 64, "", { size: UI.body, color: TEXT.good });

    this.buildChecklist();

    this.queue = new BuildQueue(H, { x: 8, y: 324 });
    H.iconButton(250, 340, "gear", () => this.openSettingsPanel(), { size: 36 });
    H.iconButton(292, 340, "book", () => this.openWords(), { size: 36 });
    this.nextButton = H.button(552, 340, "NEXT DAY", () => this.openDay(), { w: 164, h: 36, icon: "play", size: UI.big });

    this.input.keyboard.on("keydown-N", () => !this.modal && !this.busy && this.openDay());
    this.input.keyboard.on("keydown-P", () => !this.modal && !this.busy && this.openDay());
    this.input.keyboard.on("keydown-G", () => !this.modal && !this.busy && this.openWords());
    this.input.keyboard.on("keydown-ESC", () => !this.modal && !this.busy && this.openSettingsPanel());

    this.refresh();
    // Back from a rover trip: the trip was today's choice, so run the day now.
    if (this.registry.get("tripDone")) {
      this.registry.set("tripDone", false);
      this.plan = { action: "trip" };
      this.time.delayedCall(250, () => this.runDay());
      return;
    }
    if (this.state.day === 1) this.showHelp();
  }

  tapArea(layer, x, y, w, h, fn) {
    const hit = layer.rect(x, y, w, h, 0, 0.001).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", fn);
    return hit;
  }

  // ---------- The checklist ----------

  buildChecklist() {
    this.list?.destroy();
    const L = (this.list = new Layer(this, { depth: 101 }));
    const items = checklist(this.state);
    const h = this.listOpen ? 30 + items.length * 22 : 28;
    L.panel(LIST_X, LIST_Y, LIST_W, h, { alpha: 0.92 });
    const head = L.rect(LIST_X, LIST_Y, LIST_W, 26, 0x1a2230, 1).setInteractive({ useHandCursor: true });
    head.on("pointerdown", () => {
      this.listOpen = !this.listOpen;
      sfx("tick");
      this.buildChecklist();
    });
    const done = items.filter((i) => i.done).length;
    drawIcon(L.gfx(), "check", LIST_X + 6, LIST_Y + 6, 1.2);
    L.text(LIST_X + 24, LIST_Y + 3, `TO DO ${done}/${items.length}`, { color: TEXT.accent });
    L.text(LIST_X + LIST_W - 8, LIST_Y + 3, this.listOpen ? "-" : "+", { origin: 1, size: UI.big, color: TEXT.accent });
    this.listRows = {};
    if (!this.listOpen) return;
    const g = L.gfx();
    const focus = guideLine(this.state).focus;
    items.forEach((item, i) => {
      const y = LIST_Y + 30 + i * 22;
      const row = L.rect(LIST_X + 2, y - 2, LIST_W - 4, 21, 0x2a3850, 0.001).setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => this.tapListItem(item));
      // Tick box.
      g.lineStyle(1, item.done ? PALETTE.good : 0x6b7384, 1);
      g.strokeRect(LIST_X + 6, y + 2, 12, 12);
      if (item.done) {
        g.fillStyle(PALETTE.good, 1);
        g.fillRect(LIST_X + 8, y + 4, 8, 8);
      }
      drawIcon(g, item.icon ?? ITEM_ICON[item.id], LIST_X + 24, y + 2, 1.1);
      let color = item.done ? TEXT.muted : TEXT.white;
      if (item.packed === false) color = "#4c5566";
      L.text(LIST_X + 42, y - 1, item.label, { color });
      if (item.busy) drawIcon(g, "build", LIST_X + LIST_W - 20, y + 3, 1);
      // The suggested next step gets a yellow arrow.
      if (!item.done && item.id === focus) {
        g.fillStyle(PALETTE.accent, 1);
        g.fillTriangle(LIST_X + LIST_W - 6, y + 3, LIST_X + LIST_W - 6, y + 13, LIST_X + LIST_W - 13, y + 8);
        g.fillStyle(0x2a3850, 0.6);
        g.fillRect(LIST_X + 2, y - 2, LIST_W - 4, 21);
      }
      this.listRows[item.id] = y;
    });
  }

  tapListItem(item) {
    if (this.modal || this.busy) return;
    sfx("click");
    if (item.id === "photos") {
      if (canTrip(this.state)) this.openDay();
      else this.world.say(this.state.buildings.rover.status === "done" ? "Too dark for photos now." : "Build the rover first!", "rover");
      return;
    }
    if (item.id === "night") {
      this.info("meter.night");
      return;
    }
    // A building: walk there (the panel opens on arrival).
    if (this.state.buildings[item.id].status === "done") this.openSite(item.id);
    else this.world.walkTo(SITE_X[item.id], item.id);
  }

  // ---------- HUD ----------

  refresh() {
    const s = this.state;
    const low = (key) => s[key] <= C.LOW_SUPPLY;
    this.meters.power.set(s.power, s.batteryCap, { text: `${Math.floor(s.power)}`, danger: s.power < 2 });
    this.meters.oxygen.set(s.oxygen, C.CAP, { danger: low("oxygen") });
    this.meters.air.set(s.air, C.CAP, { danger: low("air") });
    this.meters.water.set(s.water, C.CAP, { danger: low("water") });
    this.meters.food.set(s.food, C.CAP, { danger: low("food") });
    this.meters.dose.set(s.doseMSv, s.doseLimit, { text: `${s.doseMSv < 10 ? s.doseMSv.toFixed(1) : Math.round(s.doseMSv)}/${Math.round(s.doseLimit)}`, danger: s.doseMSv > s.doseLimit * 0.75, zone: s.doseMSv > s.doseLimit * 0.5 ? 0xffb347 : 0x5ce7a0 });
    const day = Math.min(s.day, s.totalDays);
    this.dayText.setText(`DAY ${day}`);
    this.dateText.setText(niceDate(dateForDay(s.missionDate, day)).toUpperCase());
    this.drawTimeline();
    this.queue.update(s);

    const guide = guideLine(s);
    this.guide.setText(guide.text);
    this.guideIcon.clear();
    drawIcon(this.guideIcon, "play", 8, 67, 1.2);
    this.nextButton.setSelected(guide.focus === "ship");
    for (const meter of Object.values(this.meters)) meter.pulse(false);
    this.world.setFocus(guide.focus);
    this.world.refresh();
    this.buildChecklist();
    this.checkHints();
  }

  /** A sun for each day of light and a moon for each night. Today is boxed. */
  drawTimeline() {
    const s = this.state;
    const g = this.timeline;
    g.clear();
    const x0 = 96;
    for (let d = 1; d <= s.totalDays; d += 1) {
      const x = x0 + (d - 1) * 24;
      const night = isNight(s, d);
      g.fillStyle(night ? 0x141a2e : 0x2a2410, 1);
      g.fillRect(x, 42, 22, 20);
      g.setAlpha(1);
      drawIcon(g, night ? "moon" : "sun", x + 5, 46, 1);
      if (d < s.day) {
        g.fillStyle(0x05060a, 0.6);
        g.fillRect(x, 42, 22, 20);
      }
      if (d === Math.min(s.day, s.totalDays)) {
        g.lineStyle(2, PALETTE.accent, 1);
        g.strokeRect(x, 42, 22, 20);
      }
    }
    const tx = x0 + s.totalDays * 24 + 8;
    const soon = daysToNight(s);
    if (isNight(s)) this.nightText.setText("NIGHT!").setColor("#9ab4ff");
    else if (soon > 0) this.nightText.setText(`NIGHT IN ${soon}`).setColor(soon <= 2 ? "#ffb347" : TEXT.muted);
    else this.nightText.setText("");
    this.nightText.setPosition(tx, 40);
  }

  info(id) {
    if (this.modal || this.busy) return;
    this.world.frozen = true;
    this.modal = openInfo(this, id, { onClose: () => this.close() });
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

  openSettingsPanel() {
    if (this.modal || this.busy) return;
    this.world.frozen = true;
    this.modal = { destroy() {} };
    openSettings(this, {
      onClose: () => this.close(),
      onRestart: () => {
        startMission(this);
        this.registry.remove("outpostX");
        this.scene.stop("Outpost");
        this.scene.start("Outpost");
      },
      onLeave: () => {
        this.scene.stop("Outpost");
        this.scene.start("Title");
      },
    });
  }

  /** First visit: a short tutorial that points at the real things on screen. */
  showHelp() {
    const world = this.world;
    const onScreen = (worldX) => worldX - world.cameras.main.scrollX;
    const firstSite = BUILD_ORDER.find((id) => this.state.buildings[id].packed) ?? "solar";
    this.world.frozen = true;
    this.modal = { destroy: () => this.coach?.active && this.coach.finish() };
    this.coach = runTutorial(this, "outpost", [
      { icon: "crew", text: "This is you! Tap the ground to walk.", target: () => ({ x: onScreen(world.player.x) - 16, y: world.player.y - 26, w: 32, h: 50 }) },
      { icon: "build", text: "Tap a flag to build there.", target: () => ({ x: onScreen(SITE_X[firstSite]) - 28, y: GROUND_Y - 64, w: 56, h: 66 }) },
      { icon: "check", text: "Your to-do list. Tap a line to go there.", target: () => ({ x: LIST_X, y: LIST_Y, w: LIST_W, h: 30 + 8 * 22 }) },
      { icon: "info", text: "Your supplies. Tap one to learn more.", target: () => ({ x: 4, y: 2, w: 632, h: 34 }) },
      { icon: "moon", text: "The moons are the night. No sun then!", target: () => ({ x: 92, y: 40, w: this.state.totalDays * 24 + 4, h: 24 }) },
      { icon: "play", text: "Ready? Tap NEXT DAY!", target: () => ({ x: 468, y: 321, w: 168, h: 38 }) },
    ], { onDone: () => { this.coach = null; this.modal = null; this.close(); } });
    if (!this.coach) {
      this.modal = null;
      this.world.frozen = false;
    }
  }

  /** The astronaut says a short tip when something needs attention, once each. */
  checkHints() {
    if (this.modal || this.busy) return;
    if (this.time.now < (this.hintCooldown ?? 0)) return;
    const s = this.state;
    const shown = this.registry.get("hintsShown") ?? [];
    const soon = daysToNight(s);
    const hints = [
      ["air-low", s.air <= 2, "air", "Clean air is low! Build the air cleaner."],
      ["water-low", s.water <= 2, "water", "Water is low! The recycler needs power."],
      ["food-low", s.food <= 2, "food", "Food is low! Grow food."],
      ["broken", Object.values(s.buildings).some((b) => b.status === "done" && b.health < 100), "broken", "Something broke! Pick FIX IT."],
      ["rover", canTrip(s), "rover", "Rover ready! Pick ROVER TRIP for photos."],
      ["dusk", soon > 0 && soon <= 2, "moon", "Night is coming! Charge the battery."],
      ["night", isNight(s), "moon", "It is dark! Save power until sunrise."],
      ["slots", s.day >= 2 && activeBuilds(s).length < MAX_ACTIVE_BUILDS && BUILD_ORDER.some((id) => canStartBuild(s, id).ok), "build", "A build slot is free! Tap a flag."],
    ];
    const hint = hints.find(([id, when]) => when && !shown.includes(id));
    if (!hint) return;
    const [id, , icon, text] = hint;
    this.registry.set("hintsShown", [...shown, id]);
    this.hintCooldown = this.time.now + 6000;
    sfx("hint");
    this.world.say(text, icon);
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
    const y = 40;
    const w = 480;
    const h = 276;
    L.panel(x, y, w, h, { edge: PALETTE.accent });

    // Picture of the finished building.
    L.rect(x + 14, y + 14, 140, 130, 0x0b1018, 1).setStrokeStyle(1, PALETTE.panelEdge);
    const art = L.gfx();
    const finished = building.status === "done";
    drawArt(art, finished ? (id === "rover" ? { rover: true } : { building: id }) : { icon: ITEM_ICON[id] }, x + 84, y + 72, finished ? 0.9 : 0.8);
    if (!finished) art.setAlpha(building.packed ? 0.9 : 0.35);

    const tx = x + 170;
    L.text(tx, y + 12, item.name.toUpperCase(), { size: UI.title, color: TEXT.accent });
    infoButton(L, x + w - 24, y + 26, `item.${id}`, { focus: false });

    let status;
    if (!building.packed) status = ["cross", "NOT PACKED", TEXT.danger];
    else if (building.status === "idle") status = ["clock", `${item.buildDays} DAY${item.buildDays > 1 ? "S" : ""} TO BUILD`, TEXT.muted];
    else if (building.status === "building") status = ["build", `${Math.ceil(building.daysLeft)} DAY${Math.ceil(building.daysLeft) > 1 ? "S" : ""} LEFT`, TEXT.accent];
    else if (building.health < 100) status = ["broken", "BROKEN: HALF POWER", TEXT.danger];
    else status = ["power", "WORKING", TEXT.good];
    drawChips(L, tx, y + 50, [status], { size: UI.big });

    L.text(tx, y + 82, "MAKES", { color: TEXT.muted });
    drawChips(L, tx + 62, y + 80, MAKES[id] ?? []);
    L.text(tx, y + 108, "NEEDS", { color: TEXT.muted });
    drawChips(L, tx + 62, y + 106, NEEDS[id] ?? []);
    drawIcon(L.gfx(), "warn", tx, y + 136, 1.4);
    L.text(tx + 24, y + 134, item.tradeoff, { wrap: w - 200, color: "#ffb347" });

    const by = y + h - 26;
    const noteY = y + 166;
    const buttons = [];
    const add = (label, fn, o = {}) => buttons.push({ label, fn, o });

    if (building.packed && building.status === "idle") {
      const check = canStartBuild(s, id);
      add("BUILD!", () => {
        startBuild(s, id);
        sfx("build");
        this.close();
        this.world.say(`Building the ${item.name.toLowerCase()}!`, ITEM_ICON[id]);
        if (activeBuilds(s).length >= MAX_ACTIVE_BUILDS) this.time.delayedCall(500, () => this.openWaitPopup());
      }, { enabled: check.ok, w: 140, icon: "build" });
      if (!check.ok) drawChips(L, x + 16, noteY, [["lock", check.reason.toUpperCase(), TEXT.danger]], { size: UI.body });
      else this.slotPips(L, x + 16, noteY, activeBuilds(s).length);
    } else if (building.status === "building") {
      add("STOP", () => {
        cancelBuild(s, id);
        this.close();
      }, { w: 100, icon: "cross" });
      L.text(x + 16, noteY, "Stopping frees a slot, but loses the work.", { color: TEXT.muted, wrap: w - 32 });
    } else if (finished) {
      if (id === "rover") {
        add("TRIP!", () => { this.close(); this.openDay(); }, { w: 120, enabled: canTrip(s), icon: "rover" });
        L.text(x + 16, noteY, canTrip(s) ? "Pick ROVER TRIP on the day card." : "No trips at night or with 5 photos.", { color: TEXT.muted, wrap: w - 32 });
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
        drawChips(L, x + 16, noteY + 28, [["wrench", "PICK FIX IT ON THE DAY CARD", "#ffb347"]], { size: UI.body });
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
    L.focus.items = [...L.focus.items.filter((i) => !made.includes(i)), ...made];
    L.focusFirst(made[0].enabled && made.length > 1 ? made[0] : made[made.length - 1]);
  }

  /** All build slots are busy: nudge the player to use the wait. */
  openWaitPopup() {
    if (this.modal || this.busy) return;
    const s = this.state;
    this.world.frozen = true;
    const L = this.modalLayer();
    const x = 150;
    const y = 90;
    const w = 340;
    const h = 180;
    L.panel(x, y, w, h, { edge: PALETTE.accent });
    this.slotPips(L, x + 16, y + 14, MAX_ACTIVE_BUILDS);
    L.text(x + w / 2, y + 54, canTrip(s) ? "Builds take days. Go take photos!" : "Builds take days. Skip ahead!", { size: UI.big, origin: [0.5, 0], wrap: w - 32, align: "center" });
    const by = y + h - 30;
    if (canTrip(s)) {
      const trip = L.button(x + 90, by, "ROVER", () => { this.close(); this.openDay(); }, { w: 140, h: 38, icon: "rover" });
      L.button(x + w - 90, by, "NEXT DAY", () => { this.close(); this.openDay(); }, { w: 140, h: 38, icon: "play" });
      L.focusFirst(trip);
    } else {
      L.button(x + 90, by, "LOOK AROUND", () => this.close(), { w: 140, h: 38, key: "ESCAPE" });
      const next = L.button(x + w - 90, by, "NEXT DAY", () => { this.close(); this.openDay(); }, { w: 140, h: 38, icon: "play", key: "ENTER" });
      L.focusFirst(next);
    }
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

  // ---------- The day card ----------

  openDay() {
    if (this.busy || this.coach) return;
    if (this.modal) {
      this.modal.destroy?.();
      this.modal = null;
    }
    const s = this.state;
    const card = dayCard(s);
    this.currentCard = card;
    const L = this.modalLayer();
    const x = 30;
    const y = 12;
    const w = 580;
    const h = 336;
    L.panel(x, y, w, h, { edge: PALETTE.accent });
    drawIcon(L.gfx(), card.icon, x + 14, y + 12, 2.6);
    L.text(x + 54, y + 8, card.title, { size: UI.title, color: TEXT.accent });
    L.text(x + w - 14, y + 14, `DAY ${s.day} OF ${s.totalDays}`, { origin: 1, color: TEXT.muted, size: UI.big });
    L.text(x + 16, y + 50, situationLine(s, card), { size: UI.big, wrap: w - 32 });

    const n = card.options.length;
    const ow = n === 3 ? 178 : 250;
    const gap = 12;
    const left = x + (w - (n * ow + (n - 1) * gap)) / 2;
    const optionButtons = {};
    let resultLayer = null;
    const pick = (id) => {
      // Tapping the chosen card again means GO.
      if (this.plan.action === id && go.enabled) {
        go.activate();
        return;
      }
      this.plan = { action: id };
      for (const [key, b] of Object.entries(optionButtons)) b.setSelected(key === id);
      go.setEnabled(true);
      L.focus.focusItem(go);
      // Show what this choice would change today.
      resultLayer?.destroy();
      resultLayer = new Layer(this, { depth: 201 });
      const changes = previewChoice(s, id);
      const rows = [];
      for (const [key, icon] of Object.entries(CHANGE_ICON)) {
        const delta = Math.round((changes[key] ?? 0) * 10) / 10;
        if (!delta) continue;
        const now = s[key];
        const max = key === "power" ? s.batteryCap : key === "doseMSv" ? s.doseLimit : C.CAP;
        rows.push({ id: icon, now, max, delta, badWhenUp: key === "doseMSv" });
      }
      hint.setVisible(false);
      resultLayer.text(x + 16, y + 250, "TODAY:", { color: TEXT.muted, size: UI.big });
      drawGhostBars(resultLayer, x + 96, y + 253, rows);
      sfx("tick");
    };
    this.plan = { action: null };
    card.options.forEach((id, i) => {
      const a = ACTIONS[id];
      const cx = left + i * (ow + gap) + ow / 2;
      const top = y + 84;
      optionButtons[id] = L.button(cx, top + 72, "", () => pick(id), { w: ow, h: 144, key: String(i + 1) });
      drawIcon(L.gfx(), a.icon, cx - 18, top + 10, 3);
      L.text(cx, top + 50, a.label, { size: UI.big, origin: 0.5, color: TEXT.accent });
      drawChips(L, cx - ow / 2 + 10, top + 80, a.gain.map(([ic, t]) => [ic, t, TEXT.good]), { size: UI.body, iconScale: 1.2, maxWidth: ow - 20, gap: 10 });
      drawChips(L, cx - ow / 2 + 10, top + 108, a.cost.map(([ic, t]) => [ic, t, TEXT.danger]), { size: UI.body, iconScale: 1.2, maxWidth: ow - 20, gap: 10 });
    });
    const hint = L.text(x + 16, y + 250, "TAP ONE CHOICE.", { color: TEXT.muted, size: UI.big });

    const by = y + h - 28;
    L.button(x + 90, by, "BACK", () => {
      resultLayer?.destroy();
      this.close();
    }, { w: 140, h: 38, key: "ESCAPE", icon: "back" });
    const go = L.button(x + w - 90, by, "GO!", () => {
      resultLayer?.destroy();
      this.confirmChoice(card);
    }, { w: 150, h: 38, icon: "play", enabled: false, key: "G" });
    const baseDestroy = L.destroy.bind(L);
    L.destroy = () => {
      resultLayer?.destroy();
      baseDestroy();
    };
    L.focusFirst(optionButtons[card.options[0]]);

    this.coach = runTutorial(this, "daycard", [
      { icon: "star", text: "Each day, pick ONE choice.", target: () => ({ x: left - 4, y: y + 80, w: n * ow + (n - 1) * gap + 8, h: 152 }) },
      { icon: "up", text: "Green is good. Red is the cost.", target: () => ({ x: left - 4, y: y + 160, w: n * ow + (n - 1) * gap + 8, h: 60 }) },
      { icon: "play", text: "Then press GO! to play the day.", target: () => ({ x: x + w - 167, y: by - 21, w: 154, h: 42 }) },
    ], { onDone: () => { this.coach = null; } });
  }

  confirmChoice(card) {
    const s = this.state;
    const action = this.plan.action;
    recordChoice(s, card, action);
    this.modal?.destroy();
    this.modal = null;
    if (action === "trip") {
      this.launchTrip();
      return;
    }
    this.runDay();
  }

  launchTrip() {
    const s = this.state;
    s.roverBattery = roverBatteryAtLaunch(s);
    s.log.push({ day: s.day, type: "trip-start" });
    sfx("win");
    this.scene.stop("Outpost");
    this.scene.start("PhotoMission");
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
      this.showSummary(report);
      for (const id of report.completed) toast(this, { icon: ITEM_ICON[id], title: `${ITEMS[id].name} built!` });
      celebrateBadges(this, next, "day");
    });
  }

  showSummary(report) {
    const s = this.state;
    const L = this.modalLayer();
    const x = 60;
    const y = 24;
    const w = 520;
    const h = 312;
    L.panel(x, y, w, h, { edge: PALETTE.accent });
    L.text(x + 14, y + 8, `DAY ${report.day} DONE`, { size: UI.title, color: TEXT.accent });
    drawIcon(L.gfx(), ACTIONS[report.action]?.icon ?? "build", x + w - 40, y + 12, 2);

    // What went up and down, popping in one at a time.
    const chips = [];
    for (const [key, icon] of Object.entries(CHANGE_ICON)) {
      const value = Math.round((report.changes[key] ?? 0) * 10) / 10;
      if (!value) continue;
      const good = key === "doseMSv" ? value < 0 : value > 0;
      chips.push([icon, `${value > 0 ? "+" : ""}${value}`, key === "doseMSv" ? "#ffb347" : good ? TEXT.good : TEXT.danger]);
    }
    const before = L.items.length;
    const row = drawChips(L, x + 16, y + 50, chips, { maxWidth: w - 32 });
    const popped = L.items.slice(before);
    for (const obj of popped) obj.setAlpha(0);
    this.tweens.add({ targets: popped, alpha: 1, duration: 200, delay: this.tweens.stagger(60) });
    const supplies = ["oxygen", "air", "water", "food"].reduce((sum, key) => sum + (report.changes[key] ?? 0), 0);
    sfx(supplies < 0 ? "loss" : "gain");
    let cy = y + 50 + row.height + 12;
    const g = L.gfx();
    g.fillStyle(PALETTE.panelEdge, 1);
    g.fillRect(x + 14, cy - 6, w - 28, 1);

    const lines = [];
    for (const id of report.completed) lines.push({ icon: ITEM_ICON[id], text: `${ITEMS[id].name} built!`, color: TEXT.good });
    for (const note of this.alertNotes) lines.push({ icon: note.icon, text: note.text, color: TEXT.white });
    for (const note of report.notes) lines.push({ icon: note.startsWith("Night") ? "moon" : note.startsWith("Sunrise") ? "sun" : "info", text: note, color: TEXT.white });
    for (const line of lines.slice(0, 5)) {
      drawIcon(g, line.icon, x + 16, cy + 2, 1.4);
      const text = L.text(x + 42, cy, line.text, { wrap: w - 60, color: line.color, size: UI.big });
      cy += Math.max(24, text.height + 6);
    }
    for (const notice of (this.todayNotices ?? []).slice(0, 1)) {
      if (cy > y + h - 90) break;
      drawIcon(g, notice.kind === "gst" ? "earth" : "sun", x + 16, cy + 2, 1.4);
      const text = L.text(x + 42, cy, notice.short ?? notice.text, { wrap: w - 60, color: TEXT.muted });
      cy += text.height + 4;
      dataBadge(L, x + 42, cy, { label: notice.badge, real: true, link: notice.link }, { maxWidth: w - 60 });
    }

    let label = "NEXT DAY";
    if (s.outcome?.kind === "evacuated") label = "OH NO...";
    else if (s.outcome) label = "RESULTS";
    const next = L.button(x + w - 80, y + h - 26, label, () => this.afterDay(), { w: 140, h: 38, key: "ENTER", icon: "play" });
    L.focusFirst(next);
  }

  afterDay() {
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
    this.world.frozen = false;
    if (s.day === s.nightStart) toast(this, { icon: "moon", title: "NIGHT FALLS! NO SUN." });
    this.refresh();
    // Nothing to build right now? Then go straight to the next day's choice.
    if (guideLine(s).focus === "ship" && !repairTarget(s)) this.time.delayedCall(450, () => !this.modal && !this.busy && this.openDay());
  }
}

export { PHOTO };
