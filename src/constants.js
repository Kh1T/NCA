// Shared display constants for the Moon game (OUTPOST: Dark Side).
// The older Mars page keeps its own values in config.js.

export const WIDTH = 640;
export const HEIGHT = 360;
export const GROUND_Y = 300;

export const FONT = '"VT323", monospace';

/**
 * Size rules for a 7–12 audience on desktop and phones (VT323 renders small).
 * On a phone in landscape the canvas is shown at about 1.1×, so 16 canvas px
 * is about 18 css px and a 40 px button is about 44 css px.
 */
export const UI = {
  small: 16, // the smallest text anywhere
  body: 16,
  big: 22,
  title: 32,
  huge: 48,
  button: 32, // default button height
  tap: 40, // touch targets: buttons the player taps during play
};

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

/** Text style helper. `size` is the real font size in canvas pixels. */
export function textStyle(size = UI.body, color = TEXT.white, extra = {}) {
  return { fontFamily: FONT, fontSize: `${size}px`, color, ...extra };
}
