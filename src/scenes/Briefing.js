import Phaser from "phaser";
import { playMusic } from "../ui/sfx.js";
import { PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { getMission, scenarioOf } from "../data/mission.js";
import { addDays, getDonki, missionStartDate, niceDate } from "../data/nasa.js";
import { goalsFor } from "../data/scenarios.js";
import { ALERTS } from "../sim/events.js";
import { realEventsByDay } from "../sim/events.js";
import { drawCeres } from "../ui/art.js";
import { drawStars } from "../ui/backdrop.js";
import { dataBadge } from "../ui/DataBadge.js";
import { drawIcon } from "../ui/icons.js";
import { infoButton } from "../ui/InfoCard.js";
import { Layer, clearFocusFor } from "../ui/kit.js";

/**
 * Mission briefing: the goal and the tasks as pictures, before the player
 * plans what to pack. No paragraphs.
 */
export class Briefing extends Phaser.Scene {
  constructor() {
    super("Briefing");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    drawStars(this, { seed: "briefing" });
    playMusic("menu");
    const mission = getMission(this);
    const scenario = scenarioOf(mission);
    const days = mission.totalDays;
    const L = new Layer(this, { keys: true });

    // Ceres announces the goal.
    const ceres = L.gfx();
    drawCeres(ceres, 0, 0);
    ceres.setScale(3).setPosition(70, 130);
    this.tweens.add({ targets: ceres, y: 124, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    infoButton(L, 104, 30, "mission.ceres", { focus: false });
    L.panel(130, 20, 490, 92, { edge: PALETTE.accent });
    const tail = L.gfx();
    tail.fillStyle(PALETTE.panel, 1);
    tail.fillTriangle(131, 60, 131, 80, 116, 76);
    L.text(375, 26, scenario.title.toUpperCase(), { origin: 0.5, color: TEXT.muted });
    const goal = L.text(375, 48, `${days} DAYS TO BUILD!`, { origin: 0.5, size: UI.huge, color: TEXT.accent });
    this.tweens.add({ targets: goal, scale: { from: 0.6, to: 1 }, duration: 500, ease: "Back.easeOut" });

    // The three tasks, as picture tiles.
    const goals = goalsFor(scenario, days);
    const g = L.gfx();
    goals.forEach((item, i) => {
      const cx = 210 + i * 150;
      g.fillStyle(0x10141c, 1);
      g.fillRect(cx - 68, 124, 136, 104);
      g.lineStyle(1, PALETTE.panelEdge, 1);
      g.strokeRect(cx - 68, 124, 136, 104);
      g.fillStyle(PALETTE.accent, 1);
      g.fillCircle(cx - 56, 136, 10);
      L.text(cx - 56, 136, String(i + 1), { origin: [0.5, 0.5], color: "#05060a" });
      drawIcon(g, item.icon, cx - 24, 140, 4);
      L.text(cx, 206, item.text.toUpperCase(), { origin: 0.5, wrap: 130, align: "center" });
    });

    // Dangers ahead: the hazard cards, plus the Sun if real flares are coming.
    const file = getDonki(this, mission.dateId);
    const start = missionStartDate(file, mission.dateId, days, mission.roll);
    const solarDays = realEventsByDay(file, start, days).filter((d) => d.alert).length;
    L.text(20, 246, "DANGERS", { color: TEXT.muted });
    const dangers = [...(solarDays > 0 ? ["sun"] : []), ...mission.deck.map((id) => ALERTS[id]?.icon).filter(Boolean)];
    dangers.forEach((icon, i) => drawIcon(g, icon, 100 + i * 32, 246, 1.6));
    L.text(100 + dangers.length * 32 + 6, 246, mission.maxEvents === null ? "AS MANY AS REALLY HAPPENED" : `UP TO ${mission.maxEvents} ALERTS`, { color: TEXT.muted });
    dataBadge(L, 20, 274, {
      label: `${niceDate(start)} to ${niceDate(addDays(start, days - 1))}, NASA DONKI`,
      real: true,
    }, { maxWidth: 420 });

    L.button(80, 336, "BACK", () => this.scene.start("Scenario"), { w: 110, h: 36, key: "ESCAPE" });
    const go = L.button(540, 336, "PACK THE SHIP", () => this.scene.start("Blueprints"), { w: 180, h: 36, key: "ENTER", icon: "crate" });
    L.focusFirst(go);
  }
}

export { WIDTH };
