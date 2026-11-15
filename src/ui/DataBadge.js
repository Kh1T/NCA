import { TEXT } from "../constants.js";
import { measure, openLink } from "./kit.js";

/**
 * A small label that says where a fact or event comes from.
 * Green with a tick = real NASA data. Gray = simplified for the game.
 * If the source has a link, clicking the badge opens it.
 *
 * @param {import('./kit.js').Layer} layer
 * @param {number} x  left edge
 * @param {number} y  top edge
 * @param {{label: string, real?: boolean, url?: string, link?: string}} source
 * @param {{maxWidth?: number}} [o]
 * @returns {{width: number, height: number}}
 */
export function dataBadge(layer, x, y, source, o = {}) {
  const real = Boolean(source.real);
  const prefix = real ? "REAL DATA: " : "";
  const maxWidth = o.maxWidth ?? 440;
  const size = measure(layer.scene, prefix + source.label, maxWidth - 26);
  const width = Math.min(maxWidth, size.width + 26);
  const height = size.height + 8;
  const box = layer.rect(x, y, width, height, real ? 0x12301f : 0x1b2029, 1);
  box.setStrokeStyle(1, real ? 0x5ce7a0 : 0x4c5566);
  const mark = layer.gfx();
  if (real) {
    // A tick, so "real" is not shown by colour alone.
    mark.fillStyle(0x5ce7a0, 1);
    mark.fillRect(x + 5, y + 8, 2, 2);
    mark.fillRect(x + 7, y + 10, 2, 2);
    mark.fillRect(x + 9, y + 8, 2, 2);
    mark.fillRect(x + 11, y + 6, 2, 2);
    mark.fillRect(x + 13, y + 4, 2, 2);
  } else {
    // A wavy "about" sign for simplified values.
    mark.fillStyle(0x8d98ab, 1);
    mark.fillRect(x + 5, y + 8, 3, 2);
    mark.fillRect(x + 8, y + 6, 3, 2);
    mark.fillRect(x + 11, y + 8, 3, 2);
  }
  layer.text(x + 20, y + 5, prefix + source.label, { wrap: maxWidth - 26, color: real ? TEXT.good : TEXT.muted });
  const url = source.url ?? source.link;
  if (url) {
    box.setInteractive({ useHandCursor: true });
    box.on("pointerdown", () => openLink(url));
  }
  return { width, height };
}
