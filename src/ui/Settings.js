import { HEIGHT, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { drawIcon } from "./icons.js";
import { Layer, dialog } from "./kit.js";
import { openSound } from "./SoundPanel.js";

/**
 * The in-game settings: SOUND, PAUSE, RESTART and LEAVE. Restart and Leave
 * ask "Are you sure?" first. Big buttons with a picture each.
 *
 * o.onClose()   the panel closed and play goes on
 * o.onRestart() start this mission again
 * o.onLeave()   back to the title screen
 * o.leaveLabel  the word on the leave button (a photo trip says "END TRIP")
 */
export function openSettings(scene, o = {}) {
  const L = new Layer(scene, { depth: 650, fixed: true, keys: true });
  L.dim(0.7);
  const w = 360;
  const h = 268;
  const x = (WIDTH - w) / 2;
  const y = (HEIGHT - h) / 2;
  L.panel(x, y, w, h, { edge: PALETTE.accent, alpha: 1 });
  drawIcon(L.gfx(), "gear", x + 16, y + 12, 2);
  L.text(x + 50, y + 8, "SETTINGS", { size: UI.title, color: TEXT.accent });

  const close = () => {
    L.destroy();
    o.onClose?.();
  };
  const sure = (title, icon, yes) => {
    L.destroy();
    dialog(scene, {
      title,
      icon,
      body: "Your progress in this mission will be lost.",
      depth: 660,
      buttons: [
        { label: "NO", onClick: () => openSettings(scene, o) },
        { label: "YES", icon, onClick: yes },
      ],
    });
  };
  const rows = [
    ["sound", "SOUND", () => { L.destroy(); openSound(scene, { depth: 660, onClose: () => openSettings(scene, o) }); }],
    ["pause", "PAUSE", () => { L.destroy(); openPause(scene, () => openSettings(scene, o)); }],
    ...(o.onRestart ? [["restart", "RESTART", () => sure("RESTART?", "restart", o.onRestart)]] : []),
    ["door", o.leaveLabel ?? "LEAVE", () => (o.leaveAsk === false ? (L.destroy(), o.onLeave?.()) : sure(`${o.leaveLabel ?? "LEAVE"}?`, "door", o.onLeave))],
  ];
  let first = null;
  rows.forEach(([icon, label, fn], i) => {
    const b = L.button(x + w / 2, y + 66 + i * 44, label, fn, { w: w - 48, h: 38, icon });
    first ??= b;
  });
  const resume = L.button(x + w / 2, y + h - 26, "BACK TO GAME", close, { w: w - 48, h: 38, key: "ESCAPE", icon: "play" });
  L.focusFirst(resume);
  void first;
  return L;
}

/** A pause screen: everything waits until PLAY is pressed. */
export function openPause(scene, onResume) {
  const L = new Layer(scene, { depth: 660, fixed: true, keys: true });
  L.dim(0.85);
  const g = L.gfx();
  drawIcon(g, "pause", WIDTH / 2 - 30, 90, 5);
  L.text(WIDTH / 2, 170, "PAUSED", { size: UI.huge, origin: 0.5, color: TEXT.accent });
  const play = L.button(WIDTH / 2, 260, "PLAY", () => { L.destroy(); onResume?.(); }, { w: 200, h: 44, icon: "play", key: "ESCAPE" });
  L.focus.hotkey("ENTER", () => play.activate());
  L.focusFirst(play);
  return L;
}
