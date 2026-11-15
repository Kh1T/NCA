// Small UI toolkit for the Moon game: layers, panels, buttons and keyboard focus.
// Everything is drawn with Phaser shapes and the pixel font, so it scales cleanly.

import { PALETTE, TEXT, UI, WIDTH, HEIGHT, textStyle } from "../constants.js";
import { drawIcon } from "./icons.js";
import { sfx } from "./sfx.js";

/**
 * Keyboard focus for one group of controls. Only the newest group listens,
 * so a pop-up takes the keys away from the screen underneath it.
 * Tab / arrows move, Enter or Space activates, Left / Right adjust sliders.
 */
export class FocusGroup {
  static stack = [];

  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.index = -1;
    this.hotkeys = {};
    this.arrowsMove = true;
    this.handler = (event) => this.onKey(event);
    scene.input.keyboard.on("keydown", this.handler);
    FocusGroup.stack.push(this);
  }

  get active() {
    return FocusGroup.stack[FocusGroup.stack.length - 1] === this;
  }

  add(item) {
    this.items.push(item);
    return item;
  }

  hotkey(key, fn) {
    this.hotkeys[key.toUpperCase()] = fn;
  }

  usable(item) {
    return item && (item.isEnabled ? item.isEnabled() : true) && (item.isVisible ? item.isVisible() : true);
  }

  focus(index) {
    if (this.items[this.index]) this.items[this.index].setFocus(false);
    this.index = index;
    if (this.items[this.index]) this.items[this.index].setFocus(true);
  }

  focusItem(item) {
    const index = this.items.indexOf(item);
    if (index >= 0) this.focus(index);
  }

  move(step) {
    if (this.items.length === 0) return;
    let index = this.index;
    for (let i = 0; i < this.items.length; i += 1) {
      index = (index + step + this.items.length) % this.items.length;
      if (this.usable(this.items[index])) {
        this.focus(index);
        sfx("tick");
        return;
      }
    }
  }

  onKey(event) {
    if (!this.active) return;
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key.toUpperCase();
    const current = this.items[this.index];
    if (event.key === "Tab") {
      event.preventDefault();
      this.move(event.shiftKey ? -1 : 1);
    } else if (this.arrowsMove && event.key === "ArrowDown") {
      this.move(1);
    } else if (this.arrowsMove && event.key === "ArrowUp") {
      this.move(-1);
    } else if (this.arrowsMove && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const step = event.key === "ArrowRight" ? 1 : -1;
      if (current?.adjust && this.usable(current)) current.adjust(step);
      else this.move(step);
    } else if (event.key === "Enter" || event.key === " ") {
      if (this.hotkeys[key === " " ? "SPACE" : "ENTER"]) this.hotkeys[key === " " ? "SPACE" : "ENTER"]();
      else if (this.usable(current)) current.activate();
    } else if (this.hotkeys[key]) {
      this.hotkeys[key]();
    }
  }

  destroy() {
    this.scene.input.keyboard.off("keydown", this.handler);
    FocusGroup.stack = FocusGroup.stack.filter((group) => group !== this);
    this.items = [];
  }
}

/** Empty the focus stack when a scene shuts down, so stale groups never linger. */
export function clearFocusFor(scene) {
  for (const group of FocusGroup.stack.filter((g) => g.scene === scene)) group.destroy();
}

/**
 * A set of display objects that are created and destroyed together, such as
 * a screen or a pop-up. All helpers place objects at this layer's depth.
 */
export class Layer {
  constructor(scene, { depth = 0, fixed = false, keys = false } = {}) {
    this.scene = scene;
    this.depth = depth;
    this.fixed = fixed;
    this.items = [];
    this.focus = keys ? new FocusGroup(scene) : null;
  }

  add(obj) {
    if (obj.setDepth) obj.setDepth(this.depth);
    if (this.fixed && obj.setScrollFactor) obj.setScrollFactor(0);
    this.items.push(obj);
    return obj;
  }

  /** Options: size, color, wrap (px), origin (0, 0.5, 1 or [x, y]), align. */
  text(x, y, str, o = {}) {
    const style = textStyle(o.size ?? 16, o.color ?? TEXT.white, { align: o.align ?? "left", lineSpacing: o.lineSpacing ?? 0 });
    if (o.wrap) style.wordWrap = { width: o.wrap };
    const text = this.scene.add.text(Math.round(x), Math.round(y), str, style);
    const origin = o.origin ?? 0;
    if (Array.isArray(origin)) text.setOrigin(origin[0], origin[1]);
    else text.setOrigin(origin, 0);
    return this.add(text);
  }

  rect(x, y, w, h, fill = PALETTE.panel, alpha = 1) {
    return this.add(this.scene.add.rectangle(x, y, w, h, fill, alpha).setOrigin(0));
  }

  /** A bordered box. x, y is the top-left corner. */
  panel(x, y, w, h, o = {}) {
    const box = this.scene.add.rectangle(x, y, w, h, o.fill ?? PALETTE.panel, o.alpha ?? 0.96).setOrigin(0);
    box.setStrokeStyle(1, o.edge ?? PALETTE.panelEdge);
    return this.add(box);
  }

  gfx() {
    return this.add(this.scene.add.graphics());
  }

  image(x, y, key) {
    return this.add(this.scene.add.image(x, y, key));
  }

  /** Dark full-screen sheet that also stops clicks reaching what is behind. */
  dim(alpha = 0.72) {
    const sheet = this.scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, alpha).setOrigin(0).setInteractive();
    return this.add(sheet);
  }

  /**
   * A button. x, y is its centre.
   * Options: w, h, size (font), icon (icon id drawn left of the label),
   * color, edge, fill, key (hotkey name), enabled.
   */
  button(x, y, label, onClick, o = {}) {
    const scene = this.scene;
    const size = o.size ?? (o.h && o.h < 28 ? UI.small : UI.big);
    const iconW = o.icon ? 22 : 0;
    const w = o.w ?? Math.max(56, label.length * size * 0.42 + 24 + iconW);
    const h = o.h ?? UI.button;
    const edge = o.edge ?? PALETTE.accent;
    const bg = scene.add.rectangle(x, y, w, h, o.fill ?? 0x1a2230, 1).setStrokeStyle(1, edge).setInteractive({ useHandCursor: true });
    const text = scene.add.text(x + iconW / 2, y, label, textStyle(size, o.color ?? TEXT.white)).setOrigin(0.5);
    this.add(bg);
    this.add(text);
    let iconG = null;
    if (o.icon) {
      iconG = this.gfx();
      const scale = h >= 30 ? 1.5 : 1;
      const left = label ? x + iconW / 2 - text.width / 2 - 6 - 12 * scale : x - 6 * scale;
      drawIcon(iconG, o.icon, Math.round(left), Math.round(y - 6 * scale), scale);
    }

    const button = {
      bg,
      text,
      enabled: o.enabled ?? true,
      focused: false,
      hover: false,
      selected: false,
      paint() {
        const lit = this.focused || this.hover;
        bg.setFillStyle(!this.enabled ? 0x14181f : this.selected ? 0x2c4a3a : lit ? 0x2a3850 : o.fill ?? 0x1a2230, 1);
        bg.setStrokeStyle(this.focused ? 2 : 1, !this.enabled ? 0x2a303b : this.focused ? 0xffffff : this.selected ? PALETTE.good : edge);
        text.setColor(!this.enabled ? "#4c5566" : o.color ?? TEXT.white);
        iconG?.setAlpha(this.enabled ? 1 : 0.35);
      },
      setFocus(value) {
        this.focused = value;
        this.paint();
      },
      setEnabled(value) {
        this.enabled = value;
        this.paint();
        return this;
      },
      setSelected(value) {
        this.selected = value;
        this.paint();
        return this;
      },
      setLabel(value) {
        text.setText(value);
        return this;
      },
      setIcon(id) {
        if (!iconG) return this;
        const scale = h >= 30 ? 1.5 : 1;
        iconG.clear();
        const left = text.text ? x + iconW / 2 - text.width / 2 - 6 - 12 * scale : x - 6 * scale;
        drawIcon(iconG, id, Math.round(left), Math.round(y - 6 * scale), scale);
        return this;
      },
      setVisible(value) {
        bg.setVisible(value);
        text.setVisible(value);
        iconG?.setVisible(value);
        if (value) bg.setInteractive({ useHandCursor: true });
        else bg.disableInteractive();
        return this;
      },
      isEnabled() {
        return this.enabled;
      },
      isVisible() {
        return bg.visible;
      },
      activate() {
        if (!this.enabled || !bg.visible) {
          sfx("deny");
          return;
        }
        sfx("click");
        onClick();
      },
    };
    bg.on("pointerover", (pointer) => {
      button.hover = true;
      button.paint();
      if (button.enabled && !pointer?.wasTouch) sfx("hover");
      o.onHover?.();
    });
    bg.on("pointerout", () => {
      button.hover = false;
      button.paint();
    });
    bg.on("pointerdown", () => button.activate());
    button.paint();
    if (this.focus) {
      this.focus.add(button);
      if (o.key) this.focus.hotkey(o.key, () => button.activate());
    }
    return button;
  }

  /** A square button that shows only an icon (sound, glossary, info...). */
  iconButton(x, y, icon, onClick, o = {}) {
    const size = o.size ?? UI.tap;
    return this.button(x, y, "", onClick, { ...o, w: size, h: size, icon });
  }

  /** Give keyboard focus to the first usable control. */
  focusFirst(item) {
    if (!this.focus) return;
    if (item) this.focus.focusItem(item);
    else {
      this.focus.index = -1;
      this.focus.move(1);
    }
  }

  destroy() {
    for (const obj of this.items) obj.destroy?.();
    this.items = [];
    this.focus?.destroy();
    this.focus = null;
  }
}

/** Size of a block of wrapped pixel text, without leaving it on screen. */
export function measure(scene, str, wrap, size = 16) {
  const probe = scene.add.text(0, 0, str, { ...textStyle(size, TEXT.white, { lineSpacing: 0 }), wordWrap: wrap ? { width: wrap } : undefined });
  const result = { width: probe.width, height: probe.height };
  probe.destroy();
  return result;
}

/** Draw a row of stars with shapes, because the pixel font has no star glyph. */
export function drawStars(g, x, y, count, max = 3, size = 5, gap = 4) {
  for (let i = 0; i < max; i += 1) {
    const cx = x + i * (size * 2 + gap) + size;
    const points = [];
    for (let p = 0; p < 10; p += 1) {
      const r = p % 2 === 0 ? size : size * 0.45;
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      points.push({ x: cx + Math.cos(a) * r, y: y + Math.sin(a) * r });
    }
    if (i < count) {
      g.fillStyle(PALETTE.accent, 1);
      g.fillPoints(points, true);
    } else {
      g.lineStyle(1, 0x6b7384, 1);
      g.strokePoints(points, true);
    }
  }
  return max * (size * 2 + gap) - gap;
}

/** A simple message pop-up with one or two buttons. Returns the layer. */
export function dialog(scene, { title, body, buttons, depth = 300, width = 420, icon = null }) {
  const layer = new Layer(scene, { depth, fixed: true, keys: true });
  layer.dim(0.7);
  const x = (WIDTH - width) / 2;
  const bodyH = body ? measure(scene, body, width - 32, UI.big).height : 0;
  const height = 50 + bodyH + 14 + 46;
  const y = Math.round((HEIGHT - height) / 2);
  layer.panel(x, y, width, height, { edge: PALETTE.accent });
  let tx = x + 16;
  if (icon) {
    drawIcon(layer.gfx(), icon, x + 16, y + 14, 2);
    tx += 34;
  }
  layer.text(tx, y + 10, title, { size: UI.title, color: TEXT.accent });
  if (body) layer.text(x + 16, y + 50, body, { wrap: width - 32, size: UI.big });
  const total = buttons.length;
  const bw = Math.min(170, (width - 32) / total - 10);
  buttons.forEach((b, i) => {
    const bx = WIDTH / 2 + (i - (total - 1) / 2) * (bw + 12);
    layer.button(bx, y + height - 28, b.label, () => {
      layer.destroy();
      b.onClick?.();
    }, { w: bw, h: UI.tap - 4, key: b.key, icon: b.icon });
  });
  layer.focusFirst();
  return layer;
}

/** Open a web link in a new tab without leaving the game. */
export function openLink(url) {
  if (!url) return;
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    // Pop-ups blocked: nothing else to do.
  }
}
