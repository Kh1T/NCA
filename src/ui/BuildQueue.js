import { PALETTE, TEXT } from "../constants.js";
import { ITEMS, MAX_ACTIVE_BUILDS } from "../sim/buildings.js";

/** The three build slots. Shows what is being built and how far along it is. */
export class BuildQueue {
  /** @param {import('./kit.js').Layer} layer @param {{x: number, y: number}} o */
  constructor(layer, o) {
    this.x = o.x;
    this.y = o.y;
    this.slotW = 96;
    layer.text(o.x, o.y - 11, "BUILD SLOTS", { color: TEXT.muted });
    this.g = layer.gfx();
    this.labels = [];
    for (let i = 0; i < MAX_ACTIVE_BUILDS; i += 1) {
      this.labels.push(layer.text(o.x + i * (this.slotW + 4) + 4, o.y + 3, "", {}));
    }
  }

  /** @param {object} state  the sim state */
  update(state) {
    const active = state.buildQueue.filter((id) => state.buildings[id].status === "building");
    this.g.clear();
    for (let i = 0; i < MAX_ACTIVE_BUILDS; i += 1) {
      const sx = this.x + i * (this.slotW + 4);
      const id = active[i];
      this.g.fillStyle(PALETTE.panel, 0.95);
      this.g.fillRect(sx, this.y, this.slotW, 20);
      this.g.lineStyle(1, id ? PALETTE.accent : PALETTE.panelEdge, 1);
      this.g.strokeRect(sx, this.y, this.slotW, 20);
      if (!id) {
        this.labels[i].setText("FREE").setColor(TEXT.muted);
        continue;
      }
      const item = ITEMS[id];
      const done = 1 - state.buildings[id].daysLeft / item.buildDays;
      this.labels[i].setText(item.short).setColor(TEXT.white);
      this.g.fillStyle(0x232a36, 1);
      this.g.fillRect(sx + 4, this.y + 14, this.slotW - 8, 3);
      this.g.fillStyle(PALETTE.accent, 1);
      this.g.fillRect(sx + 4, this.y + 14, Math.round((this.slotW - 8) * Math.max(0.04, done)), 3);
    }
  }
}
