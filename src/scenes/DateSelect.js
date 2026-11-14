import Phaser from "phaser";
import { PALETTE, TEXT } from "../constants.js";
import { getMission, startMission } from "../data/mission.js";
import { DATE_PRESETS, MISSION_LENGTHS, addDays, cachedOnText, getDonki, missionStartDate, niceDate } from "../data/nasa.js";
import { difficultyFor } from "../sim/difficulty.js";
import { drawStars as starfield } from "../ui/backdrop.js";
import { dataBadge } from "../ui/DataBadge.js";
import { Layer, clearFocusFor, drawStars } from "../ui/kit.js";

/** Screen 3 of 3: pick the real date that drives the Sun, and the mission length. */
export class DateSelect extends Phaser.Scene {
  constructor() {
    super("DateSelect");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.mission = getMission(this);
    starfield(this, { seed: "dates" });
    this.layer = new Layer(this, { keys: true });
    const L = this.layer;
    L.text(8, 8, "3/3 PICK A REAL DATE", { size: 16, color: TEXT.accent });
    L.text(8, 30, "The game looks up what the Sun really did on those days.", { color: TEXT.muted });

    this.dateButtons = {};
    DATE_PRESETS.forEach((preset, i) => {
      this.dateButtons[preset.id] = L.button(96, 62 + i * 30, preset.label, () => this.pickDate(preset.id), { w: 168, h: 22 });
    });

    L.panel(196, 48, 436, 172);
    this.detail = new Layer(this, { depth: 1 });

    L.text(8, 232, "MISSION LENGTH", { color: TEXT.accent });
    this.lengthButtons = {};
    MISSION_LENGTHS.forEach((length, i) => {
      this.lengthButtons[length.days] = L.button(66 + i * 124, 258, length.label, () => this.pickLength(length.days), { w: 112, h: 22 });
    });
    this.lengthHint = L.text(8, 280, "", { wrap: 624, color: TEXT.muted });

    L.button(470, 340, "< BACK", () => this.scene.start("WeatherDeck"), { w: 80, key: "ESCAPE" });
    L.button(572, 340, "LAUNCH!", () => this.launch(), { w: 112, key: "ENTER" });
    this.refresh();
    L.focusFirst(this.dateButtons[this.mission.dateId]);
  }

  pickDate(id) {
    // Picking RANDOM again rolls a new week.
    if (id === "archive") this.mission.roll = Math.random();
    this.mission.dateId = id;
    this.refresh();
  }

  pickLength(days) {
    this.mission.totalDays = days;
    this.refresh();
  }

  refresh() {
    const { dateId, totalDays, roll } = this.mission;
    for (const [id, button] of Object.entries(this.dateButtons)) button.setSelected(id === dateId);
    for (const [days, button] of Object.entries(this.lengthButtons)) button.setSelected(Number(days) === totalDays);
    const length = MISSION_LENGTHS.find((l) => l.days === totalDays);
    this.lengthHint.setText(`${length.blurb}. The rover must be built by the last day, when the launch window to the far side closes.`);

    const preset = DATE_PRESETS.find((p) => p.id === dateId);
    const file = getDonki(this, dateId);
    const start = missionStartDate(file, dateId, totalDays, roll);
    const end = addDays(start, totalDays - 1);
    const rating = difficultyFor(file, start, totalDays);

    this.detail.destroy();
    this.detail = new Layer(this, { depth: 1 });
    const D = this.detail;
    const x = 206;
    D.text(x, 56, preset.label, { size: 16, color: TEXT.white });
    D.text(x, 78, `${niceDate(start)} to ${niceDate(end)}`, { color: TEXT.accent });
    D.text(x, 94, preset.blurb, { wrap: 416, color: TEXT.muted });
    D.text(x, 116, rating.summary, { wrap: 416 });
    D.text(x, 148, "DIFFICULTY", { color: TEXT.muted });
    const g = D.gfx();
    drawStars(g, x + 92, 152, rating.stars, 3, 6);
    const c = rating.count;
    D.text(x, 166, `FLARE DAYS ${c.M + c.X}   STORM DAYS ${c.SEP}   SUN CLOUDS ${c.CME}`, { color: TEXT.muted });
    // Cached data is never called live, even for "this month".
    dataBadge(D, x, 186, { label: `NASA DONKI space weather, ${cachedOnText(file)}`, real: true, url: file.sourceUrl ?? "https://ccmc.gsfc.nasa.gov/tools/DONKI/" }, { maxWidth: 416 });
    if (dateId === "archive") D.text(622, 60, "PICK AGAIN TO RE-ROLL", { origin: 1, color: TEXT.good });
  }

  launch() {
    startMission(this);
    this.scene.start("Landing");
  }
}
