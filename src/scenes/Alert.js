import Phaser from "phaser";
import { PALETTE, TEXT } from "../constants.js";
import { CommsWait, HeatSlider, NightSwitches, PlantBalance } from "../minigames/Controls.js";
import { DragToShelter } from "../minigames/DragToShelter.js";
import { DustWipe } from "../minigames/DustWipe.js";
import { PatchLeak } from "../minigames/PatchLeak.js";
import { RepairBot } from "../minigames/RepairBot.js";
import { ALERTS, applyAlertResult } from "../sim/events.js";
import { AlertCard, CARD } from "../ui/AlertCard.js";
import { clearFocusFor } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const GAMES = { DragToShelter, PatchLeak, DustWipe, RepairBot, NightSwitches, HeatSlider, PlantBalance, CommsWait };

/** Plain-language "what is happening", adjusted to the exact event. */
function explainFor(event, def) {
  if (event.id === "flare") {
    if (event.level === "SEP") return "A particle storm is coming: the strongest kind of space radiation. Get everyone inside before it arrives!";
    if (event.level === "X") return "The Sun fired one of its biggest flares. Radiation is racing toward the Moon. Get everyone inside!";
    return "The Sun fired a medium flare. A small burst of radiation is on its way. Get everyone inside!";
  }
  if (event.id === "meteor" && event.targetName) return `A tiny space rock hit the ${event.targetName.toLowerCase()}! Steer the repair bot to the hole.`;
  return def.explain;
}

/**
 * One alert, shown over the outpost. Every alert uses the same card:
 * title, what is happening, data badge, choices with costs, then the result.
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
    this.card = new AlertCard(this, {
      icon: this.def.icon,
      title: this.event.title ?? this.def.title,
      explain: explainFor(this.event, this.def),
      source,
      sourceNote: this.def.sourceNote,
    });

    const hasChoice = this.def.options.some((option) => option.play);
    if (hasChoice) this.showChoices();
    else this.startGame(null);
  }

  /** Two options side by side, each with its cost in plain sight. */
  showChoices() {
    const options = this.def.options.map((option) => ({
      label: option.label,
      cost: option.costTextBy?.[this.event.level] ?? option.costText,
      onPick: () => {
        if (option.play) this.startGame(option.id);
        else this.finish({ option: option.id });
      },
    }));
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
    const lines = [];
    if (dose > 0.005) lines.push(`RADIATION: +${dose.toFixed(1)} mSv`);
    const power = this.state.power - before.power;
    if (power < 0) lines.push(`POWER: ${power.toFixed(0)}`);
    sfx(dose > 2 || /missed|ran out|Wrong|still/.test(note) ? "bad" : "good");
    this.card.showResult(note, lines, () => {
      const done = this.onDone;
      this.scene.stop();
      done?.(note);
    });
  }
}

export { PALETTE, TEXT };
