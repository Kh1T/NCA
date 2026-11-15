import Phaser from "phaser";
import { PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { readBest, saveBest, scenarioOf } from "../data/mission.js";
import { cachedOnText, getDonki, getFacts, niceDate } from "../data/nasa.js";
import { dateForDay } from "../sim/events.js";
import { ACTIONS, PHOTO } from "../sim/rules.js";
import {
  causeChain, doseComparison, finalScore, goodCalls, leftovers, outcomeKind, pickFactTag, realEventsSeen, retryHints, starGoals,
} from "../sim/scoring.js";
import { celebrateBadges } from "../ui/Toast.js";
import { drawStars as starfield } from "../ui/backdrop.js";
import { drawChips } from "../ui/chips.js";
import { dataBadge } from "../ui/DataBadge.js";
import { drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor, drawStars, openLink } from "../ui/kit.js";
import { sfx, playMusic } from "../ui/sfx.js";

const TITLES = {
  success: ["MISSION SUCCESS!", TEXT.good, "medal"],
  partial: ["PARTLY DONE", TEXT.accent, "star"],
  evacuated: ["SENT HOME EARLY", TEXT.danger, "home"],
};

// The real-world lesson behind each ending. 12 words or fewer.
const LESSONS = {
  air: "Real stations watch their air cleaners all the time.",
  oxygen: "Real crews keep spare oxygen for when machines break.",
  water: "Real stations recycle almost every drop of water, using power.",
  food: "Plants take time. Real crews pack stored food too.",
  dose: "A small, thick-walled shelter helps crews wait out a flare.",
  time: "Real plans leave spare days for weather and breakdowns.",
  night: "A real Moon night lasts 14 days. Batteries are vital.",
  returned: "Turning back safely is a real astronaut skill.",
  success: "Engineers plan for the worst day, not the average day.",
};

/** A picture for each step of the cause-and-effect chain. */
function iconForStep(text) {
  const rules = [
    [/ISS|retreat|rescue|home|called/i, "home"], [/clean air|air leak|air filter/i, "air"], [/oxygen/i, "oxygen"],
    [/water/i, "water"], [/food|plant|greenhouse/i, "food"], [/flare|radiation|dose|shield/i, "dose"],
    [/shelter/i, "ship"], [/photo|crater/i, "camera"], [/cold|heat|suit/i, "cold"], [/power/i, "power"],
    [/rover/i, "rover"], [/built|building|finished|slowed/i, "build"], [/landed|window/i, "ship"],
  ];
  return rules.find(([re]) => re.test(text))?.[1] ?? "info";
}

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
    playMusic("menu");

    this.frame = new Layer(this, { keys: true });
    const F = this.frame;
    const [title, color, icon] = TITLES[this.kind];
    drawIcon(F.gfx(), icon, 10, 6, 2.2);
    F.text(44, 2, title, { size: UI.title, color });
    this.pageDots = F.gfx();
    F.panel(8, 40, 624, 274);
    F.iconButton(30, 338, "back", () => this.turn(-1), { size: 36 });
    this.nextButton = F.button(110, 338, "NEXT", () => this.turn(1), { w: 110, h: 36, key: "ENTER", icon: "play" });
    F.button(400, 338, "SOURCES", () => this.scene.start("Credits", { from: "Debrief" }), { w: 130, h: 36, icon: "science" });
    F.button(554, 338, "PLAY AGAIN", () => this.again(), { w: 156, h: 36, key: "R", icon: "home" });
    this.body = null;
    this.pages = [() => this.pageReport(), () => this.pageChoices(), () => this.pageWhy(), () => this.pageScience()];
    this.draw();
    F.focusFirst(this.nextButton);
    sfx(this.kind === "evacuated" ? "bad" : "win");
    this.time.delayedCall(900, () => celebrateBadges(this, s, "end"));
  }

  turn(step) {
    this.page = (this.page + step + this.pages.length) % this.pages.length;
    this.draw();
  }

  draw() {
    this.body?.destroy();
    this.body = new Layer(this, { depth: 1 });
    // Page dots instead of "PAGE 1/3".
    this.pageDots.clear();
    for (let i = 0; i < this.pages.length; i += 1) {
      this.pageDots.fillStyle(i === this.page ? PALETTE.accent : 0x3a4658, 1);
      this.pageDots.fillCircle(570 + i * 18, 20, 5);
    }
    this.pages[this.page]();
  }

  again() {
    this.registry.remove("outpostX");
    this.scene.start("Scenario");
  }

  /** Every day's choice, and whether it was the best call for that day. */
  pageChoices() {
    const B = this.body;
    const s = this.state;
    const calls = goodCalls(s);
    B.text(20, 48, `YOUR CHOICES: ${calls.good} OF ${calls.total} BEST CALLS`, { color: TEXT.accent, size: UI.big });
    const g = B.gfx();
    const list = (s.decisions ?? []).slice(0, 10);
    const colW = Math.min(60, Math.floor(600 / Math.max(1, list.length)));
    list.forEach((d, i) => {
      const x = 22 + i * colW;
      B.text(x + 24, 80, `D${d.day}`, { origin: 0.5, color: TEXT.muted });
      g.fillStyle(0x0b1018, 1);
      g.fillRect(x, 102, 48, 48);
      g.lineStyle(2, d.good ? PALETTE.good : PALETTE.warn, 1);
      g.strokeRect(x, 102, 48, 48);
      drawIcon(g, ACTIONS[d.option]?.icon ?? "info", x + 6, 108, 3);
      drawIcon(g, d.good ? "check" : "cross", x + 18, 158, 1);
      if (!d.good) {
        B.text(x + 24, 176, "BEST", { origin: 0.5, color: TEXT.muted });
        g.fillStyle(0x0b1018, 1);
        g.fillRect(x + 8, 196, 32, 32);
        drawIcon(g, ACTIONS[d.best]?.icon ?? "info", x + 12, 200, 2);
      }
    });
    if (list.length === 0) B.text(20, 100, "No days were played.", { color: TEXT.muted });
    // The best move for this mission.
    const tip = scenarioOf({ scenarioId: s.scenarioId }).tip;
    drawChips(B, 20, 250, [["star", tip, TEXT.good]], { size: UI.big, maxWidth: 600 });
    B.text(20, 282, "Green: best call. Orange: another choice was better.", { color: TEXT.muted });
  }

  pageReport() {
    const B = this.body;
    const s = this.state;
    const g = B.gfx();
    // Big stars.
    drawStars(g, 40, 76, this.goals.stars, 3, 18, 10);
    this.goals.goals.forEach((goal, i) => {
      const y = 112 + i * 30;
      drawIcon(g, goal.met ? "check" : "cross", 24, y + 2, 1.4);
      B.text(50, y, goal.label, { size: UI.big, color: goal.met ? TEXT.white : TEXT.muted });
    });
    if (this.kind === "evacuated") B.text(24, 210, "No stars this time. Try again!", { color: TEXT.muted });

    // The numbers, as icons.
    const stats = [
      ["calendar", `${s.stats.daysSurvived}/${s.totalDays} DAYS`],
      ["camera", `${s.photosTaken}/${PHOTO.TARGETS} PHOTOS`],
      ["star", `${goodCalls(s).good}/${goodCalls(s).total} BEST CALLS`],
      ["dose", `${s.doseMSv.toFixed(1)} mSv`],
      ["crate", `${leftovers(s)} SPARE`],
    ];
    stats.forEach(([icon, label], i) => {
      drawChips(B, 360, 58 + i * 28, [[icon, label]]);
    });
    B.rect(360, 204, 252, 1, PALETTE.panelEdge);
    B.text(360, 212, "SCORE", { size: UI.big, color: TEXT.accent });
    const total = B.text(612, 204, `${this.score.total}`, { size: UI.huge, origin: 1, color: TEXT.accent });
    this.tweens.addCounter({ from: 0, to: this.score.total, duration: 900, onUpdate: (t) => total.setText(`${Math.round(t.getValue())}`) });
    B.text(612, 256, this.newBest ? "NEW BEST!" : `BEST ${Math.max(this.bestBefore, this.score.total)}`, { origin: 1, size: UI.big, color: this.newBest ? TEXT.good : TEXT.muted });

    drawChips(B, 24, 260, [["crew", "NOBODY WAS HURT.", TEXT.good]]);
    B.text(24, 288, `${niceDate(s.missionDate)} · ${s.dateLabel} · NUMBERS SIMPLIFIED`, { color: TEXT.muted });
  }

  pageWhy() {
    const B = this.body;
    const s = this.state;
    B.text(20, 48, "WHY IT WENT THIS WAY", { color: TEXT.accent });
    const g = B.gfx();
    let y = 72;
    causeChain(s).slice(0, 5).forEach((step, i) => {
      if (i > 0) {
        g.fillStyle(PALETTE.accent, 1);
        g.fillTriangle(30, y - 8, 40, y - 8, 35, y - 2);
      }
      g.fillStyle(0x0b1018, 1);
      g.fillRect(22, y, 26, 24);
      drawIcon(g, iconForStep(step), 26, y + 3, 1.5);
      const text = B.text(58, y + 2, step, { wrap: 560 });
      y += Math.max(32, text.height + 14);
    });

    y = Math.max(y + 2, 244);
    drawIcon(B.gfx(), "question", 24, y + 4, 2);
    B.text(64, y, "TRY THIS", { color: TEXT.accent });
    for (const hint of retryHints(s).slice(0, 2)) {
      const text = B.text(64, y + 18, hint, { wrap: 550, color: TEXT.good });
      y += text.height + 2;
    }
  }

  pageScience() {
    const B = this.body;
    const s = this.state;
    B.text(20, 48, "THE REAL SCIENCE", { color: TEXT.accent });
    const dose = doseComparison(s);
    // The dose as a bar against the mission limit, plus X-rays as icons.
    const g = B.gfx();
    drawIcon(g, "dose", 20, 74, 1.5);
    g.fillStyle(0x232a36, 1);
    g.fillRect(46, 76, 300, 14);
    g.fillStyle(dose.dose > s.doseLimit ? PALETTE.danger : 0xff8c42, 1);
    g.fillRect(46, 76, Math.round(300 * Math.min(1, dose.dose / s.doseLimit)), 14);
    B.text(354, 72, `${dose.dose} OF ${s.doseLimit} mSv`, { size: UI.big });
    B.text(20, 98, `That is like ${dose.chestXrays} chest X-rays.`, { size: UI.big });
    let y = 128;
    y += dataBadge(B, 20, y, { label: "Limits: NASA-STD-3001. X-ray: NASA NTRS. Moon dose: Chang'e-4", real: true, url: "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf" }, { maxWidth: 600 }).height + 8;

    B.text(20, y, "WHAT REALLY HAPPENED", { color: TEXT.accent });
    y += 20;
    const file = getDonki(this, s.dateId ?? "calm");
    const seen = realEventsSeen(s);
    if (seen.length === 0) {
      const end = dateForDay(s.missionDate, s.totalDays);
      const text = B.text(20, y, `${niceDate(s.missionDate)} to ${niceDate(end)}: no strong flares. (${cachedOnText(file)})`, { wrap: 600, color: TEXT.muted });
      y += text.height + 8;
    } else {
      for (const event of seen.slice(0, 2)) {
        y += dataBadge(B, 20, y, { label: `Day ${event.day}: ${event.badge}`, real: true, link: event.link }, { maxWidth: 600 }).height + 4;
      }
      if (seen.length > 2) {
        B.text(20, y, `+${seen.length - 2} more real events. Tap a badge for NASA's record.`, { color: TEXT.muted });
        y += 20;
      }
    }

    const lesson = LESSONS[this.kind === "success" ? "success" : s.stats.nightPowerOut > 0 ? "night" : s.outcome?.cause] ?? LESSONS.success;
    y = Math.max(y + 4, 232);
    drawChips(B, 20, y, [["star", lesson, TEXT.white]], { size: UI.body });
    const tag = pickFactTag(s);
    const facts = getFacts(this);
    const fact = facts.find((f) => f.tag === tag) ?? facts[0];
    if (fact && y < 270) {
      const factText = B.text(20, y + 24, fact.text, { wrap: 600, color: TEXT.muted });
      if (fact.study && factText.y + factText.height < 300) {
        const link = B.text(612, 292, `NASA OSDR ${fact.study.accession} ↗`, { origin: 1, color: TEXT.good });
        link.setInteractive({ useHandCursor: true }).on("pointerdown", () => openLink(fact.study.link));
      }
    }
  }
}

export { WIDTH };
