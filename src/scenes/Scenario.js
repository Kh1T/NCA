import Phaser from "phaser";
import { PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { setMission } from "../data/mission.js";
import { SCENARIOS, missionFromScenario } from "../data/scenarios.js";
import { drawStars as drawSky } from "../ui/backdrop.js";
import { drawChips } from "../ui/chips.js";
import { drawIcon } from "../ui/icons.js";
import { infoButton } from "../ui/InfoCard.js";
import { Layer, clearFocusFor, drawStars } from "../ui/kit.js";
import { playMusic, sfx } from "../ui/sfx.js";

const CARD_W = 146;
const CARD_H = 244;
const CARD_Y = 54;

/**
 * Pick a mission: four big cards, easy to hard. One tap starts it.
 * Each card has a small "i" in its corner for the story behind it.
 */
export class Scenario extends Phaser.Scene {
  constructor() {
    super("Scenario");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    drawSky(this, { seed: "scenario" });
    playMusic("menu");
    const L = new Layer(this, { keys: true });
    L.text(WIDTH / 2, 10, "PICK A MISSION", { size: UI.title, color: TEXT.accent, origin: 0.5 });

    let first = null;
    SCENARIOS.forEach((scenario, i) => {
      const cx = 88 + i * (CARD_W + 9);
      const x = cx - CARD_W / 2;
      const card = L.button(cx, CARD_Y + CARD_H / 2, "", () => this.choose(scenario), { w: CARD_W, h: CARD_H, key: String(i + 1) });
      first ??= card;
      const g = L.gfx();
      drawIcon(g, scenario.icon, cx - 30, CARD_Y + 22, 5);
      L.text(cx, CARD_Y + 92, scenario.title.toUpperCase(), { size: UI.big, origin: 0.5, color: TEXT.accent });
      const stars = L.gfx();
      drawStars(stars, cx - 33, CARD_Y + 126, scenario.stars, 3, 9, 4);
      L.text(cx, CARD_Y + 142, scenario.story, { origin: 0.5, wrap: CARD_W - 18, align: "center", color: TEXT.muted });
      // Days of sunlight, then the night.
      drawChips(L, x + 12, CARD_Y + CARD_H - 30, [
        ["sun", `${scenario.days - scenario.nightDays}`],
        ["moon", `${scenario.nightDays}`],
      ], { size: UI.big, iconScale: 1.4, gap: 14 });
      // The small "i" in the card's corner.
      infoButton(L, x + CARD_W - 14, CARD_Y + 14, scenario.info, { focus: false });
    });

    L.button(70, 330, "BACK", () => this.scene.start("Title"), { w: 110, h: 36, key: "ESCAPE", icon: "back" });
    const g = L.gfx();
    drawIcon(g, "sun", 200, 322, 1.4);
    L.text(222, 320, "= DAYS", { color: TEXT.muted });
    drawIcon(g, "moon", 306, 322, 1.4);
    L.text(328, 320, "= NIGHTS", { color: TEXT.muted });
    L.focusFirst(first);
  }

  choose(scenario) {
    setMission(this, missionFromScenario(scenario));
    sfx("done");
    this.scene.start("HowTo");
  }
}

export { PALETTE };
