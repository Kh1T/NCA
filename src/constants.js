// Shared display constants for the Moon game (OUTPOST: Dark Side).
// The older Mars page keeps its own values in config.js.

export const WIDTH = 640;
export const HEIGHT = 360;
export const GROUND_Y = 300;

export const FONT = '"Press Start 2P", monospace';

export const PALETTE = {
  sky: 0x05060a,
  star: 0xdfe7f2,
  regolith: 0x8a8d94,
  regolithDark: 0x55585f,
  regolithLight: 0xb9bcc2,
  crater: 0x3c3e44,
  panel: 0x10141c,
  panelEdge: 0x3a4658,
  accent: 0xffd166,
  good: 0x5ce7a0,
  warn: 0xffb347,
  danger: 0xff5d5d,
  earth: 0x4ca7d8,
};

export const TEXT = {
  white: "#f2f5fa",
  muted: "#8d98ab",
  accent: "#ffd166",
  good: "#5ce7a0",
  danger: "#ff5d5d",
};

/** Text style helper. Sizes are multiples of 8 so the pixel font stays crisp. */
export function textStyle(size = 8, color = TEXT.white, extra = {}) {
  return { fontFamily: FONT, fontSize: `${size}px`, color, ...extra };
}
