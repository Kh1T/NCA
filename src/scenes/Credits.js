import Phaser from "phaser";
import { playMusic } from "../ui/sfx.js";
import { TEXT } from "../constants.js";
import { cachedOnText, getCredits, niceDate } from "../data/nasa.js";
import { drawStars } from "../ui/backdrop.js";
import { Layer, clearFocusFor, openLink } from "../ui/kit.js";

/**
 * Science Sources: every dataset the game uses, the date it was cached, and
 * why it was used. Nothing here is live: it all comes from saved files.
 */
export class Credits extends Phaser.Scene {
  constructor() {
    super("Credits");
  }

  init(data) {
    this.from = data?.from ?? "Title";
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.credits = getCredits(this);
    this.page = 0;
    drawStars(this, { seed: "credits" });
    playMusic("menu");
    const F = (this.frame = new Layer(this, { keys: true }));
    F.text(8, 2, "SCIENCE SOURCES", { size: 32, color: TEXT.accent });
    this.pageText = F.text(632, 12, "", { origin: 1, color: TEXT.muted });
    F.panel(8, 38, 624, 278);
    F.iconButton(30, 338, "back", () => this.turn(-1), { size: 36 });
    const next = F.button(110, 338, "NEXT", () => this.turn(1), { w: 110, h: 36, key: "ENTER", icon: "play" });
    F.button(572, 338, "CLOSE", () => this.scene.start(this.from), { w: 110, h: 36, key: "ESCAPE" });
    this.pages = [() => this.pageWeather(), () => this.pagePhotos(), () => this.pageFacts(), () => this.pageHonesty()];
    this.body = null;
    this.draw();
    F.focusFirst(next);
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

  /** A line of text that opens a link when clicked. */
  link(x, y, label, url, wrap = 600) {
    const text = this.body.text(x, y, label, { wrap, color: TEXT.good });
    text.setInteractive({ useHandCursor: true });
    text.on("pointerdown", () => openLink(url));
    return text;
  }

  pageWeather() {
    const B = this.body;
    const donki = this.credits.donki;
    B.text(20, 44, "1. SPACE WEATHER: NASA DONKI", { color: TEXT.accent });
    if (!donki) {
      B.text(20, 60, "No cached data found. Run: npm run fetch-nasa", { color: TEXT.danger });
      return;
    }
    const why = B.text(20, 58, `WHY: ${donki.usedFor}`, { wrap: 600 });
    let y = why.y + why.height + 4;
    B.text(20, y, `SAVED COPY, ${cachedOnText(donki).toUpperCase()}. NOT LIVE DATA.`, { color: "#ffb347" });
    y += 18;
    for (const set of donki.datasets ?? []) {
      const c = set.counts;
      B.text(20, y, `${set.label.toUpperCase()}: ${niceDate(set.startDate)} to ${niceDate(set.endDate)}`, { color: TEXT.white });
      B.text(20, y + 16, `${c.flaresX} X flares, ${c.flaresM} M flares, ${c.sep} particle storm records, ${c.cmeEarthDirected} Earth-directed clouds`, { color: TEXT.muted, wrap: 600 });
      y += 36;
    }
    this.link(20, 294, "OPEN: ccmc.gsfc.nasa.gov/tools/DONKI", donki.homepage);
  }

  pagePhotos() {
    const B = this.body;
    const images = this.credits.images;
    B.text(20, 44, "2. CRATER PHOTOS: NASA IMAGE AND VIDEO LIBRARY", { color: TEXT.accent });
    if (!images) return;
    const why = B.text(20, 58, `WHY: ${images.usedFor}`, { wrap: 600 });
    let y = why.y + why.height + 4;
    B.text(20, y, `DOWNLOADED ONCE, ${cachedOnText(images).toUpperCase()}.`, { color: "#ffb347" });
    y += 18;
    for (const item of images.items ?? []) {
      this.link(20, y, `${item.name.toUpperCase()} (${item.nasaId})`, item.link);
      const credit = B.text(20, y + 16, `${item.mission}. Credit: ${item.credit}`, { color: TEXT.muted, wrap: 600 });
      y = credit.y + credit.height + 4;
    }
    B.text(20, 284, "The 'mysterious crater' in the story is made up. The photos are real.", { wrap: 600 });
  }

  pageFacts() {
    const B = this.body;
    const osdr = this.credits.osdr;
    B.text(20, 44, "3. FACTS AND LIMITS", { color: TEXT.accent });
    let y = 58;
    for (const fact of this.credits.staticFacts ?? []) {
      this.link(20, y, fact.fact, fact.link);
      B.text(20, y + 16, fact.source, { color: TEXT.muted, wrap: 600 });
      y += 38;
    }
    y += 4;
    B.text(20, y, `NASA OSDR STUDIES (${cachedOnText(osdr ?? {}).toUpperCase()})`, { color: TEXT.accent });
    y += 14;
    const items = osdr?.items ?? [];
    items.slice(0, 6).forEach((item, i) => {
      this.link(20 + (i % 3) * 200, y + Math.floor(i / 3) * 20, `${item.accession} ${item.topic.toUpperCase()}`, item.link, 190);
    });
    B.text(20, y + 44, "WHY: one fact card in the debrief, matched to how you played.", { wrap: 600, color: TEXT.muted });
    this.link(20, y + 70, "GLOSSARY TOPICS: NASA SPACE PLACE (spaceplace.nasa.gov/glossary)", "https://spaceplace.nasa.gov/glossary/en/");
    B.text(20, y + 88, "Definitions are written fresh for this game, not copied.", { color: TEXT.muted });
  }

  pageHonesty() {
    const B = this.body;
    B.text(20, 44, "4. WHAT IS REAL AND WHAT IS SIMPLIFIED", { color: TEXT.accent });
    B.text(
      20,
      60,
      [
        "REAL: the dates, sizes and links of every solar flare, particle storm and solar cloud. The crater photos. The radiation limits and the Moon's daily dose.",
        "SIMPLIFIED: supply amounts, power numbers, build times, point costs, and how much dose each event adds. They are scaled so a mission lasts minutes, not months.",
        "CACHED: all NASA data was saved to files before the game was built. Nothing is fetched while you play, so the game works offline and never calls saved data 'live'.",
        "NOT NASA: the Moon dose rate comes from China's Chang'e-4 lander (a Chinese-German instrument). The plant rules follow a Canadian Space Agency classroom toolkit.",
      ].join("\n\n"),
      { wrap: 600 },
    );
    B.text(20, 296, "Made for the NASA Space Apps Challenge.", { color: TEXT.muted });
  }
}
