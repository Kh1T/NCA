import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "sprites");
const SIZE = 48;
const SCALE = 4;
const FRAME_MS = 125;

const OUTLINE = "#111a21";
const FACE_DARK = "#1d252a";

const CONDITIONS = [
  {
    id: "normal",
    label: "Normal",
    effect: "Healthy crew member on a standard sol.",
    suit: "#e4edf2",
    suitShade: "#b8c5ce",
    suitDark: "#82919c",
    accent: "#f1845e",
    visor: "#163540",
    visorShine: "#5ce7dc",
    skin: "#f0c39d",
    skinShade: "#c98f6b",
    face: "steady",
    shoulder: "#4ca7d8",
    screen: "#61e5d9",
  },
  {
    id: "radiation",
    label: "Radiation poisoned",
    effect: "Green suit contamination, glowing particles, and a sick expression.",
    suit: "#d9e7d2",
    suitShade: "#a8bfa3",
    suitDark: "#76917c",
    accent: "#a9e76f",
    visor: "#1b3829",
    visorShine: "#7cff95",
    skin: "#cfdaa4",
    skinShade: "#93a36a",
    face: "sick",
    shoulder: "#61d47a",
    screen: "#8dff9f",
  },
  {
    id: "low-oxygen",
    label: "Low oxygen",
    effect: "Blue skin, visor fog, oxygen bubbles, and a gasping expression.",
    suit: "#d8e6ee",
    suitShade: "#a9bdcb",
    suitDark: "#7b91a1",
    accent: "#72bce8",
    visor: "#123548",
    visorShine: "#6cdeff",
    skin: "#a9c9de",
    skinShade: "#6e93ae",
    face: "gasping",
    shoulder: "#5ec7ef",
    screen: "#7fe9ff",
  },
  {
    id: "dehydrated",
    label: "Dehydrated",
    effect: "Pale tan suit, cracked lips, dry skin, and heat shimmer lines.",
    suit: "#e9e1cf",
    suitShade: "#c6b99f",
    suitDark: "#978a71",
    accent: "#dfa260",
    visor: "#27403f",
    visorShine: "#ffd089",
    skin: "#d2a575",
    skinShade: "#a0764c",
    face: "parched",
    shoulder: "#e1a35d",
    screen: "#ffe0a1",
  },
  {
    id: "hungry",
    label: "Hungry",
    effect: "Thinner suit, sunken cheeks, an unhappy face, and a growling stomach.",
    suit: "#e3e8e1",
    suitShade: "#b4bfb4",
    suitDark: "#859388",
    accent: "#d8b25d",
    visor: "#213a36",
    visorShine: "#d2ec9f",
    skin: "#d8bb8c",
    skinShade: "#a8865b",
    face: "hungry",
    shoulder: "#e0c158",
    screen: "#f4e08a",
  },
];

const WALK = [
  { bob: 0, near: 5, far: -5, nearLift: 0, farLift: 0, swing: -2 },
  { bob: 1, near: 3, far: -3, nearLift: 0, farLift: 1, swing: -1 },
  { bob: 0, near: 1, far: -2, nearLift: 0, farLift: 3, swing: 0 },
  { bob: 0, near: -5, far: 5, nearLift: 0, farLift: 0, swing: 2 },
  { bob: 1, near: -3, far: 3, nearLift: 1, farLift: 0, swing: 1 },
  { bob: 0, near: -2, far: 1, nearLift: 3, farLift: 0, swing: 0 },
];

function hex(value) {
  const clean = value.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16), 255];
}

class Sprite {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  px(x, y, color) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const i = (iy * this.width + ix) * 4;
    this.data[i] = color[0];
    this.data[i + 1] = color[1];
    this.data[i + 2] = color[2];
    this.data[i + 3] = color[3] ?? 255;
  }

  blend(x, y, color) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const i = (iy * this.width + ix) * 4;
    const alpha = (color[3] ?? 255) / 255;
    this.data[i] = Math.round(this.data[i] * (1 - alpha) + color[0] * alpha);
    this.data[i + 1] = Math.round(this.data[i + 1] * (1 - alpha) + color[1] * alpha);
    this.data[i + 2] = Math.round(this.data[i + 2] * (1 - alpha) + color[2] * alpha);
    this.data[i + 3] = Math.round(this.data[i + 3] * (1 - alpha) + 255 * alpha);
  }

  rect(x, y, width, height, color) {
    for (let yy = 0; yy < height; yy += 1) {
      for (let xx = 0; xx < width; xx += 1) this.px(x + xx, y + yy, color);
    }
  }

  roundRect(x, y, width, height, radius, color) {
    for (let yy = 0; yy < height; yy += 1) {
      for (let xx = 0; xx < width; xx += 1) {
        const dx = Math.min(xx, width - 1 - xx);
        const dy = Math.min(yy, height - 1 - yy);
        if (dx < radius && dy < radius && (radius - dx) ** 2 + (radius - dy) ** 2 > radius ** 2) continue;
        this.px(x + xx, y + yy, color);
      }
    }
  }

  circle(cx, cy, radius, color) {
    this.ellipse(cx, cy, radius, radius, color);
  }

  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, color);
      }
    }
  }

  line(x0, y0, x1, y1, color, thickness = 1) {
    let cx = Math.round(x0);
    let cy = Math.round(y0);
    const tx = Math.round(x1);
    const ty = Math.round(y1);
    const dx = Math.abs(tx - cx);
    const dy = -Math.abs(ty - cy);
    const sx = cx < tx ? 1 : -1;
    const sy = cy < ty ? 1 : -1;
    let error = dx + dy;
    const offset = Math.floor(thickness / 2);

    while (true) {
      for (let yy = 0; yy < thickness; yy += 1) {
        for (let xx = 0; xx < thickness; xx += 1) this.px(cx - offset + xx, cy - offset + yy, color);
      }
      if (cx === tx && cy === ty) break;
      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        cx += sx;
      }
      if (e2 <= dx) {
        error += dx;
        cy += sy;
      }
    }
  }
}

function drawShadow(sprite) {
  for (let y = 43; y <= 47; y += 1) {
    for (let x = 12; x <= 36; x += 1) {
      const dx = (x + 0.5 - 24) / 12;
      const dy = (y + 0.5 - 45) / 2.2;
      if (dx * dx + dy * dy <= 1) sprite.blend(x, y, [0, 0, 0, 68]);
    }
  }
}

function drawTank(sprite, x, y, width, height, cfg) {
  const outline = hex(OUTLINE);
  sprite.roundRect(x - 1, y - 1, width + 2, height + 2, 2, outline);
  sprite.roundRect(x, y, width, height, 1, hex(cfg.suitShade));
  sprite.rect(x, y + 2, width, height - 5, hex(cfg.suit));
  sprite.rect(x, y + 2, 1, height - 5, hex(cfg.suitShade));
  sprite.rect(x + 1, y + 2, 1, height - 7, hex(cfg.suit));
  sprite.rect(x - 1, y + Math.round(height * 0.45), width + 2, 2, hex(cfg.accent));
  sprite.rect(x + 1, y - 2, width - 2, 1, hex(cfg.suitDark));
}

function drawFarArm(sprite, bob, cfg) {
  const outline = hex(OUTLINE);
  const shade = hex(cfg.suitShade);
  sprite.line(21, 21 + bob, 18, 25 + bob, outline, 3);
  sprite.line(18, 25 + bob, 17, 28 + bob, outline, 3);
  sprite.line(21, 21 + bob, 18, 25 + bob, shade, 1);
  sprite.line(18, 25 + bob, 17, 28 + bob, shade, 1);
  sprite.circle(17, 28 + bob, 2, outline);
  sprite.px(17, 28 + bob, hex(cfg.suitDark));
}

function drawFarLeg(sprite, bob, offset, lift, cfg) {
  const hipX = 21;
  const hipY = 30 + bob;
  const footX = hipX + offset;
  const footY = 41 - lift;
  const kneeX = Math.round((hipX + footX) / 2 + 1);
  const kneeY = Math.round(35 + bob - lift * 0.5);
  const outline = hex(OUTLINE);
  const leg = hex(cfg.suitShade);
  sprite.line(hipX, hipY, kneeX, kneeY, outline, 4);
  sprite.line(kneeX, kneeY, footX, footY - 1, outline, 4);
  sprite.line(hipX, hipY, kneeX, kneeY, leg, 2);
  sprite.line(kneeX, kneeY, footX, footY - 1, leg, 2);
  sprite.rect(kneeX - 1, kneeY, 2, 2, hex(cfg.suitDark));

  sprite.roundRect(footX - 3, footY - 1, 8, 4, 1, outline);
  sprite.roundRect(footX - 2, footY, 6, 2, 1, hex(cfg.suitDark));
  sprite.px(footX + 3, footY + 1, hex(cfg.suitShade));
}

function drawNearLeg(sprite, bob, offset, lift, cfg) {
  const hipX = 25;
  const hipY = 30 + bob;
  const footX = hipX + offset;
  const footY = 41 - lift;
  const kneeX = Math.round((hipX + footX) / 2 + 2);
  const kneeY = Math.round(35 + bob - lift * 0.5);
  const outline = hex(OUTLINE);
  const leg = hex(cfg.suit);
  sprite.line(hipX, hipY, kneeX, kneeY, outline, 4);
  sprite.line(kneeX, kneeY, footX, footY - 1, outline, 4);
  sprite.line(hipX, hipY, kneeX, kneeY, leg, 2);
  sprite.line(kneeX, kneeY, footX, footY - 1, leg, 2);
  sprite.rect(kneeX - 1, kneeY + 1, 3, 2, hex(cfg.accent));

  sprite.roundRect(footX - 3, footY - 1, 8, 4, 1, outline);
  sprite.roundRect(footX - 2, footY, 6, 2, 1, hex(cfg.suitDark));
  sprite.px(footX + 3, footY + 1, hex(cfg.suit));
}

function drawBackpack(sprite, bob, cfg) {
  const outline = hex(OUTLINE);
  drawTank(sprite, 8, 18 + bob, 4, 13, cfg);
  drawTank(sprite, 12, 19 + bob, 4, 12, cfg);
  sprite.roundRect(15, 17 + bob, 7, 15, 2, outline);
  sprite.roundRect(16, 18 + bob, 5, 13, 1, hex(cfg.suitShade));
  sprite.rect(17, 19 + bob, 3, 11, hex(cfg.suitDark));
  sprite.rect(18, 20 + bob, 1, 8, hex(cfg.suitShade));
  sprite.rect(16, 23 + bob, 5, 1, hex(cfg.accent));
  sprite.line(16, 19 + bob, 21, 21 + bob, outline, 2);
  sprite.rect(18, 17 + bob, 2, 2, hex(cfg.screen));
  sprite.px(18, 17 + bob, hex(cfg.suitDark));
}

function torsoGeometry(cfg) {
  if (cfg.id === "hungry") return { x: 20, width: 10 };
  return { x: 19, width: 11 };
}

function drawTorso(sprite, bob, cfg) {
  const outline = hex(OUTLINE);
  const { x, width } = torsoGeometry(cfg);
  const top = 19 + bob;

  sprite.roundRect(x - 1, top - 1, width + 2, 13, 3, outline);
  sprite.roundRect(x, top, width, 11, 2, hex(cfg.suit));
  sprite.rect(x + width - 3, top + 1, 2, 9, hex(cfg.suitShade));
  sprite.rect(x, top + 7, width - 2, 1, hex(cfg.suitShade));

  sprite.line(x + 1, top + 3, x + 5, top + 8, hex(cfg.accent), 2);
  sprite.rect(x + width - 5, top + 5, 4, 3, hex(cfg.suitDark));
  sprite.rect(x + width - 4, top + 6, 1, 1, hex(cfg.screen));
  sprite.rect(x + width - 2, top + 6, 1, 1, hex(cfg.accent));

  sprite.rect(x + 1, top + 1, 2, 1, hex(cfg.shoulder));
  sprite.circle(x + 2, top + 2, 1, hex(cfg.shoulder));
}

function drawBelt(sprite, bob, cfg) {
  const { x, width } = torsoGeometry(cfg);
  const outline = hex(OUTLINE);
  sprite.rect(x - 1, 28 + bob, width + 2, 3, outline);
  sprite.rect(x, 29 + bob, width, 1, hex(cfg.suitDark));
  sprite.rect(x + Math.floor(width / 2) - 1, 29 + bob, 3, 2, hex(cfg.accent));
  sprite.px(x + Math.floor(width / 2), 29 + bob, hex(cfg.screen));
}

function drawFace(sprite, bob, cfg) {
  const cx = 30;
  const cy = 14 + bob;
  sprite.ellipse(cx + 0.5, cy, 3.5, 3.9, hex(cfg.skin));
  sprite.px(32, 15 + bob, hex(cfg.skinShade));

  if (cfg.face === "steady") {
    sprite.rect(29, 12 + bob, 2, 2, hex(FACE_DARK));
    sprite.px(29, 12 + bob, hex("#f7fbfc"));
    sprite.rect(30, 17 + bob, 2, 1, hex(FACE_DARK));
    sprite.px(32, 16 + bob, hex(cfg.skinShade));
  } else if (cfg.face === "sick") {
    sprite.rect(29, 13 + bob, 2, 1, hex(FACE_DARK));
    sprite.px(29, 14 + bob, hex(cfg.skinShade));
    sprite.px(29, 17 + bob, hex(FACE_DARK));
    sprite.px(30, 18 + bob, hex(FACE_DARK));
    sprite.px(31, 17 + bob, hex(FACE_DARK));
    sprite.px(32, 14 + bob, hex("#7de78f"));
    sprite.px(28, 16 + bob, hex(cfg.skinShade));
  } else if (cfg.face === "gasping") {
    sprite.rect(29, 12 + bob, 2, 2, hex(FACE_DARK));
    sprite.px(29, 12 + bob, hex("#d6f4ff"));
    sprite.rect(30, 16 + bob, 2, 2, hex(FACE_DARK));
    sprite.px(30, 17 + bob, hex(cfg.skinShade));
    sprite.rect(28, 10 + bob, 4, 1, hex("#c5ecff"));
    sprite.px(28, 15 + bob, hex(cfg.skinShade));
  } else if (cfg.face === "parched") {
    sprite.rect(30, 13 + bob, 1, 1, hex(FACE_DARK));
    sprite.px(32, 16 + bob, hex(cfg.skinShade));
    sprite.px(28, 16 + bob, hex(cfg.skinShade));
    sprite.rect(29, 17 + bob, 2, 1, hex(FACE_DARK));
    sprite.px(30, 18 + bob, hex(cfg.skinShade));
    sprite.px(28, 14 + bob, hex(cfg.skinShade));
  } else if (cfg.face === "hungry") {
    sprite.rect(29, 12 + bob, 2, 2, hex(FACE_DARK));
    sprite.px(29, 13 + bob, hex("#e7f0d7"));
    sprite.px(29, 11 + bob, hex(cfg.skinShade));
    sprite.px(30, 11 + bob, hex(cfg.skinShade));
    sprite.px(30, 14 + bob, hex(cfg.skinShade));
    sprite.px(29, 15 + bob, hex(cfg.skinShade));
    sprite.px(28, 16 + bob, hex(FACE_DARK));
    sprite.px(30, 17 + bob, hex(FACE_DARK));
    sprite.px(31, 17 + bob, hex(FACE_DARK));
    sprite.px(32, 16 + bob, hex(FACE_DARK));
    sprite.px(31, 15 + bob, hex(cfg.skinShade));
  }
}

function drawHelmet(sprite, bob, cfg) {
  const outline = hex(OUTLINE);
  const cx = 24;
  const cy = 12 + bob;

  sprite.line(23, 4 + bob, 23, 1 + bob, outline, 1);
  sprite.px(23, 1 + bob, hex(cfg.accent));

  sprite.circle(cx, cy, 9, outline);
  sprite.circle(cx, cy, 8, hex(cfg.suit));
  sprite.circle(cx - 1, cy - 1, 6, hex(cfg.suitShade));
  sprite.circle(cx - 2, cy - 2, 5, hex(cfg.suit));

  sprite.rect(21, 10 + bob, 2, 4, hex(cfg.suitDark));
  sprite.px(16, 12 + bob, hex(cfg.screen));
  sprite.px(16, 13 + bob, hex(cfg.accent));

  sprite.ellipse(28.5, 13.5 + bob, 6.6, 7.2, outline);
  sprite.ellipse(28.5, 13.5 + bob, 5.7, 6.3, hex(cfg.visor));
  drawFace(sprite, bob, cfg);

  sprite.line(24, 9 + bob, 25, 11 + bob, hex(cfg.visorShine), 2);
  sprite.px(26, 10 + bob, hex(cfg.visorShine));
  sprite.line(27, 10 + bob, 28, 11 + bob, hex(cfg.visorShine), 1);
  sprite.px(23, 8 + bob, hex("#ffffff"));
  sprite.px(33, 16 + bob, hex(cfg.visorShine));
  sprite.px(33, 17 + bob, hex(cfg.visorShine));

  sprite.rect(21, 20 + bob, 8, 2, outline);
  sprite.rect(22, 20 + bob, 6, 1, hex(cfg.suitDark));
}

function drawNearArm(sprite, bob, swing, cfg) {
  const outline = hex(OUTLINE);
  const shoulderX = 28;
  const shoulderY = 21 + bob;
  const elbowX = 31 + swing;
  const elbowY = 25 + bob;
  const handX = 34 + swing;
  const handY = 27 + bob;

  sprite.line(shoulderX, shoulderY, elbowX, elbowY, outline, 4);
  sprite.line(elbowX, elbowY, handX, handY, outline, 4);
  sprite.line(shoulderX, shoulderY, elbowX, elbowY, hex(cfg.suit), 2);
  sprite.line(elbowX, elbowY, handX, handY, hex(cfg.suit), 2);
  sprite.rect(elbowX - 1, elbowY - 1, 3, 2, hex(cfg.suitShade));

  sprite.circle(handX, handY, 3, outline);
  sprite.circle(handX, handY, 2, hex(cfg.accent));
  sprite.px(handX - 1, handY, hex(cfg.suit));

  const deviceX = handX - 1;
  const deviceY = handY - 5;
  sprite.roundRect(deviceX - 1, deviceY - 1, 9, 6, 1, outline);
  sprite.roundRect(deviceX, deviceY, 7, 4, 1, hex(cfg.suitDark));
  sprite.rect(deviceX + 1, deviceY + 1, 4, 2, hex(cfg.screen));
  sprite.px(deviceX + 5, deviceY + 1, hex(cfg.accent));
  sprite.line(deviceX + 1, deviceY + 4, deviceX + 6, deviceY + 4, outline, 1);
  sprite.px(deviceX + 6, deviceY - 1, hex(cfg.accent));
}

function drawStatusEffects(sprite, bob, frame, cfg) {
  const effect = hex(cfg.visorShine);

  if (cfg.id === "radiation") {
    const specks = [
      [8, 14],
      [35, 7],
      [37, 22],
      [14, 34],
      [28, 40],
      [41, 12],
      [11, 27],
      [33, 3],
    ];
    for (let i = 0; i < 5; i += 1) {
      const [x, y] = specks[(i + frame) % specks.length];
      sprite.px(x, y, effect);
      sprite.px(x + 1, y + 1, hex("#4faf63"));
    }
    sprite.rect(22, 23 + bob, 2, 2, effect);
    sprite.px(21, 22 + bob, hex("#4faf63"));
    sprite.rect(18, 27 + bob, 2, 1, effect);
    sprite.px(31, 29 + bob, effect);
  }

  if (cfg.id === "low-oxygen") {
    sprite.rect(27, 8 + bob, 5, 1, hex("#bfefff"));
    sprite.rect(24, 9 + bob, 2, 1, hex("#7fdcf5"));
    const bubbles = [
      [35, 7],
      [38, 10],
      [36, 14],
      [33, 4],
    ];
    for (let i = 0; i < 3; i += 1) {
      const [x, y] = bubbles[(i + frame) % bubbles.length];
      sprite.circle(x, y, 1, hex("#67e8ff"));
      sprite.px(x - 1, y - 1, hex("#d4f8ff"));
    }
  }

  if (cfg.id === "dehydrated") {
    const shift = frame % 3;
    sprite.line(38, 7 + shift, 40, 9 + shift, effect, 1);
    sprite.line(40, 9 + shift, 38, 11 + shift, effect, 1);
    sprite.line(39, 13 + shift, 41, 15 + shift, hex("#d99a5a"), 1);
    sprite.line(41, 15 + shift, 39, 17 + shift, hex("#d99a5a"), 1);
    sprite.px(19, 24 + bob, effect);
    sprite.px(20, 25 + bob, hex("#b48253"));
    sprite.px(28, 33 + bob, hex("#c99a60"));
  }

  if (cfg.id === "hungry") {
    const shift = frame % 2;
    sprite.line(15, 32 + bob + shift, 17, 33 + bob + shift, hex("#947034"), 1);
    sprite.line(15, 31 + bob + shift, 17, 32 + bob + shift, effect, 1);
    sprite.line(17, 32 + bob + shift, 16, 34 + bob + shift, effect, 1);
    sprite.line(18, 34 + bob + shift, 20, 35 + bob + shift, hex("#c59a40"), 1);
    sprite.line(14, 33 + bob + shift, 16, 34 + bob + shift, hex("#947034"), 1);
    sprite.px(16, 29 + bob, hex("#b58a38"));
    sprite.px(19, 31 + bob, hex("#e6c45b"));
    sprite.px(29, 20 + bob, hex("#f0d877"));
  }
}

function renderFrame(frameIndex, cfg) {
  const pose = WALK[frameIndex];
  const sprite = new Sprite(SIZE, SIZE);

  drawShadow(sprite);
  drawFarArm(sprite, pose.bob, cfg);
  drawFarLeg(sprite, pose.bob, pose.far, pose.farLift, cfg);
  drawBackpack(sprite, pose.bob, cfg);
  drawTorso(sprite, pose.bob, cfg);
  drawNearLeg(sprite, pose.bob, pose.near, pose.nearLift, cfg);
  drawBelt(sprite, pose.bob, cfg);
  drawHelmet(sprite, pose.bob, cfg);
  drawNearArm(sprite, pose.bob, pose.swing, cfg);
  drawStatusEffects(sprite, pose.bob, frameIndex, cfg);

  return sprite;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(sprite) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(sprite.width, 0);
  header.writeUInt32BE(sprite.height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const raw = Buffer.alloc((sprite.width * 4 + 1) * sprite.height);
  for (let y = 0; y < sprite.height; y += 1) {
    const rowStart = y * (sprite.width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < sprite.width * 4; x += 1) raw[rowStart + 1 + x] = sprite.data[y * sprite.width * 4 + x];
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function scaleSprite(sprite, scale) {
  const scaled = new Sprite(sprite.width * scale, sprite.height * scale);
  for (let y = 0; y < scaled.height; y += 1) {
    for (let x = 0; x < scaled.width; x += 1) {
      const sx = Math.floor(x / scale);
      const sy = Math.floor(y / scale);
      const src = (sy * sprite.width + sx) * 4;
      const dst = (y * scaled.width + x) * 4;
      scaled.data[dst] = sprite.data[src];
      scaled.data[dst + 1] = sprite.data[src + 1];
      scaled.data[dst + 2] = sprite.data[src + 2];
      scaled.data[dst + 3] = sprite.data[src + 3];
    }
  }
  return scaled;
}

function composeSheet(frames) {
  const width = SIZE * frames.length;
  const sheet = new Sprite(width, SIZE);
  frames.forEach((frame, index) => {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const src = (y * SIZE + x) * 4;
        const dst = (y * width + index * SIZE + x) * 4;
        sheet.data[dst] = frame.data[src];
        sheet.data[dst + 1] = frame.data[src + 1];
        sheet.data[dst + 2] = frame.data[src + 2];
        sheet.data[dst + 3] = frame.data[src + 3];
      }
    }
  });
  return sheet;
}

function composeStack(sheets) {
  const width = sheets[0].width;
  const height = SIZE * sheets.length;
  const stack = new Sprite(width, height);
  sheets.forEach((sheet, row) => {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const src = (y * width + x) * 4;
        const dst = ((row * SIZE + y) * width + x) * 4;
        stack.data[dst] = sheet.data[src];
        stack.data[dst + 1] = sheet.data[src + 1];
        stack.data[dst + 2] = sheet.data[src + 2];
        stack.data[dst + 3] = sheet.data[src + 3];
      }
    }
  });
  return stack;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function renderPreview(manifest) {
  const sections = manifest.conditions
    .map(
      (condition) => `<section class="condition">
        <div class="condition-copy">
          <p class="eyebrow">${condition.id.toUpperCase()}</p>
          <h2>${condition.label}</h2>
          <p>${condition.effect}</p>
          <a href="${condition.id}/sheet.png" download>Download sheet</a>
        </div>
        <div class="condition-visual">
          <div class="sprite-stage"><div class="sprite-anim" style="background-image:url('${condition.id}/sheet.png')"></div></div>
          <div class="frames">${condition.frames
            .map(
              (frame, index) =>
                `<figure><img src="${condition.id}/${frame}" width="96" height="96" alt="${condition.label} walk frame ${index + 1}"><figcaption>${String(index + 1).padStart(2, "0")}</figcaption></figure>`,
            )
            .join("")}</div>
        </div>
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#091118" />
    <title>Astropeer crew sprites</title>
    <style>
      :root { color-scheme: dark; font-family: "Aptos", "Segoe UI", sans-serif; --bg:#091118; --panel:#111c24; --line:rgba(185,208,218,.14); --text:#edf3f5; --muted:#95a7b1; --teal:#68d8ce; --orange:#ff896e; }
      * { box-sizing: border-box; }
      body { margin:0; min-width:320px; color:var(--text); background:radial-gradient(ellipse at 78% 0%,rgba(67,110,125,.16),transparent 40%),var(--bg); }
      main { width:min(1180px,100%); margin:0 auto; padding:36px 24px 60px; }
      h1 { margin:8px 0 10px; font-size:clamp(30px,4vw,46px); letter-spacing:-.045em; font-weight:650; }
      h1 em { color:var(--orange); font-style:normal; }
      .intro { max-width:720px; margin:0 0 28px; color:var(--muted); line-height:1.6; font-size:14px; }
      .preview-actions { display:flex; align-items:center; flex-wrap:wrap; gap:14px; margin:-12px 0 26px; }
      .play-link { display:inline-flex; align-items:center; gap:14px; padding:11px 14px; border:1px solid #ffa58d; border-radius:7px; color:#241310; background:linear-gradient(135deg,#ffad8c,#f58169); font-size:9px; font-weight:900; letter-spacing:.09em; text-decoration:none; }
      .play-link:hover { filter:brightness(1.08); }
      .play-link span { font-size:13px; }
      .preview-note { color:var(--quiet); font-size:9px; }
      .eyebrow { margin:0; color:var(--teal); font-size:9px; font-weight:800; letter-spacing:.16em; }
      .all-sheet { margin:0 0 26px; padding:16px; border:1px solid var(--line); border-radius:12px; background:var(--panel); }
      .all-sheet img { width:100%; display:block; image-rendering:pixelated; border-radius:6px; background:#0d161c; }
      .all-sheet p { margin:10px 2px 0; color:var(--muted); font-size:10px; }
      .condition { display:grid; grid-template-columns:minmax(190px,.8fr) minmax(0,1.7fr); gap:22px; padding:22px 0; border-top:1px solid var(--line); }
      .condition h2 { margin:7px 0 7px; font-size:22px; letter-spacing:-.02em; }
      .condition-copy > p:not(.eyebrow) { margin:0; color:var(--muted); font-size:12px; line-height:1.55; }
      .condition-copy a { display:inline-block; margin-top:13px; color:var(--teal); font-size:10px; font-weight:700; text-decoration:none; }
      .condition-copy a:hover { text-decoration:underline; }
      .condition-visual { display:flex; flex-wrap:wrap; align-items:center; gap:18px; }
      .sprite-stage { width:192px; height:192px; flex:0 0 192px; border:1px solid var(--line); border-radius:10px; background:radial-gradient(circle at 50% 78%,rgba(255,137,110,.09),transparent 55%),#0b141a; overflow:hidden; }
      .sprite-anim { width:192px; height:192px; background-repeat:no-repeat; background-size:1152px 192px; image-rendering:pixelated; animation:walk .75s steps(6) infinite; }
      .frames { display:grid; grid-template-columns:repeat(6,1fr); gap:5px; flex:1 1 310px; }
      figure { margin:0; padding:5px 5px 4px; border:1px solid var(--line); border-radius:7px; background:#0b141a; text-align:center; }
      figure img { width:100%; height:auto; image-rendering:pixelated; display:block; }
      figcaption { color:var(--muted); font-size:8px; margin-top:2px; letter-spacing:.08em; }
      .notes { margin-top:33px; padding:15px 17px; border:1px solid var(--line); border-left:2px solid var(--orange); border-radius:8px; color:var(--muted); font-size:11px; line-height:1.6; background:rgba(17,28,36,.6); }
      .notes strong { color:var(--text); }
      @keyframes walk { from { background-position:0 0; } to { background-position:-1152px 0; } }
      @media (max-width:760px) { .condition { grid-template-columns:1fr; } .sprite-stage { margin:0 auto; } }
      @media (prefers-reduced-motion:reduce) { .sprite-anim { animation:none; } }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">ASTROPEER · CREW ASSET SHEET</p>
      <h1>Four hazards. <em>One crew.</em></h1>
      <p class="intro">A six-frame side-view walk cycle for the outpost astronaut. Each hazard changes the suit tint, visor, face, and a small environmental cue while keeping the helmet, oxygen tanks, backpack, and handheld mini computer readable.</p>
      <div class="preview-actions"><a class="play-link" href="play.html">ENTER THE SURFACE WALKABOUT <span aria-hidden="true">→</span></a><span class="preview-note">Start, then move with A/D or arrow keys.</span></div>
      <div class="all-sheet"><img src="astropeer-effects-sheet.png" alt="All Astropeer astronaut sprite frames"><p>Combined sheet · 5 conditions × 6 frames · displayed at 4× scale (source frames are ${SIZE}×${SIZE} px)</p></div>
      ${sections}
      <p class="notes"><strong>Asset notes:</strong> transparent PNGs, ${SIZE}×${SIZE} source pixels exported at ${SIZE * SCALE}×${SIZE * SCALE}. Frame timing in <code>manifest.json</code> is ${FRAME_MS} ms per frame. The handheld mini computer and twin oxygen tanks are present in every frame; the far arm and far leg are shaded to keep the side view readable.</p>
    </main>
  </body>
</html>
`;
}

function main() {
  ensureDir(OUT_DIR);
  const manifest = {
    generated: new Date().toISOString(),
    name: "Astropeer astronaut crew",
    style: "pixel-art side view walk cycle",
    frameWidth: SIZE,
    frameHeight: SIZE,
    scale: SCALE,
    frameDurationMs: FRAME_MS,
    frameCount: WALK.length,
    conditions: [],
  };

  const sheets = [];
  for (const cfg of CONDITIONS) {
    const conditionDir = path.join(OUT_DIR, cfg.id);
    ensureDir(conditionDir);
    const frames = WALK.map((_, index) => renderFrame(index, cfg));
    const names = frames.map((frame, index) => {
      const name = `walk-${String(index + 1).padStart(2, "0")}.png`;
      fs.writeFileSync(path.join(conditionDir, name), encodePng(scaleSprite(frame, SCALE)));
      fs.writeFileSync(path.join(conditionDir, name.replace(".png", `-${SIZE}px.png`)), encodePng(frame));
      return name;
    });

    const sheet = composeSheet(frames);
    fs.writeFileSync(path.join(conditionDir, "sheet.png"), encodePng(scaleSprite(sheet, SCALE)));
    sheets.push(sheet);

    manifest.conditions.push({
      id: cfg.id,
      label: cfg.label,
      effect: cfg.effect,
      frames: names,
      sheet: `${cfg.id}/sheet.png`,
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, "astropeer-effects-sheet.png"), encodePng(scaleSprite(composeStack(sheets), SCALE)));
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, "preview.html"), renderPreview(manifest));

  console.log(`Generated ${manifest.conditions.length * WALK.length} walk frames and ${manifest.conditions.length} sheets in ${path.relative(ROOT, OUT_DIR)}`);
}

main();
