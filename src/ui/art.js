// Pixel art drawn with shapes: the ship, the buildings, the rover and Ceres.
// x is the centre of the object and y is the ground line it stands on.

import { ICON_COLOR } from "./icons.js";

const HULL = 0xdfe7f2;
const HULL_SHADE = 0xa8b3c2;
const DARK = 0x1b2029;
const FRAME = 0x6b7384;

export function drawShip(g, x, y, { flame = false, door = true } = {}) {
  // Legs
  g.fillStyle(FRAME, 1);
  g.fillRect(x - 26, y - 10, 3, 10);
  g.fillRect(x + 23, y - 10, 3, 10);
  g.fillRect(x - 30, y - 2, 10, 2);
  g.fillRect(x + 20, y - 2, 10, 2);
  // Body
  g.fillStyle(HULL, 1);
  g.fillRect(x - 20, y - 52, 40, 44);
  g.fillStyle(HULL_SHADE, 1);
  g.fillRect(x + 10, y - 52, 10, 44);
  // Nose
  g.fillStyle(HULL, 1);
  g.fillTriangle(x - 20, y - 52, x, y - 78, x + 20, y - 52);
  g.fillStyle(0xf1845e, 1);
  g.fillRect(x - 20, y - 54, 40, 3);
  // Window and door
  g.fillStyle(0x163540, 1);
  g.fillRect(x - 8, y - 46, 12, 10);
  g.fillStyle(0x5ce7dc, 1);
  g.fillRect(x - 6, y - 44, 4, 3);
  if (door) {
    g.fillStyle(DARK, 1);
    g.fillRect(x - 7, y - 28, 14, 20);
    g.fillStyle(0xffd166, 1);
    g.fillRect(x - 5, y - 26, 10, 2);
  }
  // Engine
  g.fillStyle(DARK, 1);
  g.fillRect(x - 10, y - 8, 20, 4);
  if (flame) {
    g.fillStyle(0xffb347, 1);
    g.fillTriangle(x - 8, y - 4, x, y + 16, x + 8, y - 4);
    g.fillStyle(0xfff3a0, 1);
    g.fillTriangle(x - 4, y - 4, x, y + 8, x + 4, y - 4);
  }
}

function plot(g, x, y, color = FRAME, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillRect(x - 22, y - 1, 44, 2);
  g.fillRect(x - 22, y - 5, 2, 5);
  g.fillRect(x + 20, y - 5, 2, 5);
}

function scaffold(g, x, y, progress) {
  const h = 10 + Math.round(26 * progress);
  g.lineStyle(1, 0xffd166, 1);
  g.strokeRect(x - 18, y - h, 36, h);
  g.lineBetween(x - 18, y - h, x + 18, y);
  g.lineBetween(x + 18, y - h, x - 18, y);
  g.fillStyle(0xffd166, 1);
  g.fillRect(x - 20, y - h - 2, 40, 2);
}

const DRAW = {
  solar(g, x, y) {
    g.fillStyle(FRAME, 1);
    g.fillRect(x - 1, y - 16, 3, 16);
    g.fillStyle(0x24508f, 1);
    g.fillRect(x - 20, y - 30, 40, 14);
    g.fillStyle(0x4c8dff, 1);
    for (let i = 0; i < 4; i += 1) g.fillRect(x - 18 + i * 10, y - 28, 8, 4);
    for (let i = 0; i < 4; i += 1) g.fillRect(x - 18 + i * 10, y - 22, 8, 4);
  },
  water(g, x, y) {
    g.fillStyle(FRAME, 1);
    g.fillTriangle(x - 18, y, x - 8, y - 34, x + 2, y);
    g.fillStyle(DARK, 1);
    g.fillTriangle(x - 13, y, x - 8, y - 22, x - 3, y);
    g.fillStyle(ICON_COLOR.water, 1);
    g.fillRect(x + 4, y - 20, 16, 20);
    g.fillStyle(0x8fb8ff, 1);
    g.fillRect(x + 6, y - 18, 3, 16);
    g.fillStyle(HULL, 1);
    g.fillRect(x + 4, y - 22, 16, 2);
  },
  oxygen(g, x, y) {
    g.fillStyle(HULL, 1);
    g.fillRect(x - 16, y - 28, 14, 28);
    g.fillRect(x + 2, y - 28, 14, 28);
    g.fillStyle(ICON_COLOR.oxygen, 1);
    g.fillRect(x - 16, y - 20, 14, 4);
    g.fillRect(x + 2, y - 20, 14, 4);
    g.fillStyle(FRAME, 1);
    g.fillRect(x - 12, y - 32, 6, 4);
    g.fillRect(x + 6, y - 32, 6, 4);
    g.fillRect(x - 6, y - 30, 12, 2);
  },
  air(g, x, y) {
    g.fillStyle(HULL_SHADE, 1);
    g.fillRect(x - 18, y - 24, 36, 24);
    g.fillStyle(DARK, 1);
    for (let i = 0; i < 4; i += 1) g.fillRect(x - 14, y - 20 + i * 5, 20, 2);
    g.fillStyle(ICON_COLOR.air, 1);
    g.fillRect(x + 9, y - 20, 6, 6);
    g.fillStyle(FRAME, 1);
    g.fillRect(x + 4, y - 32, 6, 8);
  },
  greenhouse(g, x, y) {
    g.fillStyle(0x2b5d6b, 1);
    g.fillRect(x - 20, y - 16, 40, 16);
    g.fillTriangle(x - 20, y - 16, x, y - 32, x + 20, y - 16);
    g.fillStyle(ICON_COLOR.food, 1);
    g.fillRect(x - 14, y - 8, 4, 8);
    g.fillRect(x - 4, y - 12, 4, 12);
    g.fillRect(x + 8, y - 9, 4, 9);
    g.fillStyle(0x9be7e0, 0.8);
    g.fillRect(x - 20, y - 17, 40, 1);
    g.fillRect(x - 1, y - 30, 2, 14);
  },
  shield(g, x, y) {
    g.fillStyle(0x6a6d75, 1);
    g.fillTriangle(x - 24, y, x - 12, y - 26, x + 24, y);
    g.fillRect(x - 12, y - 26, 20, 26);
    g.fillTriangle(x + 8, y - 26, x + 24, y, x + 8, y);
    g.fillStyle(ICON_COLOR.shield, 1);
    g.fillRect(x - 12, y - 28, 20, 2);
    g.fillStyle(DARK, 1);
    g.fillRect(x - 7, y - 14, 10, 14);
  },
  antenna(g, x, y) {
    g.fillStyle(FRAME, 1);
    g.fillRect(x - 1, y - 20, 3, 20);
    g.fillRect(x - 10, y - 2, 21, 2);
    g.fillStyle(HULL, 1);
    g.fillTriangle(x - 16, y - 36, x + 14, y - 30, x - 6, y - 16);
    g.fillStyle(0xffd166, 1);
    g.fillRect(x + 4, y - 36, 3, 3);
  },
  rover(g, x, y) {
    drawRover(g, x, y);
  },
};

export function drawRover(g, x, y) {
  g.fillStyle(DARK, 1);
  for (const wx of [-16, -4, 8]) g.fillCircle(x + wx + 4, y - 5, 5);
  g.fillStyle(FRAME, 1);
  for (const wx of [-16, -4, 8]) g.fillCircle(x + wx + 4, y - 5, 2);
  g.fillStyle(HULL, 1);
  g.fillRect(x - 20, y - 20, 40, 11);
  g.fillStyle(0x163540, 1);
  g.fillRect(x + 4, y - 26, 14, 8);
  g.fillStyle(0x5ce7dc, 1);
  g.fillRect(x + 6, y - 24, 5, 3);
  g.fillStyle(FRAME, 1);
  g.fillRect(x - 14, y - 34, 2, 14);
  g.fillStyle(0xf1845e, 1);
  g.fillRect(x - 18, y - 38, 8, 5);
}

/**
 * Draw a building site in whatever state it is in.
 * @param {{packed: boolean, status: string, daysLeft: number, on: boolean, health: number}} building
 */
export function drawSite(g, id, x, y, building, buildDays = 1) {
  g.clear();
  if (!building.packed) {
    plot(g, x, y, 0x3a3d44, 1);
    return;
  }
  if (building.status === "idle") {
    plot(g, x, y, 0xffd166, 1);
    // A little flag marks a site that is ready to build on.
    g.fillStyle(FRAME, 1);
    g.fillRect(x - 1, y - 20, 2, 20);
    g.fillStyle(0xffd166, 1);
    g.fillTriangle(x + 1, y - 20, x + 11, y - 16, x + 1, y - 12);
    return;
  }
  if (building.status === "building") {
    plot(g, x, y);
    scaffold(g, x, y, 1 - building.daysLeft / buildDays);
    return;
  }
  DRAW[id]?.(g, x, y);
  if (!building.on) {
    g.fillStyle(0x05060a, 0.6);
    g.fillRect(x - 24, y - 40, 48, 40);
  }
  if (building.health < 100) {
    // A crack and a warning mark: damage is shown by shape, not only colour.
    g.fillStyle(0xff5d5d, 1);
    g.fillRect(x - 2, y - 30, 3, 5);
    g.fillRect(x + 1, y - 25, 3, 5);
    g.fillRect(x - 2, y - 20, 3, 5);
    g.fillRect(x + 14, y - 44, 4, 8);
    g.fillRect(x + 14, y - 34, 4, 3);
  }
}

/** Ceres, the helper robot guide. About 20 px wide and 26 px tall. */
export function drawCeres(g, x, y) {
  g.fillStyle(FRAME, 1);
  g.fillRect(x - 1, y - 30, 2, 5);
  g.fillStyle(0xffd166, 1);
  g.fillRect(x - 2, y - 33, 4, 4);
  g.fillStyle(HULL, 1);
  g.fillRect(x - 9, y - 26, 18, 13);
  g.fillStyle(0x163540, 1);
  g.fillRect(x - 7, y - 23, 14, 7);
  g.fillStyle(0x5ce7dc, 1);
  g.fillRect(x - 5, y - 21, 3, 3);
  g.fillRect(x + 2, y - 21, 3, 3);
  g.fillStyle(HULL_SHADE, 1);
  g.fillRect(x - 7, y - 12, 14, 8);
  g.fillStyle(0xf1845e, 1);
  g.fillRect(x - 3, y - 10, 6, 3);
  g.fillStyle(DARK, 1);
  g.fillRect(x - 8, y - 4, 6, 4);
  g.fillRect(x + 2, y - 4, 6, 4);
}
