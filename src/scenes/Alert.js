import Phaser from "phaser";
import { CommsWait, HeatSlider, PlantBalance } from "../minigames/Controls.js";
import { DragToShelter } from "../minigames/DragToShelter.js";
import { DustWipe } from "../minigames/DustWipe.js";
import { PatchLeak } from "../minigames/PatchLeak.js";
import { RepairBot } from "../minigames/RepairBot.js";
import { ALERTS, applyAlertResult } from "../sim/events.js";
import { AlertCard, CARD } from "../ui/AlertCard.js";
import { costChips } from "../ui/chips.js";
import { clearFocusFor } from "../ui/kit.js";

const GAMES = { DragToShelter, PatchLeak, DustWipe, RepairBot, HeatSlider, PlantBalance, CommsWait };

/** An icon for each choice button. */
const OPTION_ICON = {
  shelter: "ship", work: "build", bot: "wrench", leave: "cross", patch: "leak", ignore: "cross", wipe: "dust",
};

/** One short line about what is happening, adjusted to the exact event. */
function explainFor(event, def) {
  if (event.id === "flare") {
    if (event.level === "SEP") return "The strongest radiation there is. Get inside!";
    if (event.level === "X") return "A huge flare! Radiation is racing here. Get inside!";
    return "Radiation is on its way. Get everyone inside!";
  }
  if (event.id === "meteor" && event.targetName) return `A space rock hit the ${event.targetName.toLowerCase()}!`;
  return def.explain;
}

/**
 * One alert, shown over the outpost. Every alert uses the same card:
 * picture and title, one line, data badge, choices with costs, the result.
 * Started with { event, onDone(note) }.
 */
export class Alert extends Phaser.Scene {
  constructor() {
    super("Alert");
  }

  init(data) {
    this.event = data.event;
    this.onDone = data.onDone;
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.state = this.registry.get("state");
    this.def = ALERTS[this.event.id];
    this.game_ = null;
    this.timeLeft = 0;
    this.finished = false; // the scene object is reused for every alert
    this.timing = false;

    const source = this.event.real
      ? { label: this.event.badge, real: true, link: this.event.link }
      : this.def.source;
    const info = this.event.id === "flare" && this.event.level === "SEP" ? "alert.storm" : `alert.${this.event.id}`;
    this.card = new AlertCard(this, {
      icon: this.def.icon,
      title: this.event.title ?? this.def.title,
      explain: explainFor(this.event, this.def),
      source,
      info,
    });

    const hasChoice = this.def.options.some((option) => option.play);
    if (hasChoice) this.showChoices();
    else this.startGame(null);
  }

  /** Two options side by side, each with its cost as icons. */
  showChoices() {
    const options = this.def.options.map((option) => {
      const chips = costChips(option.cost);
      return {
        label: option.label,
        icon: OPTION_ICON[option.id],
        chips,
        onPick: () => {
          if (option.play) this.startGame(option.id);
          else this.finish({ option: option.id });
        },
      };
    });
    this.card.showChoices(options);
  }

  startGame(optionId) {
    this.card.clearBody();
    const Game = GAMES[this.def.minigame];
    const timerSec = this.def.timerSec;
    this.game_ = new Game(this, this.card.body(), CARD.area, {
      event: this.event,
      state: this.state,
      def: this.def,
      option: optionId,
      stopTimer: () => { this.timing = false; },
    }, (result) => this.finish({ option: optionId, ...result }));
    if (timerSec > 0) {
      this.timeTotal = timerSec;
      this.timeLeft = timerSec;
      this.timing = true;
    }
    this.card.setTimer(timerSec > 0 ? 1 : null);
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.game_?.update?.(dt);
    if (!this.timing) return;
    this.timeLeft -= dt;
    this.card.setTimer(Math.max(0, this.timeLeft / this.timeTotal));
    if (this.timeLeft <= 0) {
      this.timing = false;
      this.game_?.timeUp?.();
    }
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    this.timing = false;
    this.game_?.destroy?.();
    this.game_ = null;
    const before = { dose: this.state.today.eventDose, power: this.state.power };
    const { note } = applyAlertResult(this.state, this.event, result);
    const dose = this.state.today.eventDose - before.dose;
    const chips = [];
    if (dose > 0.005) chips.push(["dose", `+${dose.toFixed(1)} mSv`, "#ffb347"]);
    const power = this.state.power - before.power;
    if (power < 0) chips.push(["power", `${power.toFixed(0)}`, "#ff5d5d"]);
    const good = !(dose > 2 || /missed|ran out|Wrong|still|Not everyone|full dose|stays|loses/.test(note));
    this.card.showResult(note, chips, good, () => {
      const done = this.onDone;
      this.scene.stop();
      done?.(note);
    });
  }
}
