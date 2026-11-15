import Phaser from "phaser";
import { PALETTE, TEXT, UI } from "../constants.js";
import { drawChips } from "../ui/chips.js";
import { dataBadge } from "../ui/DataBadge.js";
import { infoButton } from "../ui/InfoCard.js";
import { framingStars } from "../sim/rules.js";
import { Layer, drawStars, openLink } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const VIEW = { x: 192, y: 78, w: 256, h: 192 };
const FRAME = { w: 52, h: 40 };
const KEY_SPEED = 130;
const MISS_DISTANCE = 70; // px from the target at which accuracy reaches zero

/** Make a tiny copy of a photo, so it shows as chunky pixels when scaled up. */
function pixelated(scene, key) {
  const smallKey = `${key}-px`;
  if (scene.textures.exists(smallKey)) return smallKey;
  if (!scene.textures.exists(key)) return null;
  try {
    const source = scene.textures.get(key).getSourceImage();
    const canvas = scene.textures.createCanvas(smallKey, 64, 48);
    // Crop the middle of the photo to the 4:3 view.
    const crop = Math.min(source.width, (source.height * 4) / 3);
    const cropH = (crop * 3) / 4;
    canvas.context.drawImage(source, (source.width - crop) / 2, (source.height - cropH) / 2, crop, cropH, 0, 0, 64, 48);
    canvas.refresh();
    return smallKey;
  } catch {
    return null;
  }
}

/**
 * The camera viewfinder. Move the frame over the blinking target, then SNAP.
 * Arrow keys or the pointer move the frame. Better framing earns more stars.
 * After the snap the real NASA photo of the place is revealed, with credit.
 */
export class Viewfinder {
  /** @param {object} crater  an entry from craters.json */
  constructor(scene, crater, { onSnap, onClose }) {
    this.scene = scene;
    this.crater = crater;
    this.onSnap = onSnap;
    this.onClose = onClose;
    this.snapped = false;
    this.time = 0;

    const L = (this.layer = new Layer(scene, { depth: 300, fixed: true, keys: true }));
    L.focus.arrowsMove = false;
    L.dim(0.8);
    L.panel(120, 34, 400, 290, { edge: PALETTE.accent, alpha: 1 });
    L.text(320, 42, "TAP THE TARGET TO SNAP!", { origin: 0.5, color: TEXT.accent, size: UI.big });

    const key = pixelated(scene, `crater-${crater.nasaId}`);
    if (key) {
      L.add(scene.add.image(VIEW.x, VIEW.y, key).setOrigin(0).setDisplaySize(VIEW.w, VIEW.h));
    } else {
      L.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h, 0x2c2e33, 1);
    }
    const margin = 44;
    this.target = {
      x: Phaser.Math.Between(VIEW.x + margin, VIEW.x + VIEW.w - margin),
      y: Phaser.Math.Between(VIEW.y + margin, VIEW.y + VIEW.h - margin),
    };
    // Start the frame well away from the target.
    this.frame = {
      x: this.target.x > VIEW.x + VIEW.w / 2 ? VIEW.x + 50 : VIEW.x + VIEW.w - 50,
      y: this.target.y > VIEW.y + VIEW.h / 2 ? VIEW.y + 40 : VIEW.y + VIEW.h - 40,
    };
    this.g = L.gfx();

    this.keys = scene.input.keyboard.addKeys({ left: "LEFT", right: "RIGHT", up: "UP", down: "DOWN" });
    this.inView = (p) => p.x >= VIEW.x && p.x <= VIEW.x + VIEW.w && p.y >= VIEW.y && p.y <= VIEW.y + VIEW.h;
    this.onMove = (pointer) => {
      if (this.snapped || !this.inView(pointer)) return;
      this.frame.x = pointer.x;
      this.frame.y = pointer.y;
    };
    scene.input.on("pointermove", this.onMove);
    this.onTap = (pointer) => {
      if (this.snapped || !this.inView(pointer)) return;
      this.onMove(pointer);
      this.snap();
    };
    scene.input.on("pointerdown", this.onTap);
    this.snapButton = L.button(320, 298, "SNAP!", () => this.snap(), { w: 150, h: 36, key: "SPACE", icon: "camera" });
    L.focus.hotkey("ENTER", () => this.snap());
    L.focusFirst(this.snapButton);
  }

  update(dt) {
    if (this.snapped) return;
    this.time += dt;
    const k = this.keys;
    const dx = (k.right.isDown ? 1 : 0) - (k.left.isDown ? 1 : 0);
    const dy = (k.down.isDown ? 1 : 0) - (k.up.isDown ? 1 : 0);
    this.frame.x = Phaser.Math.Clamp(this.frame.x + dx * KEY_SPEED * dt, VIEW.x + FRAME.w / 2, VIEW.x + VIEW.w - FRAME.w / 2);
    this.frame.y = Phaser.Math.Clamp(this.frame.y + dy * KEY_SPEED * dt, VIEW.y + FRAME.h / 2, VIEW.y + VIEW.h - FRAME.h / 2);
    this.draw();
  }

  /** The frame as drawn: its position plus a small hand shake. */
  shown() {
    return {
      x: this.frame.x + Math.sin(this.time * 3.1) * 3,
      y: this.frame.y + Math.cos(this.time * 2.3) * 2,
    };
  }

  draw() {
    const g = this.g;
    g.clear();
    // Target: blinking corner brackets.
    const blink = Math.floor(this.time * 4) % 2 === 0;
    const t = this.target;
    g.fillStyle(blink ? 0xff5d5d : 0xffd166, 1);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = t.x + (sx * FRAME.w) / 2;
      const cy = t.y + (sy * FRAME.h) / 2;
      g.fillRect(sx < 0 ? cx : cx - 8, sy < 0 ? cy : cy - 2, 8, 2);
      g.fillRect(sx < 0 ? cx : cx - 2, sy < 0 ? cy : cy - 8, 2, 8);
    }
    g.fillRect(t.x - 1, t.y - 1, 3, 3);
    // Camera frame.
    const f = this.shown();
    g.lineStyle(2, 0xffffff, 1);
    g.strokeRect(f.x - FRAME.w / 2, f.y - FRAME.h / 2, FRAME.w, FRAME.h);
    g.lineBetween(f.x - 5, f.y, f.x + 5, f.y);
    g.lineBetween(f.x, f.y - 5, f.x, f.y + 5);
  }

  snap() {
    if (this.snapped) return;
    this.snapped = true;
    sfx("snap");
    const f = this.shown();
    const distance = Phaser.Math.Distance.Between(f.x, f.y, this.target.x, this.target.y);
    const accuracy = Phaser.Math.Clamp(1 - distance / MISS_DISTANCE, 0, 1);
    const stars = framingStars(accuracy);
    this.cleanup();
    this.onSnap({ accuracy, stars });
    this.reveal(stars);
  }

  /** Show the real photo of this place, with its credit. */
  reveal(stars) {
    const scene = this.scene;
    const crater = this.crater;
    const L = (this.layer = new Layer(scene, { depth: 300, fixed: true, keys: true }));
    L.dim(0.85);
    L.panel(60, 14, 520, 332, { edge: PALETTE.good, alpha: 1 });
    L.text(76, 24, crater.name.toUpperCase(), { size: 32, color: TEXT.accent });
    const g = L.gfx();
    drawStars(g, 500, 32, stars, 3, 7);
    const key = `crater-${crater.nasaId}`;
    if (scene.textures.exists(key)) {
      const image = L.add(scene.add.image(210, 148, key));
      const scale = Math.min(260 / image.width, 196 / image.height);
      image.setScale(scale);
    } else {
      L.rect(80, 50, 260, 196, 0x2c2e33, 1);
      L.text(210, 140, "PHOTO NOT LOADED", { origin: 0.5, color: TEXT.muted });
    }
    L.text(356, 56, "THE REAL PLACE", { color: TEXT.good });
    infoButton(L, 556, 64, "place.crater", { focus: false });
    L.text(356, 76, crater.kidFact, { wrap: 212 });
    L.text(356, 176, ["", "OK SHOT", "GOOD SHOT!", "PERFECT SHOT!"][stars], { color: TEXT.accent, size: UI.big });
    L.text(356, 202, crater.mission, { wrap: 212, color: TEXT.muted });
    dataBadge(L, 76, 256, { label: `NASA image. Credit: ${crater.credit}`, real: true, url: crater.link }, { maxWidth: 488 });
    drawChips(L, 76, 290, [["clock", "PAUSED", TEXT.muted]], { size: UI.body, iconScale: 1 });
    L.button(250, 322, "SEE AT NASA", () => openLink(crater.link), { w: 150, h: 34 });
    const next = L.button(480, 322, "KEEP GOING", () => this.close(), { w: 150, h: 34, key: "ENTER", icon: "play" });
    L.focusFirst(next);
  }

  cleanup() {
    this.scene.input.off("pointermove", this.onMove);
    this.scene.input.off("pointerdown", this.onTap);
    this.layer?.destroy();
    this.layer = null;
  }

  close() {
    this.cleanup();
    this.onClose();
  }
}
