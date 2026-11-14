import Phaser from "phaser";
import { PALETTE, TEXT } from "../constants.js";
import { readBest, saveBest } from "../data/mission.js";
import { cachedOnText, getDonki, getFacts, niceDate } from "../data/nasa.js";
import { dateForDay } from "../sim/events.js";
import { PHOTO } from "../sim/rules.js";
import {
  buildTimeline, causeChain, doseComparison, finalScore, leftovers, outcomeKind, pickFactTag, realEventsSeen, retryHints, starGoals,
} from "../sim/scoring.js";
import { drawStars as starfield } from "../ui/backdrop.js";
import { dataBadge } from "../ui/DataBadge.js";
import { Layer, clearFocusFor, drawStars, openLink } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const TITLES = {
  success: ["MISSION SUCCESS!", TEXT.good],
  partial: ["PARTIAL SUCCESS", TEXT.accent],
  evacuated: ["EVACUATED: SENT HOME EARLY", TEXT.danger],
};

// The real-world engineering lesson behind each ending.
const LESSONS = {
  air: "Air has two jobs: adding oxygen and removing used breath. On a real station the air cleaner is watched all the time.",
  oxygen: "Life-support machines depend on each other. Real crews keep spare oxygen for the days a machine is down.",
  water: "Almost everything on a base needs water. That is why real missions recycle nearly every drop.",
  food: "Plants take time. Real missions pack stored food and treat fresh crops as a bonus.",
  dose: "Background radiation is hard to block, but a flare can be waited out in a small, thick-walled shelter.",
  timer: "Explorers set a turn-around time and stick to it, even when the goal is close.",
  time: "Real mission plans have a schedule margin, because weather and breakdowns always take days away.",
  returned: "Turning back with part of the job done is a real astronaut skill. The crew comes first.",
  success: "Engineers plan for the worst day, not the average day. Your base had enough margin to handle it.",
};

/** The debrief: what happened, why, and the real science behind it. */
export class Debrief extends Phaser.Scene {
  constructor() {
    super("Debrief");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.state = this.registry.get("state");
    const s = this.state;
    this.kind = outcomeKind(s);
    this.score = finalScore(s);
    this.goals = starGoals(s);
    this.bestBefore = readBest();
    this.newBest = saveBest(this.score.total);
    this.page = 0;
    starfield(this, { seed: "debrief" });

    this.frame = new Layer(this, { keys: true });
    const F = this.frame;
    const [title, color] = TITLES[this.kind];
    F.text(8, 8, title, { size: 16, color });
    this.pageText = F.text(632, 12, "", { origin: 1, color: TEXT.muted });
    F.panel(8, 32, 624, 284);
    F.button(54, 340, "< BACK", () => this.turn(-1), { w: 84 });
    this.nextButton = F.button(146, 340, "NEXT >", () => this.turn(1), { w: 84, key: "ENTER" });
    F.button(430, 340, "SOURCES", () => this.scene.start("Credits", { from: "Debrief" }), { w: 84 });
    F.button(558, 340, "PLAY AGAIN", () => this.again(), { w: 140, key: "R" });
    this.body = null;
    this.pages = [() => this.pageReport(), () => this.pageWhy(), () => this.pageScience()];
    this.draw();
    F.focusFirst(this.nextButton);
    sfx(this.kind === "evacuated" ? "bad" : "win");
  }

  turn(step) {
    this.page = (this.page + step + this.pages.length) % this.pages.length;
    this.draw();
  }

  draw() {
    this.body?.destroy();
    this.body = new Layer(this, { depth: 1 });
    this.pageText.setText(`PAGE ${this.page + 1}/${this.pages.length}`);
    this.pages[this.page]();
  }

  again() {
    this.registry.remove("outpostX");
    this.registry.remove("outpostHelpShown");
    this.scene.start("Blueprints");
  }

  pageReport() {
    const B = this.body;
    const s = this.state;
    B.text(20, 42, "REPORT CARD", { color: TEXT.accent });
    const rows = [
      ["DAYS SURVIVED", `${s.stats.daysSurvived} of ${s.totalDays}`],
      ["PHOTOS TAKEN", `${s.photosTaken} of ${PHOTO.TARGETS}`],
      ["SCIENCE", `${Math.round(s.science)}`],
      ["CREW DOSE", `${s.doseMSv.toFixed(1)} mSv (limit ${s.doseLimit})`],
      ["SUPPLIES LEFT", `${leftovers(s)} crew-days`],
      ["MISSION DATE", `${niceDate(s.missionDate)} (${s.dateLabel})`],
    ];
    rows.forEach(([label, value], i) => {
      B.text(20, 60 + i * 16, label, { color: TEXT.muted });
      B.text(170, 60 + i * 16, value, {});
    });

    B.text(20, 166, "STARS", { color: TEXT.accent });
    const g = B.gfx();
    drawStars(g, 80, 170, this.goals.stars, 3, 7);
    this.goals.goals.forEach((goal, i) => {
      const y = 186 + i * 14;
      // A tick or a dash, so the result does not rely on colour.
      g.fillStyle(goal.met ? PALETTE.good : 0x4c5566, 1);
      if (goal.met) {
        g.fillRect(20, y + 3, 2, 2); g.fillRect(22, y + 5, 2, 2); g.fillRect(24, y + 3, 2, 2); g.fillRect(26, y + 1, 2, 2);
      } else {
        g.fillRect(20, y + 3, 8, 2);
      }
      B.text(34, y, goal.label, { color: goal.met ? TEXT.white : TEXT.muted });
    });
    if (this.kind === "evacuated") B.text(20, 232, "An evacuated mission earns no stars. Try again!", { color: TEXT.muted });

    B.text(380, 42, "SCORE", { color: TEXT.accent });
    const parts = this.score.parts;
    const scoreRows = [
      ["DAYS", parts.days], ["PHOTOS", parts.photos], ["FRAMING", parts.framing], ["SCIENCE", parts.science],
      ["LOW DOSE", parts.dose], ["LEFTOVERS", parts.leftovers], ["WEATHER DECK", parts.deck],
    ];
    scoreRows.forEach(([label, value], i) => {
      B.text(380, 60 + i * 14, label, { color: TEXT.muted });
      B.text(612, 60 + i * 14, `${value}`, { origin: 1 });
    });
    B.rect(380, 160, 232, 1, PALETTE.panelEdge);
    B.text(380, 168, "TOTAL", { size: 16, color: TEXT.accent });
    B.text(612, 168, `${this.score.total}`, { size: 16, origin: 1 });
    B.text(612, 192, this.newBest ? "NEW BEST SCORE!" : `BEST: ${Math.max(this.bestBefore, this.score.total)}`, { origin: 1, color: this.newBest ? TEXT.good : TEXT.muted });

    B.text(20, 262, "Nobody was hurt. Press NEXT to see why the mission went this way.", { wrap: 600, color: TEXT.good });
    B.text(20, 290, "ALL GAME NUMBERS ARE SIMPLIFIED, NOT MISSION DATA.", { color: TEXT.muted });
  }

  pageWhy() {
    const B = this.body;
    const s = this.state;
    B.text(20, 42, "WHY IT WENT THIS WAY", { color: TEXT.accent });
    let y = 60;
    const g = B.gfx();
    causeChain(s).forEach((step, i) => {
      g.fillStyle(PALETTE.accent, 1);
      if (i > 0) g.fillTriangle(22, y - 8, 30, y - 8, 26, y - 3);
      const text = B.text(38, y, step, { wrap: 580 });
      y += text.height + 10;
    });

    const timeline = buildTimeline(s);
    y = Math.max(y + 4, 150);
    B.text(20, y, "BUILD TIMELINE", { color: TEXT.accent });
    y += 16;
    const byDay = {};
    for (const entry of timeline.done) (byDay[entry.day] ??= []).push(entry.name);
    const doneText = Object.entries(byDay).map(([day, names]) => `Day ${day}: ${names.join(", ")}`).join("   ");
    const built = B.text(20, y, doneText || "Nothing was finished.", { wrap: 600, color: TEXT.white });
    y += built.height + 6;
    for (const delay of timeline.delays.slice(0, 2)) {
      const text = B.text(20, y, `Day ${delay.day}: building slowed by ${delay.causes.join(" and ")}.`, { wrap: 600, color: "#ffb347" });
      y += text.height + 4;
    }

    y = Math.max(y + 6, 232);
    B.text(20, y, "TRY AGAIN TIPS", { color: TEXT.accent });
    y += 16;
    for (const hint of retryHints(s).slice(0, 2)) {
      const text = B.text(20, y, `- ${hint}`, { wrap: 600, color: TEXT.good });
      y += text.height + 4;
    }
  }

  pageScience() {
    const B = this.body;
    const s = this.state;
    B.text(20, 42, "THE REAL SCIENCE", { color: TEXT.accent });
    const dose = doseComparison(s);
    const doseText = B.text(20, 58, dose.lines.join(" "), { wrap: 600 });
    let y = doseText.y + doseText.height + 6;
    y += dataBadge(B, 20, y, { label: "Limits: NASA-STD-3001. X-ray: NASA NTRS. Moon dose: Chang'e-4 (Zhang 2020)", real: true, url: "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf" }, { maxWidth: 600 }).height + 10;

    B.text(20, y, "WHAT REALLY HAPPENED THAT WEEK", { color: TEXT.accent });
    y += 14;
    const file = getDonki(this, s.dateId ?? "calm");
    const seen = realEventsSeen(s);
    if (seen.length === 0) {
      const end = dateForDay(s.missionDate, s.totalDays);
      const text = B.text(20, y, `From ${niceDate(s.missionDate)} to ${niceDate(end)}, NASA recorded no strong flares on your mission days. (${cachedOnText(file)})`, { wrap: 600, color: TEXT.muted });
      y += text.height + 8;
    } else {
      for (const event of seen.slice(0, 3)) {
        y += dataBadge(B, 20, y, { label: `Day ${event.day}: ${event.badge}`, real: true, link: event.link }, { maxWidth: 600 }).height + 3;
      }
      if (seen.length > 3) {
        B.text(20, y, `...and ${seen.length - 3} more real solar events. Click a badge to see NASA's record.`, { color: TEXT.muted });
        y += 14;
      }
      y += 4;
    }

    const lesson = LESSONS[this.kind === "success" ? "success" : s.outcome?.cause] ?? LESSONS.success;
    y = Math.max(y, 190);
    B.text(20, y, "REAL-WORLD LESSON", { color: TEXT.accent });
    const lessonText = B.text(20, y + 14, lesson, { wrap: 600 });
    y = lessonText.y + lessonText.height + 10;

    const tag = pickFactTag(s);
    const facts = getFacts(this);
    const fact = facts.find((f) => f.tag === tag) ?? facts[0];
    if (fact && y < 270) {
      B.text(20, y, "SCIENCE FACT", { color: TEXT.accent });
      const factText = B.text(20, y + 14, fact.text, { wrap: 600 });
      if (fact.study && factText.y + factText.height + 22 < 314) {
        const box = dataBadge(B, 20, factText.y + factText.height + 4, { label: `NASA OSDR study ${fact.study.accession}: click to open`, real: true, url: fact.study.link }, { maxWidth: 600 });
        void box;
      }
    }
  }
}

export { openLink };
