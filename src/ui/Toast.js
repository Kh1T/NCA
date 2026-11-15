import { PALETTE, TEXT, UI, WIDTH, textStyle } from "../constants.js";
import { drawIcon } from "./icons.js";
import { sfx } from "./sfx.js";
import { newlyEarned } from "../data/badges.js";
import { unlockBadge, unlockedBadges } from "../utils/progress.js";

/** Unlock and show every badge earned right now ("day" or "end"). */
export function celebrateBadges(scene, state, when) {
  for (const badge of newlyEarned(state, when, unlockedBadges())) {
    if (unlockBadge(badge.id)) toast(scene, { icon: badge.icon, title: badge.title, sub: "NEW BADGE!", kind: "badge" });
  }
}

const SHOW_MS = 2000;

/**
 * A celebration pop-up: a medal slides down at the top with sparkles and a
 * jingle, then slides away. It never blocks taps and never needs a click.
 * Several in a row wait in a queue.
 *
 * @param {Phaser.Scene} scene  the scene to draw in
 * @param {{icon: string, title: string, sub?: string, kind?: "build"|"badge"}} o
 */
export function toast(scene, o) {
  const queue = (scene.toastQueue ??= []);
  queue.push(o);
  if (!scene.toastBusy) showNext(scene);
}

function showNext(scene) {
  const o = scene.toastQueue.shift();
  if (!o || !scene.sys.isActive()) {
    scene.toastBusy = false;
    return;
  }
  scene.toastBusy = true;
  const w = 330;
  const h = 52;
  const x = (WIDTH - w) / 2;
  const y = 4;
  const badge = o.kind === "badge";
  const items = [];
  const add = (obj) => {
    obj.setDepth(950).setScrollFactor(0);
    items.push(obj);
    return obj;
  };
  const panel = add(scene.add.rectangle(x, y, w, h, 0x10141c, 0.97).setOrigin(0).setStrokeStyle(2, badge ? PALETTE.accent : PALETTE.good));
  const g = add(scene.add.graphics());
  // A gold disc behind the icon makes it read as a medal.
  g.fillStyle(badge ? PALETTE.accent : PALETTE.good, 1);
  g.fillCircle(x + 28, y + h / 2, 20);
  g.fillStyle(0x10141c, 1);
  g.fillCircle(x + 28, y + h / 2, 16);
  drawIcon(g, o.icon, x + 16, y + h / 2 - 12, 2);
  add(scene.add.text(x + 58, y + (o.sub ? 6 : 14), o.title.toUpperCase(), textStyle(UI.big, badge ? TEXT.accent : TEXT.good)));
  if (o.sub) add(scene.add.text(x + 58, y + 28, o.sub, textStyle(UI.body, TEXT.muted)));

  // Sparkles burst out from the medal.
  const sparks = [];
  for (let i = 0; i < 12; i += 1) {
    const spark = add(scene.add.rectangle(x + 28, y + h / 2, 3, 3, i % 2 ? 0xffd166 : 0xffffff));
    const angle = (i / 12) * Math.PI * 2;
    sparks.push(spark);
    scene.tweens.add({ targets: spark, x: spark.x + Math.cos(angle) * 40, y: spark.y + Math.sin(angle) * 30, alpha: 0, duration: 700, delay: 250 });
  }
  sfx(badge ? "achieve" : "done");

  for (const obj of items) obj.y -= 80;
  scene.tweens.add({ targets: items.filter((obj) => !sparks.includes(obj)), y: "+=80", duration: 320, ease: "Back.easeOut" });
  for (const spark of sparks) spark.y += 80;
  scene.time.delayedCall(SHOW_MS, () => {
    scene.tweens.add({
      targets: items,
      y: "-=80",
      alpha: 0,
      duration: 260,
      onComplete: () => {
        for (const obj of items) obj.destroy();
        showNext(scene);
      },
    });
  });
  void panel;
}
