// Shared display constants for the Moon game (OUTPOST: Dark Side).
// The older Mars page keeps its own values in config.js.

export const WIDTH = 640;
export const HEIGHT = 360;
export const GROUND_Y = 300;

export const FONT = '"Jersey 15", monospace'; // headings and buttons: pixel style
export const FONT_BODY = '"Nunito", sans-serif'; // small text: smooth and easy to read
/** Text at this size or larger is a heading or button and keeps the pixel font. */
const HEADING_SIZE = 24;
/** Nunito looks larger than the pixel font at the same size, so it is scaled down a little. */
const BODY_SCALE = 0.8;

/**
 * Size rules for a 7–12 audience on desktop and phones (pixel fonts render small).
 * On a phone in landscape the canvas is shown at about 1.1×, so 16 canvas px
 * is about 18 css px and a 40 px button is about 44 css px.
 */
export const UI = {
  small: 18, // the smallest text anywhere
  body: 18,
  big: 24,
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
  muted: "#d0d8e6",
  accent: "#ffd166",
  good: "#5ce7a0",
  danger: "#ff5d5d",
};

/**
 * Text is drawn at a higher resolution than the 640×360 canvas, so the pixel font
 * stays sharp when the game is scaled up to fill the screen (no blur, no
 * fuzzy edges). Plain text only: no shadow, stroke or outline anywhere.
 */
const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
export const TEXT_RESOLUTION = Math.min(4, Math.max(2, Math.ceil(DPR * 2)));

/** Text style helper. `size` is the real font size in canvas pixels. */
export function textStyle(size = UI.body, color = TEXT.white, extra = {}) {
  const { sentence, ...rest } = extra;
  const heading = size >= HEADING_SIZE && !sentence;
  return { fontFamily: heading ? FONT : FONT_BODY, fontStyle: heading ? "normal" : "600", fontSize: `${heading ? size : Math.round(size * BODY_SCALE * 10) / 10}px`, color, resolution: TEXT_RESOLUTION, ...rest };
}
