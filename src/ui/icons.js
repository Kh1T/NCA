// Pixel icons drawn with shapes. Every resource has its own shape AND colour,
// so the HUD still reads for colour-blind players.

export const ICON_COLOR = {
  power: 0xffd166,
  oxygen: 0x6cc5ff,
  air: 0x9be7e0,
  food: 0x7ddc6a,
  water: 0x4c8dff,
  shield: 0xc59bff,
  dose: 0xff8c42,
  science: 0xfff3a0,
};

/** Draw icon `id` in a 12x12 box whose top-left corner is x, y. */
export function drawIcon(g, id, x, y, scale = 1) {
  const s = scale;
  const px = (dx, dy, w, h) => g.fillRect(x + dx * s, y + dy * s, w * s, h * s);
  const color = ICON_COLOR[id] ?? 0xffffff;
  g.fillStyle(color, 1);
  switch (id) {
    case "power": // lightning bolt
      px(6, 0, 4, 2); px(5, 2, 3, 2); px(3, 4, 6, 2); px(5, 6, 3, 2); px(4, 8, 2, 2); px(3, 10, 2, 2);
      break;
    case "oxygen": // ring (a bubble)
      px(3, 0, 6, 2); px(1, 2, 2, 2); px(9, 2, 2, 2); px(0, 4, 2, 4); px(10, 4, 2, 4); px(1, 8, 2, 2); px(9, 8, 2, 2); px(3, 10, 6, 2);
      break;
    case "air": // three wavy lines
      px(0, 1, 5, 2); px(5, 2, 4, 2); px(9, 1, 3, 2); px(0, 5, 3, 2); px(3, 6, 5, 2); px(8, 5, 4, 2); px(0, 9, 5, 2); px(5, 10, 4, 2); px(9, 9, 3, 2);
      break;
    case "food": // leaf
      px(6, 0, 4, 2); px(4, 2, 7, 2); px(3, 4, 8, 2); px(3, 6, 6, 2); px(2, 8, 4, 2); px(1, 10, 2, 2);
      break;
    case "water": // drop
      px(5, 0, 2, 2); px(4, 2, 4, 2); px(3, 4, 6, 2); px(2, 6, 8, 3); px(3, 9, 6, 2); px(4, 11, 4, 1);
      break;
    case "shield": // shield
      px(1, 0, 10, 6); px(2, 6, 8, 2); px(3, 8, 6, 2); px(5, 10, 2, 2);
      break;
    case "dose": // three blades around a dot
      px(5, 5, 2, 2); px(4, 0, 4, 3); px(0, 7, 4, 4); px(8, 7, 4, 4);
      break;
    case "science": // plus-shaped spark
      px(5, 0, 2, 12); px(0, 5, 12, 2); px(3, 3, 6, 6);
      break;
    case "sun":
      g.fillStyle(0xffb347, 1); px(4, 4, 4, 4); px(5, 0, 2, 3); px(5, 9, 2, 3); px(0, 5, 3, 2); px(9, 5, 3, 2); px(1, 1, 2, 2); px(9, 1, 2, 2); px(1, 9, 2, 2); px(9, 9, 2, 2);
      break;
    case "moon":
      g.fillStyle(0xcfd6e4, 1); px(4, 0, 5, 2); px(2, 2, 4, 2); px(1, 4, 3, 4); px(2, 8, 4, 2); px(4, 10, 5, 2);
      break;
    case "rock":
      g.fillStyle(0xb9834f, 1); px(7, 0, 4, 3); px(8, 3, 3, 2); g.fillStyle(0xffd166, 1); px(4, 4, 3, 2); px(2, 6, 2, 2); px(0, 8, 2, 2);
      break;
    case "leak":
      g.fillStyle(0x9be7e0, 1); px(0, 5, 4, 2); px(5, 2, 2, 2); px(5, 8, 2, 2); px(8, 0, 2, 2); px(8, 5, 4, 2); px(8, 10, 2, 2);
      break;
    case "dust":
      g.fillStyle(0xb9bcc2, 1); px(1, 1, 2, 2); px(6, 0, 2, 2); px(10, 2, 2, 2); px(3, 5, 2, 2); px(8, 6, 2, 2); px(0, 9, 2, 2); px(5, 10, 2, 2); px(10, 10, 2, 2);
      break;
    case "thermo":
      g.fillStyle(0xdfe7f2, 1); px(5, 0, 2, 8); g.fillStyle(0xff5d5d, 1); px(4, 8, 4, 4); px(5, 4, 2, 4);
      break;
    case "leaf":
      g.fillStyle(0x7ddc6a, 1); px(6, 0, 4, 2); px(4, 2, 7, 2); px(3, 4, 8, 2); px(3, 6, 6, 2); px(2, 8, 4, 2); px(1, 10, 2, 2);
      break;
    case "dish":
      g.fillStyle(0xdfe7f2, 1); px(1, 0, 2, 6); px(3, 6, 4, 2); px(7, 4, 2, 2); px(5, 8, 2, 4); px(2, 11, 8, 1); g.fillStyle(0xffd166, 1); px(8, 1, 2, 2);
      break;
    default:
      px(2, 2, 8, 8);
  }
}
