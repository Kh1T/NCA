// Pixel icons drawn with shapes. Every resource has its own shape AND colour,
// so the HUD still reads for colour-blind players. Icons live on a 12x12 grid.

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

/** The icon that stands for each blueprint or kit. */
export const ITEM_ICON = {
  solar: "power", water: "water", oxygen: "oxygen", air: "air", greenhouse: "food", shield: "shield",
  rover: "rover", antenna: "dish", battery: "battery", spares: "wrench", foodpack: "crate",
};

/** Draw icon `id` in a 12x12 box whose top-left corner is x, y. */
export function drawIcon(g, id, x, y, scale = 1) {
  const s = scale;
  const px = (dx, dy, w, h) => g.fillRect(x + dx * s, y + dy * s, w * s, h * s);
  const color = (c) => g.fillStyle(c, 1);
  color(ICON_COLOR[id] ?? 0xffffff);
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
      color(0xffb347); px(4, 4, 4, 4); px(5, 0, 2, 3); px(5, 9, 2, 3); px(0, 5, 3, 2); px(9, 5, 3, 2); px(1, 1, 2, 2); px(9, 1, 2, 2); px(1, 9, 2, 2); px(9, 9, 2, 2);
      break;
    case "moon":
      color(0xcfd6e4); px(4, 0, 5, 2); px(2, 2, 4, 2); px(1, 4, 3, 4); px(2, 8, 4, 2); px(4, 10, 5, 2);
      break;
    case "rock": // falling space rock
      color(0xb9834f); px(7, 0, 4, 3); px(8, 3, 3, 2); color(0xffd166); px(4, 4, 3, 2); px(2, 6, 2, 2); px(0, 8, 2, 2);
      break;
    case "leak":
      color(0x9be7e0); px(0, 5, 4, 2); px(5, 2, 2, 2); px(5, 8, 2, 2); px(8, 0, 2, 2); px(8, 5, 4, 2); px(8, 10, 2, 2);
      break;
    case "dust":
      color(0xb9bcc2); px(1, 1, 2, 2); px(6, 0, 2, 2); px(10, 2, 2, 2); px(3, 5, 2, 2); px(8, 6, 2, 2); px(0, 9, 2, 2); px(5, 10, 2, 2); px(10, 10, 2, 2);
      break;
    case "thermo":
      color(0xdfe7f2); px(5, 0, 2, 8); color(0xff5d5d); px(4, 8, 4, 4); px(5, 4, 2, 4);
      break;
    case "cold": // snowflake
      color(0xbfe8ff); px(5, 0, 2, 12); px(0, 5, 12, 2); px(2, 2, 2, 2); px(8, 2, 2, 2); px(2, 8, 2, 2); px(8, 8, 2, 2);
      break;
    case "leaf":
      color(0x7ddc6a); px(6, 0, 4, 2); px(4, 2, 7, 2); px(3, 4, 8, 2); px(3, 6, 6, 2); px(2, 8, 4, 2); px(1, 10, 2, 2);
      break;
    case "dish":
      color(0xdfe7f2); px(1, 0, 2, 6); px(3, 6, 4, 2); px(7, 4, 2, 2); px(5, 8, 2, 4); px(2, 11, 8, 1); color(0xffd166); px(8, 1, 2, 2);
      break;
    case "calendar":
      color(0xdfe7f2); px(0, 2, 12, 10); color(0xff5d5d); px(0, 2, 12, 3); color(0x6b7384); px(3, 0, 2, 3); px(7, 0, 2, 3);
      color(0x1b2029); px(2, 7, 2, 2); px(5, 7, 2, 2); px(8, 7, 2, 2);
      break;
    case "build": // hammer
      color(0xb9bcc2); px(1, 0, 8, 3); px(0, 1, 2, 2); color(0xb9834f); px(5, 3, 2, 9);
      break;
    case "clock":
      color(0xdfe7f2); px(3, 0, 6, 2); px(1, 2, 2, 2); px(9, 2, 2, 2); px(0, 4, 2, 4); px(10, 4, 2, 4); px(1, 8, 2, 2); px(9, 8, 2, 2); px(3, 10, 6, 2);
      color(0xffd166); px(5, 3, 2, 4); px(6, 5, 3, 2);
      break;
    case "rover":
      color(0xdfe7f2); px(1, 4, 10, 4); px(3, 2, 5, 2); color(0x5ce7dc); px(4, 2, 2, 2); color(0x6b7384); px(9, 0, 1, 4);
      color(0x3a3d44); px(0, 8, 4, 4); px(8, 8, 4, 4); color(0x8a8d94); px(1, 9, 2, 2); px(9, 9, 2, 2);
      break;
    case "camera":
      color(0xdfe7f2); px(0, 3, 12, 8); px(3, 1, 4, 2); color(0x1b2029); px(4, 5, 4, 4); color(0x5ce7dc); px(5, 6, 2, 2); color(0xff5d5d); px(9, 4, 2, 1);
      break;
    case "star":
      color(0xffd166); px(5, 0, 2, 3); px(0, 4, 12, 2); px(2, 6, 8, 2); px(3, 8, 6, 1); px(2, 9, 3, 3); px(7, 9, 3, 3); px(4, 3, 4, 1);
      break;
    case "lock":
      color(0x8d98ab); px(3, 0, 6, 2); px(2, 2, 2, 4); px(8, 2, 2, 4); color(0xffd166); px(1, 5, 10, 7); color(0x1b2029); px(5, 7, 2, 3);
      break;
    case "check":
      color(0x5ce7a0); px(0, 6, 2, 2); px(2, 8, 2, 2); px(4, 10, 2, 2); px(6, 8, 2, 2); px(8, 6, 2, 2); px(10, 4, 2, 2); px(11, 2, 1, 2);
      break;
    case "cross":
      color(0xff5d5d); px(0, 0, 3, 3); px(9, 0, 3, 3); px(3, 3, 2, 2); px(7, 3, 2, 2); px(5, 5, 2, 2); px(3, 7, 2, 2); px(7, 7, 2, 2); px(0, 9, 3, 3); px(9, 9, 3, 3);
      break;
    case "wrench":
      color(0xb9bcc2); px(1, 0, 2, 4); px(5, 0, 2, 4); px(1, 3, 6, 3); px(3, 6, 2, 6);
      break;
    case "broken": // a cracked panel
      color(0xff5d5d); px(5, 0, 2, 3); px(3, 3, 3, 2); px(6, 5, 3, 2); px(4, 7, 3, 2); px(5, 9, 2, 3);
      break;
    case "battery":
      color(0xdfe7f2); px(0, 3, 10, 7); px(10, 5, 2, 3); color(0x5ce7a0); px(1, 4, 3, 5); px(4, 4, 3, 5);
      break;
    case "crate":
      color(0xb9834f); px(0, 2, 12, 10); color(0x7a5530); px(0, 6, 12, 1); px(5, 2, 2, 10); color(0x7ddc6a); px(2, 0, 3, 2);
      break;
    case "crew": // a helmet
      color(0xdfe7f2); px(2, 0, 8, 2); px(1, 2, 10, 7); px(2, 9, 8, 3); color(0x163540); px(3, 3, 6, 4); color(0x5ce7dc); px(4, 4, 2, 1);
      break;
    case "ship":
      color(0xdfe7f2); px(4, 0, 4, 2); px(3, 2, 6, 7); color(0xf1845e); px(3, 3, 6, 1); color(0x6b7384); px(1, 8, 2, 4); px(9, 8, 2, 4); color(0xffb347); px(5, 9, 2, 3);
      break;
    case "info":
      color(0x6cc5ff); px(5, 1, 2, 2); px(5, 4, 2, 7); px(4, 4, 1, 1); px(4, 10, 4, 1);
      break;
    case "book":
      // An open book: two white pages with lines, a blue cover and spine.
      color(0x4c8dff); px(0, 10, 12, 2); px(5, 1, 2, 10);
      color(0xdfe7f2); px(0, 2, 5, 8); px(7, 2, 5, 8);
      color(0x6b7384); px(1, 4, 3, 1); px(1, 6, 3, 1); px(8, 4, 3, 1); px(8, 6, 3, 1); px(1, 8, 2, 1); px(8, 8, 2, 1);
      break;
    case "sound":
      color(0xdfe7f2); px(0, 4, 3, 4); px(3, 2, 2, 8); px(5, 0, 2, 12); color(0x5ce7a0); px(8, 3, 1, 6); px(10, 1, 1, 10);
      break;
    case "mute":
      color(0xdfe7f2); px(0, 4, 3, 4); px(3, 2, 2, 8); px(5, 0, 2, 12); color(0xff5d5d); px(8, 3, 1, 1); px(9, 4, 1, 1); px(10, 5, 1, 1); px(11, 6, 1, 1); px(11, 3, 1, 1); px(10, 4, 1, 1); px(8, 6, 1, 1);
      break;
    case "music":
      color(0xc59bff); px(3, 0, 9, 2); px(3, 2, 2, 7); px(10, 2, 2, 6); px(0, 8, 5, 4); px(7, 7, 5, 4);
      break;
    case "medal":
      color(0xff5d5d); px(2, 0, 3, 4); px(7, 0, 3, 4); color(0xffd166); px(3, 4, 6, 2); px(2, 6, 8, 4); px(3, 10, 6, 2); color(0xfff3a0); px(5, 7, 2, 2);
      break;
    case "warn": // a triangle with "!"
      color(0xffb347); px(5, 0, 2, 2); px(4, 2, 4, 2); px(3, 4, 6, 2); px(2, 6, 8, 2); px(1, 8, 10, 2); px(0, 10, 12, 2);
      color(0x1b2029); px(5, 3, 2, 4); px(5, 8, 2, 2);
      break;
    case "question":
      color(0xffd166); px(3, 0, 6, 2); px(1, 2, 2, 2); px(9, 2, 2, 3); px(6, 5, 3, 2); px(5, 7, 2, 2); px(5, 10, 2, 2);
      break;
    case "home":
      color(0x5ce7a0); px(5, 0, 2, 1); px(4, 1, 4, 1); px(3, 2, 6, 1); px(2, 3, 8, 1); px(1, 4, 10, 1); px(0, 5, 12, 1); px(2, 6, 8, 6); color(0x1b2029); px(5, 8, 2, 4);
      break;
    case "play":
      color(0x5ce7a0); px(2, 0, 2, 12); px(4, 1, 2, 10); px(6, 3, 2, 6); px(8, 4, 2, 4); px(10, 5, 1, 2);
      break;
    case "back": // a left-pointing arrow
      color(0x5ce7a0); px(8, 0, 2, 12); px(6, 1, 2, 10); px(4, 3, 2, 6); px(2, 4, 2, 4); px(1, 5, 1, 2);
      break;
    case "earth":
      color(0x4ca7d8); px(3, 0, 6, 2); px(1, 2, 10, 8); px(3, 10, 6, 2); color(0x7ddc6a); px(3, 3, 3, 3); px(7, 6, 3, 2); px(4, 8, 2, 1);
      break;
    case "planet":
      color(0xffb347); px(3, 2, 6, 8); px(2, 3, 8, 6); color(0xdfe7f2); px(0, 6, 12, 1); px(0, 5, 2, 1); px(10, 7, 2, 1);
      break;
    case "galaxy":
      color(0xc59bff); px(5, 5, 2, 2); px(2, 2, 3, 2); px(7, 8, 3, 2); px(7, 1, 3, 2); px(2, 9, 3, 2); px(0, 5, 2, 2); px(10, 5, 2, 2);
      break;
    case "wave":
      color(0x6cc5ff); px(0, 6, 2, 2); px(2, 4, 2, 2); px(4, 6, 2, 2); px(6, 8, 2, 2); px(8, 6, 2, 2); px(10, 4, 2, 2);
      break;
    case "atom":
      color(0xff8c42); px(5, 5, 2, 2); color(0x6cc5ff); px(1, 2, 10, 1); px(1, 9, 10, 1); px(1, 2, 1, 8); px(10, 2, 1, 8); px(3, 0, 1, 12); px(8, 0, 1, 12);
      break;
    case "magnet":
      color(0xff5d5d); px(0, 0, 3, 8); px(9, 0, 3, 8); px(0, 8, 12, 4); color(0xdfe7f2); px(0, 0, 3, 2); px(9, 0, 3, 2);
      break;
    case "volcano":
      color(0x8a6a4a); px(4, 4, 4, 2); px(3, 6, 6, 2); px(2, 8, 8, 2); px(0, 10, 12, 2); color(0xff5d5d); px(5, 0, 2, 4); px(3, 1, 1, 1); px(8, 1, 1, 1);
      break;
    case "cloud":
      color(0xdfe7f2); px(3, 3, 5, 2); px(1, 5, 10, 4); px(0, 7, 12, 2);
      break;
    case "orbit":
      color(0x4ca7d8); px(4, 4, 4, 4); color(0x8d98ab); px(0, 5, 1, 2); px(11, 5, 1, 2); px(2, 1, 8, 1); px(2, 10, 8, 1); color(0xffd166); px(9, 0, 2, 2);
      break;
    default:
      px(2, 2, 8, 8);
  }
}
