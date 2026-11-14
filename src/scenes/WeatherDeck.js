import Phaser from "phaser";
import { PALETTE, TEXT } from "../constants.js";
import { getMission } from "../data/mission.js";
import { ALERTS, DECK_CARDS, MIN_DECK } from "../sim/events.js";
import { SCORE } from "../sim/scoring.js";
import { drawStars } from "../ui/backdrop.js";
import { drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

// Short card text. The full explanation appears when the alert happens.
const CARD = {
  flare: { name: "SOLAR FLARES", line: "Real flares from your mission date.", source: "REAL: NASA DONKI" },
  night: { name: "LONG SHADOW", line: "2 days with no sunlight.", source: "SIMPLIFIED" },
  meteor: { name: "SPACE ROCK", line: "Damages a building.", source: "SIMPLIFIED" },
  leak: { name: "AIR LEAK", line: "Air hisses out of a crack.", source: "SIMPLIFIED" },
  dust: { name: "MOON DUST", line: "Blocks sunlight and filters.", source: "APOLLO REPORTS" },
  temp: { name: "COLD SNAP", line: "Heat costs power.", source: "SIMPLIFIED" },
  plant: { name: "SICK PLANTS", line: "Less food for 3 days.", source: "CSA TOOLKIT" },
  comms: { name: "EARTH CALLING", line: "Wait for help or guess?", source: "SIMPLIFIED" },
};
const CARD_W = 148;
const CARD_H = 104;

/** Screen 2 of 3: choose which weather events can strike. */
export class WeatherDeck extends Phaser.Scene {
  constructor() {
    super("WeatherDeck");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.mission = getMission(this);
    this.deck = new Set(this.mission.deck.filter((id) => DECK_CARDS.includes(id)));

    drawStars(this, { seed: "deck" });
    this.layer = new Layer(this, { keys: true });
    const L = this.layer;
    L.text(8, 8, "2/3 PICK YOUR WEATHER", { size: 16, color: TEXT.accent });
    L.text(8, 30, "Choose what can go wrong. More cards = more danger, more points.", { color: TEXT.muted });

    this.cards = [];
    ["flare", ...DECK_CARDS].forEach((id, i) => {
      const x = 14 + (i % 4) * (CARD_W + 8);
      const y = 48 + Math.floor(i / 4) * (CARD_H + 8);
      this.cards.push(this.makeCard(id, x, y));
    });

    this.summary = L.text(8, 280, "", { wrap: 624 });
    L.button(60, 340, "ALL", () => this.setAll(true), { w: 56 });
    L.button(126, 340, "FEWEST", () => this.setAll(false), { w: 64 });
    L.button(470, 340, "< BACK", () => this.leave("Blueprints"), { w: 80, key: "ESCAPE" });
    L.button(580, 340, "NEXT >", () => this.next(), { w: 96, key: "ENTER" });
    this.refresh();
    L.focusFirst(this.cards[1]);
  }

  makeCard(id, x, y) {
    const L = this.layer;
    const locked = id === "flare";
    const info = CARD[id];
    const bg = L.rect(x, y, CARD_W, CARD_H, PALETTE.panel, 0.96).setInteractive({ useHandCursor: !locked });
    const icon = L.gfx();
    drawIcon(icon, ALERTS[id].icon, x + 8, y + 8, 2);
    L.text(x + 40, y + 10, info.name, { wrap: CARD_W - 44 });
    L.text(x + 8, y + 40, info.line, { wrap: CARD_W - 16, color: TEXT.muted });
    L.text(x + 8, y + 76, info.source, { color: info.source.startsWith("REAL") ? TEXT.good : "#6b7384" });
    const state = L.text(x + CARD_W - 8, y + 90, "", { origin: 1 });

    const card = {
      id,
      bg,
      state,
      locked,
      focused: false,
      setFocus: (value) => {
        card.focused = value;
        this.paint(card);
      },
      activate: () => this.toggle(card),
      adjust: () => this.toggle(card),
    };
    bg.on("pointerover", () => this.layer.focus.focusItem(card));
    bg.on("pointerdown", () => this.toggle(card));
    this.layer.focus.add(card);
    return card;
  }

  toggle(card) {
    if (card.locked) {
      sfx("deny");
      return;
    }
    if (this.deck.has(card.id)) {
      if (this.deck.size <= MIN_DECK) {
        sfx("deny");
        this.summary.setText(`You need at least ${MIN_DECK} cards. Space is never fully safe!`).setColor(TEXT.danger);
        return;
      }
      this.deck.delete(card.id);
    } else {
      this.deck.add(card.id);
    }
    sfx("click");
    this.refresh();
  }

  setAll(on) {
    this.deck = new Set(on ? DECK_CARDS : DECK_CARDS.slice(1, 1 + MIN_DECK));
    this.refresh();
  }

  paint(card) {
    const on = card.locked || this.deck.has(card.id);
    card.bg.setFillStyle(on ? 0x16263a : PALETTE.panel, 0.96);
    card.bg.setStrokeStyle(card.focused ? 2 : 1, card.focused ? 0xffffff : on ? PALETTE.good : PALETTE.panelEdge);
    card.state.setText(card.locked ? "ALWAYS ON" : on ? "IN DECK" : "LEFT OUT").setColor(on ? TEXT.good : TEXT.muted);
  }

  refresh() {
    for (const card of this.cards) this.paint(card);
    const count = this.deck.size;
    this.summary
      .setText(`${count} card${count === 1 ? "" : "s"} in your deck: +${count * SCORE.PER_DECK_CARD} bonus points. Events strike on random days, so stay ready.`)
      .setColor(TEXT.white);
  }

  save() {
    this.mission.deck = DECK_CARDS.filter((id) => this.deck.has(id));
  }

  leave(target) {
    this.save();
    this.scene.start(target);
  }

  next() {
    this.leave("DateSelect");
  }
}
