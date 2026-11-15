import { HEIGHT, PALETTE, WIDTH } from "../constants.js";
import { drawIcon } from "./icons.js";

const SIZE = 48;

/**
 * On-screen buttons for touch screens: left and right on the left side,
 * JUMP and USE on the right. They appear after the first touch and stay
 * see-through so the world shows behind them. Several thumbs at once work.
 *
 * Read pad.left / pad.right every frame, and pad.takeJump() / pad.takeUse()
 * once per press.
 */
export class TouchPad {
  constructor(scene, { y = HEIGHT - 40, useLabel = "use", depth = 60 } = {}) {
    this.scene = scene;
    this.left = false;
    this.right = false;
    this.jumpQueued = false;
    this.useQueued = false;
    this.visible = false;
    this.items = [];
    const buttons = [
      { id: "left", x: 34, icon: "back" },
      { id: "right", x: 34 + SIZE + 12, icon: "play" },
      { id: "use", x: WIDTH - 34 - SIZE - 12, icon: useLabel === "use" ? "check" : useLabel },
      { id: "jump", x: WIDTH - 34, icon: "jump" },
    ];
    for (const b of buttons) this.makeButton(b, y, depth);
    // Shown once the screen has been touched anywhere (main.js sets "touchUsed").
    const registry = scene.registry;
    this.setVisible(Boolean(registry.get("touchUsed")));
    this.onData = (parent, value) => this.setVisible(Boolean(value));
    registry.events.on("setdata-touchUsed", this.onData);
    registry.events.on("changedata-touchUsed", this.onData);
    scene.events.once("shutdown", () => {
      registry.events.off("setdata-touchUsed", this.onData);
      registry.events.off("changedata-touchUsed", this.onData);
    });
  }

  makeButton({ id, x, icon }, y, depth) {
    const scene = this.scene;
    const g = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    const draw = (down) => {
      g.clear();
      g.fillStyle(down ? 0x2a3850 : 0x10141c, down ? 0.8 : 0.45);
      g.fillCircle(x, y, SIZE / 2);
      g.lineStyle(2, PALETTE.accent, down ? 1 : 0.6);
      g.strokeCircle(x, y, SIZE / 2);
      if (icon === "jump") {
        // An up arrow for jump.
        g.fillStyle(0x5ce7a0, 1);
        g.fillTriangle(x - 11, y + 4, x + 11, y + 4, x, y - 12);
        g.fillRect(x - 4, y + 4, 8, 9);
      } else {
        drawIcon(g, icon, x - 12, y - 12, 2);
      }
    };
    draw(false);
    const hit = scene.add.circle(x, y, SIZE / 2 + 6, 0x000000, 0.001).setScrollFactor(0).setDepth(depth + 1).setInteractive();
    const press = (down) => {
      draw(down);
      if (id === "left") this.left = down;
      else if (id === "right") this.right = down;
      else if (down && id === "jump") this.jumpQueued = true;
      else if (down && id === "use") this.useQueued = true;
    };
    hit.on("pointerdown", (pointer, lx, ly, event) => {
      event?.stopPropagation?.();
      press(true);
    });
    hit.on("pointerup", () => press(false));
    hit.on("pointerout", () => press(false));
    this.items.push(g, hit);
  }

  setVisible(value) {
    this.visible = value;
    for (const item of this.items) {
      item.setVisible(value);
      if (item.input) item.input.enabled = value;
    }
    if (!value) {
      this.left = false;
      this.right = false;
    }
  }

  /** True once per JUMP press. */
  takeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** True once per USE press. */
  takeUse() {
    const u = this.useQueued;
    this.useQueued = false;
    return u;
  }

  /** -1, 0 or 1 from the arrow buttons. */
  get direction() {
    return this.left === this.right ? 0 : this.left ? -1 : 1;
  }
}
