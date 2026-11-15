import { HEIGHT, PALETTE, TEXT, UI, WIDTH } from "../constants.js";
import { drawIcon } from "./icons.js";
import { Layer } from "./kit.js";
import { getVolumes, isMuted, setVolume, sfx, toggleMute } from "./sfx.js";
import { Slider } from "./Slider.js";
import { Toggle } from "./Toggle.js";

const STEPS = 5;

/** Sound settings: on/off, effects volume and music volume. Saved on this device. */
export function openSound(scene, { onClose, depth = 700 } = {}) {
  const L = new Layer(scene, { depth, fixed: true, keys: true });
  L.dim(0.7);
  const w = 360;
  const h = 210;
  const x = (WIDTH - w) / 2;
  const y = (HEIGHT - h) / 2;
  L.panel(x, y, w, h, { edge: PALETTE.accent, alpha: 1 });
  L.text(x + 16, y + 8, "SOUND", { size: UI.title, color: TEXT.accent });
  const g = L.gfx();
  drawIcon(g, "sound", x + 16, y + 62, 1.6);
  drawIcon(g, "power", x + 16, y + 106, 1.6);
  drawIcon(g, "music", x + 16, y + 150, 1.6);
  L.text(x + 46, y + 58, "SOUND", { size: UI.big });
  L.text(x + 46, y + 102, "EFFECTS", { size: UI.big });
  L.text(x + 46, y + 146, "MUSIC", { size: UI.big });
  const first = new Toggle(L, { x: x + 170, y: y + 56, value: !isMuted(), onChange: () => toggleMute() });
  const volumes = getVolumes();
  new Slider(L, {
    x: x + 170, y: y + 102, max: STEPS, value: Math.round(volumes.sfx * STEPS), pip: 18, color: PALETTE.accent,
    onChange: (v) => { setVolume("sfx", v / STEPS); sfx("click"); },
  });
  new Slider(L, {
    x: x + 170, y: y + 146, max: STEPS, value: Math.round(volumes.music * STEPS), pip: 18, color: 0xc59bff,
    onChange: (v) => setVolume("music", v / STEPS),
  });
  const close = () => {
    L.destroy();
    onClose?.();
  };
  L.button(x + w - 64, y + 26, "OK", close, { w: 90, h: 32, key: "ESCAPE" });
  L.focus.hotkey("ENTER", close);
  L.focusFirst(first);
  return L;
}
