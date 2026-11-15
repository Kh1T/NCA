import Phaser from "phaser";
import { PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { getMission, setMission } from "../data/mission.js";
import { getDonki, missionStartDate } from "../data/nasa.js";
import { CUSTOM, DIFFICULTY_IDS, SCENARIOS, missionFromScenario } from "../data/scenarios.js";
import { difficultyFor } from "../sim/difficulty.js";
import { ALERTS, DECK_CARDS, MIN_DECK } from "../sim/events.js";
import { drawStars as drawSky } from "../ui/backdrop.js";
import { drawChips } from "../ui/chips.js";
import { drawIcon } from "../ui/icons.js";
import { infoButton } from "../ui/InfoCard.js";
import { Layer, clearFocusFor, drawStars } from "../ui/kit.js";
import { sfx, playMusic } from "../ui/sfx.js";

const LEVEL_LABEL = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };
const CARD_NAME = { night: "SHADOW", meteor: "ROCK", leak: "LEAK", dust: "DUST", temp: "COLD", plant: "PLANTS", comms: "RADIO" };

/**
 * Choose a scenario. Step 1: REAL SCIENCE or CUSTOM. Step 2: pick a real
 * date and a difficulty, or set up a custom mission.
 */
export class Scenario extends Phaser.Scene {
  constructor() {
    super("Scenario");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    drawSky(this, { seed: "scenario" });
    playMusic("menu");
    const mission = getMission(this);
    this.pick = {
      scenario: SCENARIOS.find((s) => s.id === mission.scenarioId) ?? SCENARIOS[1],
      level: DIFFICULTY_IDS.includes(mission.difficulty) ? mission.difficulty : "medium",
      custom: {
        donki: mission.mode === "custom" ? mission.dateId : "busy",
        days: mission.mode === "custom" ? mission.totalDays : 7,
        events: mission.mode === "custom" ? mission.maxEvents : 4,
        deck: mission.mode === "custom" ? [...mission.deck] : ["meteor", "dust", "leak"],
      },
    };
    this.layer = null;
    this.showModes();
  }

  fresh() {
    this.layer?.destroy();
    this.layer = new Layer(this, { keys: true });
    return this.layer;
  }

  // ---------- Step 1: two big buttons ----------

  showModes() {
    const L = this.fresh();
    L.text(WIDTH / 2, 14, "CHOOSE A MISSION", { size: UI.title, color: TEXT.accent, origin: 0.5 });
    const modes = [
      { x: 172, icon: "sun", title: "REAL SCIENCE", line: "Real dates. Real solar storms.", info: "mission.real", go: () => this.showReal() },
      { x: 468, icon: "build", title: "CUSTOM", line: "You choose the dangers.", info: "mission.custom", go: () => this.showCustom() },
    ];
    let first = null;
    for (const mode of modes) {
      const button = L.button(mode.x, 180, "", mode.go, { w: 260, h: 220, key: mode === modes[0] ? "1" : "2" });
      first ??= button;
      const g = L.gfx();
      drawIcon(g, mode.icon, mode.x - 42, 90, 7);
      L.text(mode.x, 200, mode.title, { size: UI.title, origin: 0.5, color: TEXT.accent });
      L.text(mode.x, 240, mode.line, { size: UI.body, origin: 0.5, color: TEXT.muted });
      infoButton(L, mode.x + 112, 88, mode.info);
    }
    L.button(80, 336, "BACK", () => this.scene.start("Title"), { w: 110, h: 36, key: "ESCAPE" });
    L.focusFirst(first);
  }

  // ---------- Step 2a: real scenarios ----------

  showReal() {
    const L = this.fresh();
    L.text(WIDTH / 2, 6, "REAL SCIENCE", { size: UI.title, color: TEXT.accent, origin: 0.5 });
    infoButton(L, 430, 22, "mission.real", { focus: false });
    const cardW = 146;
    this.cards = {};
    SCENARIOS.forEach((scenario, i) => {
      const cx = 88 + i * (cardW + 9);
      const card = L.button(cx, 128, "", () => {
        this.pick.scenario = scenario;
        this.paintReal();
      }, { w: cardW, h: 168 });
      const g = L.gfx();
      drawIcon(g, scenario.icon, cx - 24, 54, 4);
      L.text(cx, 108, scenario.title.toUpperCase(), { size: UI.big, origin: 0.5, color: TEXT.accent });
      L.text(cx, 132, scenario.story, { origin: 0.5, wrap: cardW - 14, align: "center", color: TEXT.muted });
      const stars = L.gfx();
      this.cards[scenario.id] = { card, stars, cx };
    });

    L.text(20, 226, "HOW HARD?", { color: TEXT.muted });
    this.levels = {};
    DIFFICULTY_IDS.forEach((id, i) => {
      const bx = 128 + i * 196;
      this.levels[id] = L.button(bx, 268, "", () => {
        this.pick.level = id;
        this.paintReal();
      }, { w: 184, h: 52 });
      const level = SCENARIOS[0].difficulty[id];
      L.text(bx, 244, LEVEL_LABEL[id], { size: UI.big, origin: 0.5 });
      const chips = [["calendar", `${level.days} DAYS`], ["warn", level.maxEvents === null ? "ALL" : `${level.maxEvents}`]];
      drawChips(L, bx - 56, 272, chips, { size: UI.body, iconScale: 1 });
    });

    L.button(80, 336, "BACK", () => this.showModes(), { w: 110, h: 36, key: "ESCAPE" });
    const go = L.button(560, 336, "GO!", () => this.choose(missionFromScenario(this.pick.scenario, this.pick.level)), { w: 140, h: 36, key: "ENTER", icon: "play" });
    this.paintReal();
    L.focusFirst(go);
  }

  paintReal() {
    for (const [id, { card, stars, cx }] of Object.entries(this.cards)) {
      card.setSelected(id === this.pick.scenario.id);
      // Stars come from the real NASA records for this length of mission.
      const scenario = SCENARIOS.find((s) => s.id === id);
      const days = scenario.difficulty[this.pick.level].days;
      const file = getDonki(this, scenario.donki);
      const rating = difficultyFor(file, missionStartDate(file, scenario.donki, days, 0), days);
      stars.clear();
      drawStars(stars, cx - 30, 194, rating.stars, 3, 9, 3);
    }
    for (const [id, button] of Object.entries(this.levels)) button.setSelected(id === this.pick.level);
  }

  // ---------- Step 2b: custom ----------

  showCustom() {
    const L = this.fresh();
    const c = this.pick.custom;
    L.text(WIDTH / 2, 6, "CUSTOM MISSION", { size: UI.title, color: TEXT.accent, origin: 0.5 });

    L.text(16, 46, "SUN", { color: TEXT.muted });
    this.suns = {};
    CUSTOM.suns.forEach((sun, i) => {
      this.suns[sun.donki] = L.button(140 + i * 128, 56, sun.title, () => { c.donki = sun.donki; this.paintCustom(); }, { w: 120, h: 34, icon: sun.icon, size: UI.body });
    });

    L.text(16, 92, "DANGERS (PICK 2+)", { color: TEXT.muted });
    this.hazards = {};
    DECK_CARDS.forEach((id, i) => {
      const bx = 52 + i * 89;
      this.hazards[id] = L.button(bx, 146, "", () => this.toggleHazard(id), { w: 82, h: 70 });
      const g = L.gfx();
      drawIcon(g, ALERTS[id].icon, bx - 15, 118, 2.5);
      L.text(bx, 156, CARD_NAME[id], { origin: 0.5 });
    });

    L.text(16, 194, "DAYS", { color: TEXT.muted });
    this.dayButtons = {};
    CUSTOM.days.forEach((days, i) => {
      this.dayButtons[days] = L.button(176 + i * 104, 204, `${days}`, () => { c.days = days; this.paintCustom(); }, { w: 96, h: 34, icon: "calendar" });
    });
    L.text(16, 240, "EVENTS", { color: TEXT.muted });
    this.eventButtons = {};
    CUSTOM.events.forEach((count, i) => {
      this.eventButtons[count] = L.button(176 + i * 104, 250, `${count}`, () => { c.events = count; this.paintCustom(); }, { w: 96, h: 34, icon: "warn" });
    });
    this.customNote = L.text(WIDTH / 2, 284, "", { origin: 0.5, color: TEXT.muted });

    L.button(80, 336, "BACK", () => this.showModes(), { w: 110, h: 36, key: "ESCAPE" });
    const go = L.button(560, 336, "GO!", () => this.choose(missionFromScenario(CUSTOM, null, c)), { w: 140, h: 36, key: "ENTER", icon: "play" });
    this.paintCustom();
    L.focusFirst(go);
  }

  toggleHazard(id) {
    const deck = this.pick.custom.deck;
    if (deck.includes(id)) {
      if (deck.length <= MIN_DECK) {
        sfx("deny");
        this.customNote.setText("Pick at least 2 dangers!").setColor(TEXT.danger);
        return;
      }
      deck.splice(deck.indexOf(id), 1);
    } else {
      deck.push(id);
    }
    this.paintCustom();
  }

  paintCustom() {
    const c = this.pick.custom;
    for (const [id, button] of Object.entries(this.suns)) button.setSelected(id === c.donki);
    for (const [id, button] of Object.entries(this.hazards)) button.setSelected(c.deck.includes(id));
    for (const [days, button] of Object.entries(this.dayButtons)) button.setSelected(Number(days) === c.days);
    for (const [count, button] of Object.entries(this.eventButtons)) button.setSelected(Number(count) === c.events);
    this.customNote.setText("Solar storms come from real NASA dates.").setColor(TEXT.muted);
  }

  choose(settings) {
    setMission(this, settings);
    sfx("done");
    this.scene.start("Briefing");
  }
}

export { PALETTE };
