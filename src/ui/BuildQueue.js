import { PALETTE, TEXT } from "../constants.js";
import { ITEMS, MAX_ACTIVE_BUILDS } from "../sim/buildings.js";
import { ITEM_ICON, drawIcon } from "./icons.js";

/**
 * The three build slots: a hammer, then one box per slot showing the
 * building's icon, days left and a progress bar. An empty slot is dashed.
 */
export class BuildQueue {
  /** @param {import('./kit.js').Layer} layer @param {{x: number, y: number, onTap?: Function}} o */
  constructor(layer, o) {
    this.x = o.x + 22;
    this.y = o.y;
    this.slotW = 58;
    this.slotH = 32;
    const hammer = layer.gfx();
    drawIcon(hammer, "build", o.x, o.y + 8, 1.4);
    this.g = layer.gfx();
    this.labels = [];
    for (let i = 0; i < MAX_ACTIVE_BUILDS; i += 1) {
      this.labels.push(layer.text(this.x + i * (this.slotW + 4) + this.slotW - 4, o.y + 2, "", { origin: 1 }));
    }
    if (o.onTap) {
      const hit = layer.rect(o.x, o.y, 22 + MAX_ACTIVE_BUILDS * (this.slotW + 4), this.slotH, 0, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => o.onTap());
    }
  }

  /** @param {object} state  the sim state */
  update(state) {
    const active = state.buildQueue.filter((id) => state.buildings[id].status === "building");
    const g = this.g;
    g.clear();
    for (let i = 0; i < MAX_ACTIVE_BUILDS; i += 1) {
      const sx = this.x + i * (this.slotW + 4);
      const id = active[i];
      g.fillStyle(PALETTE.panel, 0.95);
      g.fillRect(sx, this.y, this.slotW, this.slotH);
      if (!id) {
        // A dashed outline: this slot is free.
        g.fillStyle(PALETTE.panelEdge, 1);
        for (let dx = 0; dx < this.slotW; dx += 6) {
          g.fillRect(sx + dx, this.y, 3, 1);
          g.fillRect(sx + dx, this.y + this.slotH - 1, 3, 1);
        }
        for (let dy = 0; dy < this.slotH; dy += 6) {
          g.fillRect(sx, this.y + dy, 1, 3);
          g.fillRect(sx + this.slotW - 1, this.y + dy, 1, 3);
        }
        this.labels[i].setText("");
        continue;
      }
      g.lineStyle(1, PALETTE.accent, 1);
      g.strokeRect(sx, this.y, this.slotW, this.slotH);
      drawIcon(g, ITEM_ICON[id], sx + 5, this.y + 4, 1.4);
      const building = state.buildings[id];
      const done = 1 - building.daysLeft / ITEMS[id].buildDays;
      this.labels[i].setText(`${Math.ceil(building.daysLeft)}d`).setColor(TEXT.accent);
      g.fillStyle(0x232a36, 1);
      g.fillRect(sx + 4, this.y + this.slotH - 8, this.slotW - 8, 4);
      g.fillStyle(PALETTE.accent, 1);
      g.fillRect(sx + 4, this.y + this.slotH - 8, Math.round((this.slotW - 8) * Math.max(0.04, done)), 4);
    }
  }
}
