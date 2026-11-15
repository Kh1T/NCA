import Phaser from "phaser";
import { HEIGHT, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { GLOSSARY, glossaryEntry, lettersInUse, searchGlossary, spacePlaceLink } from "../data/glossary.js";
import { drawStars } from "../ui/backdrop.js";
import { drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor, openLink } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const LIST = { x: 8, y: 74, w: 292, rowH: 28, rows: 9 };
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * The glossary: search, an A-Z strip, a list of terms and a picture card for
 * the chosen one. Opened from the menu, or on top of any screen from an info
 * card's READ MORE ({ overlay: true, term, onClose }).
 */
export class Glossary extends Phaser.Scene {
  constructor() {
    super("Glossary");
  }

  init(data) {
    this.overlay = Boolean(data?.overlay);
    this.from = data?.from ?? "Title";
    this.onCloseFn = data?.onClose ?? null;
    this.startTerm = data?.term ?? this.registry.get("glossaryTerm") ?? null;
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    this.query = "";
    this.results = GLOSSARY;
    this.scroll = 0;
    this.selected = Math.max(0, GLOSSARY.findIndex((e) => e.id === this.startTerm));

    if (this.overlay) this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x05060a, 0.94).setOrigin(0).setInteractive();
    else drawStars(this, { seed: "glossary" });

    const L = (this.frame = new Layer(this, { depth: 1, keys: true }));
    L.focus.arrowsMove = false;
    drawIcon(L.gfx(), "book", 10, 8, 2);
    L.text(40, 2, "WORDS", { size: UI.title, color: TEXT.accent });

    // Search box: a real text field, so phones show their keyboard.
    this.search = this.add.dom(330, 22).createFromHTML(
      '<input type="search" placeholder="search..." aria-label="Search words" autocomplete="off" '
      + 'style="width:200px;height:26px;font:20px VT323,monospace;background:#10141c;color:#f2f5fa;'
      + 'border:1px solid #ffd166;padding:0 6px;box-sizing:border-box;outline:none" />',
    );
    this.searchInput = this.search.node.querySelector("input");
    this.searchInput.addEventListener("input", () => this.setQuery(this.searchInput.value));
    const searchIcon = L.gfx();
    drawIcon(searchIcon, "question", 216, 16, 1);
    L.button(586, 22, "CLOSE", () => this.close(), { w: 96, h: 32, key: "ESCAPE" });

    // A-Z strip.
    const used = lettersInUse();
    this.letterTexts = {};
    LETTERS.forEach((letter, i) => {
      const x = 8 + i * 24 + 12;
      const on = used.has(letter);
      const text = L.text(x, 44, letter, { size: UI.big, origin: 0.5, color: on ? TEXT.white : "#3a4150" });
      this.letterTexts[letter] = text;
      if (!on) return;
      const hit = L.rect(x - 12, 42, 24, 28, 0, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.jumpTo(letter));
    });

    L.panel(LIST.x, LIST.y, LIST.w, LIST.rows * LIST.rowH + 4);
    L.panel(308, LIST.y, 324, 278);
    this.listLayer = null;
    this.cardLayer = null;
    L.button(48, 342, "▲", () => this.scrollBy(-LIST.rows + 1), { w: 72, h: 30 });
    L.button(128, 342, "▼", () => this.scrollBy(LIST.rows - 1), { w: 72, h: 30 });
    this.countText = L.text(296, 336, "", { origin: 1, color: TEXT.muted });

    // Tap a row to pick it; drag or scroll the wheel to move the list.
    const listHit = this.add.rectangle(LIST.x, LIST.y, LIST.w, LIST.rows * LIST.rowH, 0, 0.001).setOrigin(0).setInteractive().setDepth(2);
    let dragFrom = null;
    let dragged = false;
    listHit.on("pointerdown", (pointer) => { dragFrom = pointer.y; dragged = false; });
    listHit.on("pointermove", (pointer) => {
      if (dragFrom === null || !pointer.isDown) return;
      const rows = Math.trunc((dragFrom - pointer.y) / LIST.rowH);
      if (rows !== 0) {
        dragged = true;
        dragFrom -= rows * LIST.rowH;
        this.scrollBy(rows);
      }
    });
    listHit.on("pointerup", (pointer) => {
      if (dragFrom !== null && !dragged) {
        const row = Math.floor((pointer.y - LIST.y) / LIST.rowH);
        this.select(this.scroll + row);
      }
      dragFrom = null;
    });
    this.input.on("wheel", (pointer, over, dx, dy) => this.scrollBy(Math.sign(dy) * 2));

    this.keyHandler = (event) => this.onKey(event);
    this.input.keyboard.on("keydown", this.keyHandler);
    this.events.once("shutdown", () => this.input.keyboard.off("keydown", this.keyHandler));

    this.keepVisible();
    this.draw();
  }

  onKey(event) {
    const typing = document.activeElement === this.searchInput;
    if (event.key === "ArrowDown") this.select(this.selected + 1);
    else if (event.key === "ArrowUp") this.select(this.selected - 1);
    else if (event.key === "PageDown") this.scrollBy(LIST.rows - 1);
    else if (event.key === "PageUp") this.scrollBy(-LIST.rows + 1);
    else if (!typing && /^[a-z]$/i.test(event.key)) this.jumpTo(event.key.toUpperCase());
  }

  setQuery(value) {
    this.query = value;
    this.results = searchGlossary(value);
    this.scroll = 0;
    this.selected = 0;
    this.draw();
  }

  jumpTo(letter) {
    if (this.query) {
      this.searchInput.value = "";
      this.setQuery("");
    }
    const index = this.results.findIndex((e) => e.term[0].toUpperCase() === letter);
    if (index < 0) return;
    sfx("tick");
    this.selected = index;
    this.scroll = Math.min(index, Math.max(0, this.results.length - LIST.rows));
    this.draw();
  }

  scrollBy(rows) {
    const max = Math.max(0, this.results.length - LIST.rows);
    const next = Phaser.Math.Clamp(this.scroll + rows, 0, max);
    if (next === this.scroll) return;
    this.scroll = next;
    this.draw();
  }

  select(index) {
    if (index < 0 || index >= this.results.length) return;
    this.selected = index;
    sfx("tick");
    this.keepVisible();
    this.draw();
  }

  keepVisible() {
    if (this.selected < this.scroll) this.scroll = this.selected;
    if (this.selected >= this.scroll + LIST.rows) this.scroll = this.selected - LIST.rows + 1;
  }

  draw() {
    this.listLayer?.destroy();
    const Ls = (this.listLayer = new Layer(this, { depth: 1 }));
    const g = Ls.gfx();
    this.results.slice(this.scroll, this.scroll + LIST.rows).forEach((entry, i) => {
      const index = this.scroll + i;
      const y = LIST.y + 2 + i * LIST.rowH;
      if (index === this.selected) {
        g.fillStyle(0x2a3850, 1);
        g.fillRect(LIST.x + 2, y, LIST.w - 4, LIST.rowH - 2);
        g.lineStyle(1, 0xffffff, 1);
        g.strokeRect(LIST.x + 2, y, LIST.w - 4, LIST.rowH - 2);
      }
      drawIcon(g, entry.icon, LIST.x + 8, y + 5, 1.4);
      Ls.text(LIST.x + 34, y + 2, entry.term.toUpperCase(), { size: UI.big, color: index === this.selected ? TEXT.accent : TEXT.white });
    });
    if (this.results.length === 0) Ls.text(LIST.x + 12, LIST.y + 10, "No words found.", { color: TEXT.muted });
    // A small scroll bar shows where you are in the list.
    if (this.results.length > LIST.rows) {
      const trackH = LIST.rows * LIST.rowH - 8;
      const barH = Math.max(16, (trackH * LIST.rows) / this.results.length);
      const barY = LIST.y + 4 + ((trackH - barH) * this.scroll) / (this.results.length - LIST.rows);
      g.fillStyle(0x232a36, 1);
      g.fillRect(LIST.x + LIST.w - 6, LIST.y + 4, 3, trackH);
      g.fillStyle(PALETTE.accent, 1);
      g.fillRect(LIST.x + LIST.w - 6, barY, 3, barH);
    }
    this.countText.setText(`${this.results.length} WORDS`);
    for (const [letter, text] of Object.entries(this.letterTexts)) {
      const current = this.results[this.selected]?.term[0].toUpperCase() === letter;
      if (lettersInUse().has(letter)) text.setColor(current ? TEXT.accent : TEXT.white);
    }
    this.drawCard(this.results[this.selected]);
  }

  drawCard(entry) {
    this.cardLayer?.destroy();
    const C = (this.cardLayer = new Layer(this, { depth: 1, keys: false }));
    if (!entry) return;
    this.registry.set("glossaryTerm", entry.id);
    const x = 318;
    const y = LIST.y + 10;
    C.rect(x, y, 96, 96, 0x0b1018, 1).setStrokeStyle(1, PALETTE.panelEdge);
    const art = C.gfx();
    drawIcon(art, entry.icon, x + 12, y + 12, 6);
    C.text(x + 108, y, entry.term.toUpperCase(), { size: UI.title, color: TEXT.accent, wrap: 200 });
    C.text(x + 108, y + 64, entry.source === "spaceplace" ? "NASA SPACE PLACE TOPIC" : "MOON BASE WORD", { color: TEXT.muted });
    C.text(x, y + 108, entry.def, { size: UI.big, wrap: 304 });
    if (entry.source === "spaceplace") {
      const link = C.text(x, y + 218, "LEARN MORE AT NASA SPACE PLACE ↗", { color: TEXT.good });
      link.setInteractive({ useHandCursor: true }).on("pointerdown", () => openLink(spacePlaceLink(entry.term)));
    }
    C.text(x, y + 242, "Our own words. Topics: NASA Space Place.", { color: TEXT.muted });
  }

  close() {
    sfx("click");
    this.searchInput?.blur();
    if (this.overlay) {
      const done = this.onCloseFn;
      this.scene.stop();
      done?.();
    } else {
      this.scene.start(this.from);
    }
  }
}

export { glossaryEntry };
