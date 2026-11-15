import Phaser from "phaser";
import { PALETTE, TEXT, UI } from "../constants.js";
import { BADGES } from "../data/badges.js";
import { drawStars } from "../ui/backdrop.js";
import { drawIcon } from "../ui/icons.js";
import { Layer, clearFocusFor } from "../ui/kit.js";
import { playMusic } from "../ui/sfx.js";
import { unlockedBadges } from "../utils/progress.js";

const COLS = 4;

/** All badges: colour and a sparkle when unlocked, grey with a lock when not. */
export class Badges extends Phaser.Scene {
  constructor() {
    super("Badges");
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    playMusic("menu");
    drawStars(this, { seed: "badges" });
    const unlocked = unlockedBadges();
    const L = new Layer(this, { keys: true });
    drawIcon(L.gfx(), "medal", 10, 6, 2.2);
    L.text(44, 2, "BADGES", { size: UI.title, color: TEXT.accent });
    const count = BADGES.filter((b) => unlocked[b.id]).length;
    L.text(632, 8, `${count} / ${BADGES.length}`, { origin: 1, size: UI.big, color: count > 0 ? TEXT.good : TEXT.muted });

    this.detail = L.text(20, 306, "Tap a badge to see how to earn it.", { color: TEXT.muted });
    let first = null;
    BADGES.forEach((badge, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = 86 + col * 156;
      const cy = 64 + row * 60;
      const got = Boolean(unlocked[badge.id]);
      const button = L.button(cx, cy, "", () => this.show(badge, unlocked[badge.id]), { w: 148, h: 54, edge: got ? PALETTE.accent : PALETTE.panelEdge });
      first ??= button;
      const g = L.gfx();
      g.fillStyle(got ? PALETTE.accent : 0x2a303b, 1);
      g.fillCircle(cx - 48, cy, 20);
      g.fillStyle(0x10141c, 1);
      g.fillCircle(cx - 48, cy, 16);
      drawIcon(g, badge.icon, cx - 60, cy - 12, 2);
      if (!got) {
        // Grey it out and add a lock.
        g.fillStyle(0x10141c, 0.7);
        g.fillCircle(cx - 48, cy, 16);
        drawIcon(g, "lock", cx - 38, cy + 2, 1);
      } else {
        const spark = L.gfx();
        spark.fillStyle(0xffffff, 1);
        spark.fillRect(cx - 32, cy - 18, 2, 6);
        spark.fillRect(cx - 34, cy - 16, 6, 2);
        this.tweens.add({ targets: spark, alpha: 0.1, duration: 600 + i * 40, yoyo: true, repeat: -1 });
      }
      L.text(cx - 22, cy, badge.title.toUpperCase(), { origin: [0, 0.5], wrap: 92, color: got ? TEXT.white : TEXT.muted });
    });

    L.button(560, 336, "BACK", () => this.scene.start("Title"), { w: 120, h: 36, key: "ESCAPE", icon: "back" });
    L.focusFirst(first);
  }

  show(badge, date) {
    this.detail.setText(date ? `${badge.title.toUpperCase()}: unlocked on ${date}!` : `HOW TO EARN IT: ${badge.how}`)
      .setColor(date ? TEXT.good : TEXT.white);
  }
}
