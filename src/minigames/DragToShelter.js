import { PALETTE, TEXT } from "../constants.js";
import { C } from "../sim/rules.js";
import { drawShip } from "../ui/art.js";
import { sfx } from "../ui/sfx.js";
import { Toggle } from "../ui/Toggle.js";

const CREW = 3;
const WALK_SPEED = 170;

/**
 * Solar flare: get all three crew into the ship before the timer ends.
 * Drag them, click them, or press 1 / 2 / 3 to send them walking.
 * If the shield wall is built, S switches its power on (less dose, costs power).
 */
export class DragToShelter {
  constructor(scene, layer, area, ctx, done) {
    this.scene = scene;
    this.done = done;
    this.finished = false;
    this.inside = 0;
    layer.focus.arrowsMove = false;

    const groundY = area.y + 116;
    this.groundY = groundY;
    this.doorX = area.x + area.w - 70;
    const g = layer.gfx();
    g.fillStyle(PALETTE.regolith, 1);
    g.fillRect(area.x, groundY, area.w, 4);
    drawShip(g, this.doorX + 20, groundY);
    layer.text(area.x, area.y, "DRAG THE CREW INTO THE SHIP! (OR PRESS 1, 2, 3)", { color: TEXT.accent });

    this.crew = [];
    for (let i = 0; i < CREW; i += 1) {
      const sprite = layer.add(scene.add.sprite(area.x + 40 + i * 100, groundY - 22, "astro-walk-1"));
      const label = layer.text(sprite.x, groundY - 58, String(i + 1), { origin: 0.5, color: TEXT.accent });
      sprite.setInteractive({ useHandCursor: true, draggable: true });
      const member = { sprite, label, walking: false, inside: false, dragging: false };
      sprite.on("pointerdown", () => { member.walking = true; });
      sprite.on("dragstart", () => { member.dragging = true; });
      sprite.on("drag", (pointer, dragX, dragY) => {
        sprite.setPosition(
          Math.max(area.x + 10, Math.min(this.doorX + 10, dragX)),
          Math.max(area.y + 30, Math.min(groundY - 22, dragY)),
        );
      });
      sprite.on("dragend", () => {
        member.dragging = false;
        sprite.y = groundY - 22;
        this.checkDoor(member);
      });
      layer.focus.hotkey(String(i + 1), () => { member.walking = true; });
      this.crew.push(member);
    }

    // Shield power is only a choice once the wall exists and there is power for it.
    const state = ctx.state;
    this.shieldOn = false;
    if (state.buildings.shield.status === "done" && state.power >= C.SHIELD_ON_POWER) {
      layer.text(area.x, area.y + 132, `S: SHIELD POWER (COSTS ${C.SHIELD_ON_POWER} POWER, DOSE CUT TO 10%)`, { color: TEXT.muted });
      this.toggle = new Toggle(layer, { x: area.x + 416, y: area.y + 128, value: false, onChange: (value) => { this.shieldOn = value; } });
      layer.focus.hotkey("S", () => this.toggle.activate());
    } else {
      const why = state.buildings.shield.status === "done" ? "NOT ENOUGH POWER FOR THE SHIELD" : "NO SHIELD WALL YET: THE SHIP IS YOUR SHELTER";
      layer.text(area.x, area.y + 132, why, { color: "#4c5566" });
    }
  }

  checkDoor(member) {
    if (member.inside || member.sprite.x < this.doorX - 12) return;
    member.inside = true;
    member.walking = false;
    member.sprite.setVisible(false).disableInteractive();
    member.label.setText("OK").setColor(TEXT.good).setX(this.doorX + 20 + (this.inside - 1) * 22).setY(this.groundY - 96);
    this.inside += 1;
    sfx("good");
    if (this.inside === CREW) this.finish();
  }

  update(dt) {
    if (this.finished) return;
    for (const member of this.crew) {
      if (member.inside) continue;
      if (member.walking && !member.dragging) {
        member.sprite.x += WALK_SPEED * dt;
        member.sprite.anims.play("astro-walk", true);
        this.checkDoor(member);
      }
      if (!member.inside) member.label.setX(member.sprite.x);
    }
  }

  timeUp() {
    this.finish();
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.done({ quality: this.inside / CREW, shieldOn: this.shieldOn });
  }

  destroy() {}
}
