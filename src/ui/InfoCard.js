import { HEIGHT, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { infoFor } from "../data/info.js";
import { drawBuilding, drawCeres, drawRover, drawShip } from "./art.js";
import { drawIcon } from "./icons.js";
import { Layer } from "./kit.js";
import { sfx } from "./sfx.js";

/**
 * A round "i" button. Tapping it opens the "Did you know?" card for `id`.
 * The circle is small, but the tap area is a full touch target.
 * Returns the button object so it can join keyboard focus.
 */
export function infoButton(layer, x, y, id, o = {}) {
  const scene = layer.scene;
  const r = o.r ?? 9;
  const g = layer.gfx();
  const draw = (lit) => {
    g.clear();
    g.fillStyle(lit ? 0x2a4a6a : 0x163050, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(lit ? 2 : 1, lit ? 0xffffff : 0x6cc5ff, 1);
    g.strokeCircle(x, y, r);
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 1, y - r + 4, 2, 2);
    g.fillRect(x - 1, y - r + 8, 2, r * 2 - 12);
  };
  draw(false);
  const hit = layer.add(scene.add.rectangle(x, y, o.hit ?? 32, o.hit ?? 32, 0x000000, 0.001).setInteractive({ useHandCursor: true }));
  const button = {
    focused: false,
    setFocus(value) { this.focused = value; draw(value); },
    isEnabled: () => true,
    isVisible: () => hit.visible,
    activate() {
      sfx("click");
      o.onOpen?.();
      openInfo(scene, id, { onClose: o.onClose });
    },
    setVisible(value) { g.setVisible(value); hit.setVisible(value); return this; },
  };
  hit.on("pointerover", () => draw(true));
  hit.on("pointerout", () => draw(button.focused));
  hit.on("pointerdown", (pointer, lx, ly, event) => {
    event?.stopPropagation?.();
    button.activate();
  });
  if (layer.focus && o.focus !== false) layer.focus.add(button);
  return button;
}

/** Draw the big picture for a card, centred on cx, cy. */
export function drawArt(g, art, cx, cy, size = 1) {
  // Everything is drawn around (0, 0) and then the graphics object is moved
  // and scaled, so the same art works at any size.
  g.setPosition(cx, cy);
  if (art.building) {
    g.setScale(2 * size);
    g.y += 38 * size;
    drawBuilding(g, art.building, 0, 0);
  } else if (art.rover) {
    g.setScale(2.4 * size);
    g.y += 40 * size;
    drawRover(g, 0, 0);
  } else if (art.ship) {
    g.setScale(1.3 * size);
    g.y += 52 * size;
    drawShip(g, 0, 0);
  } else if (art.ceres) {
    g.setScale(3 * size);
    g.y += 50 * size;
    drawCeres(g, 0, 0);
  } else {
    g.setScale(7 * size);
    drawIcon(g, art.icon ?? "info", -6, -6, 1);
  }
}

/** Share of the dose limit where each zone starts (the HUD bar turns red at 75%). */
export const DOSE_ZONES = { careful: 0.5, toomuch: 0.75 };

/** A tall gauge: green, amber and red zones, the limit at the top and a marker for the crew's dose now. */
function drawDoseGauge(L, x, y, w, h, state) {
  const g = L.gfx();
  const bx = x + 22;
  const top = y + 26;
  const bh = h - 40;
  const bw = 26;
  const zoneY = (share) => top + bh * (1 - share);
  const zones = [
    [0, DOSE_ZONES.careful, PALETTE.good, "SAFE"],
    [DOSE_ZONES.careful, DOSE_ZONES.toomuch, PALETTE.warn, "CAREFUL"],
    [DOSE_ZONES.toomuch, 1, PALETTE.danger, "TOO MUCH"],
  ];
  for (const [from, to, color, label] of zones) {
    g.fillStyle(color, 1);
    g.fillRect(bx, zoneY(to), bw, zoneY(from) - zoneY(to));
    L.text(bx + bw + 8, (zoneY(from) + zoneY(to)) / 2, label, { color: `#${color.toString(16).padStart(6, "0")}`, origin: [0, 0.5] });
  }
  g.lineStyle(1, 0xffffff, 1);
  g.strokeRect(bx, top, bw, bh);
  L.text(bx + bw / 2, y + 4, `LIMIT ${Math.round(state.doseLimit)}`, { origin: 0.5, color: TEXT.white });
  // The crew's dose now: an arrow pointing at the gauge.
  const share = Math.min(1, state.doseMSv / state.doseLimit);
  const my = zoneY(share);
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(bx - 2, my, bx - 14, my - 7, bx - 14, my + 7);
  g.fillRect(bx - 2, my - 1, bw + 4, 2);
}

/**
 * The "Did you know?" card: a big picture, a title, 1–3 short lines,
 * READ MORE (opens the glossary) and CLOSE. Only ever opened by the player.
 */
export function openInfo(scene, id, { onClose, depth = 700 } = {}) {
  const entry = infoFor(id);
  const L = new Layer(scene, { depth, fixed: true, keys: true });
  L.dim(0.7);
  const w = 460;
  const h = 236;
  const x = (WIDTH - w) / 2;
  const y = (HEIGHT - h) / 2;
  L.panel(x, y, w, h, { edge: 0x6cc5ff, alpha: 1 });

  // The picture sits on its own little stage and bobs gently.
  L.rect(x + 14, y + 14, 150, 150, 0x0b1018, 1).setStrokeStyle(1, PALETTE.panelEdge);
  const state = scene.registry.get("state");
  if (entry.art?.gauge && state) {
    drawDoseGauge(L, x + 14, y + 14, 150, 150, state);
  } else {
    const art = L.gfx();
    drawArt(art, entry.art ?? {}, x + 89, y + 89);
    scene.tweens.add({ targets: art, y: art.y - 4, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  const tx = x + 180;
  L.text(tx, y + 14, "DID YOU KNOW?", { color: "#6cc5ff" });
  L.text(tx, y + 32, entry.title.toUpperCase(), { size: UI.title, color: TEXT.accent, wrap: w - 196 });
  let ly = y + 72;
  for (const line of entry.lines.slice(0, 3)) {
    const text = L.text(tx, ly, line, { size: UI.big, wrap: w - 196 });
    ly += text.height + 8;
  }

  const close = () => {
    L.destroy();
    onClose?.();
  };
  const by = y + h - 30;
  const hasGlossary = Boolean(entry.glossary) && Boolean(scene.scene.manager.keys.Glossary);
  if (hasGlossary) {
    L.button(x + 100, by, "READ MORE", () => {
      close();
      openGlossary(scene, entry.glossary);
    }, { w: 160, h: 36, icon: "book" });
  }
  const closeButton = L.button(x + w - 76, by, "CLOSE", close, { w: 120, h: 36, key: "ESCAPE" });
  L.focusFirst(closeButton);
  return L;
}

/**
 * Open the glossary on top of the current screen, at `term`. The screen
 * underneath is paused and wakes up when the glossary closes.
 */
export function openGlossary(scene, term = null, onClose = null) {
  const key = scene.scene.key;
  scene.scene.pause(key);
  scene.scene.launch("Glossary", {
    term,
    overlay: true,
    onClose: () => {
      scene.scene.resume(key);
      onClose?.();
    },
  });
  scene.scene.bringToTop("Glossary");
}
