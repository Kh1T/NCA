import Phaser from "phaser";
import { GROUND_Y, HEIGHT, PALETTE, TEXT, UI, WIDTH, textStyle } from "../constants.js";
import { ITEMS } from "../sim/buildings.js";
import { isNight } from "../sim/rules.js";
import { drawShip, drawSite } from "../ui/art.js";
import { drawIcon } from "../ui/icons.js";
import { TouchPad } from "../ui/TouchPad.js";
import { drawEarth, drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { sfx, playMusic } from "../ui/sfx.js";

export const WORLD_W = 1200;
export const SHIP_X = 120;
export const SITE_X = {
  solar: 280, air: 420, oxygen: 560, greenhouse: 700, shield: 840, rover: 1000,
};
const ROCKS = [
  { x: 350, w: 18, h: 8 }, { x: 490, w: 14, h: 6 }, { x: 630, w: 22, h: 11 }, { x: 770, w: 16, h: 7 }, { x: 920, w: 18, h: 10 },
];
const REACH = 38;
const SPEED = 100;
const JUMP = -150;

/**
 * The base view for Phases 1 and 2: a side-scrolling lunar surface. The
 * astronaut walks and jumps between the ship and the building sites.
 * The HUD and all panels live in the OutpostUi scene on top of this one.
 */
export class Outpost extends Phaser.Scene {
  constructor() {
    super("Outpost");
  }

  get state() {
    return this.registry.get("state");
  }

  create() {
    this.frozen = false;
    this.walkTarget = null;
    this.focusId = null;

    this.physics.world.setBounds(0, 0, WORLD_W, HEIGHT);
    playMusic("base");
    this.cameras.main.setBounds(0, 0, WORLD_W, HEIGHT);
    drawStars(this, { seed: "outpost-sky", maxY: GROUND_Y - 20, scroll: 0, count: 90 });
    drawEarth(this, 520, 84);
    drawHills(this, { width: WORLD_W, seed: "outpost-hills", scroll: 0.5 });
    drawGround(this, { width: WORLD_W, seed: "outpost-ground" });

    // Solid ground and a few rocks to hop over.
    this.solids = this.physics.add.staticGroup();
    const ground = this.add.rectangle(WORLD_W / 2, GROUND_Y + 30, WORLD_W, 60, 0x000000, 0);
    this.solids.add(ground);
    for (const rock of ROCKS) {
      const block = this.add.rectangle(rock.x, GROUND_Y - rock.h / 2, rock.w, rock.h, PALETTE.regolithDark);
      block.setStrokeStyle(1, PALETTE.regolithLight);
      this.solids.add(block);
    }

    // The ship. There is only one astronaut: you.
    const ship = this.add.graphics();
    drawShip(ship, SHIP_X, GROUND_Y);
    this.add.text(SHIP_X, GROUND_Y + 4, "SHIP", textStyle(UI.body, "#23262d")).setOrigin(0.5, 0);

    // Building sites.
    this.sites = {};
    for (const [id, x] of Object.entries(SITE_X)) {
      const g = this.add.graphics();
      const name = this.add.text(x, GROUND_Y + 4, ITEMS[id].short, textStyle(UI.body, "#23262d")).setOrigin(0.5, 0);
      // A status badge floats above each site: a picture, not a word.
      const status = this.add.graphics().setDepth(4);
      const days = this.add.text(x + 9, GROUND_Y - 78, "", textStyle(UI.body, TEXT.accent)).setOrigin(0, 0.5).setDepth(4);
      const hit = this.add.rectangle(x, GROUND_Y - 24, 52, 52, 0x000000, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.walkTo(x, id));
      this.sites[id] = { g, name, status, days, x };
    }
    const shipHit = this.add.rectangle(SHIP_X, GROUND_Y - 40, 60, 80, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    shipHit.on("pointerdown", () => this.walkTo(SHIP_X, "ship"));
    this.marker = this.add.graphics().setDepth(5);
    this.tweens.add({ targets: this.marker, alpha: 0.25, duration: 450, yoyo: true, repeat: -1 });

    // The astronaut.
    const startX = this.registry.get("outpostX") ?? SHIP_X + 30;
    this.player = this.physics.add.sprite(startX, GROUND_Y - 30, "astro-walk-1").setDepth(10);
    this.player.body.setSize(14, 32).setOffset(17, 14);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 40);

    this.prompt = this.add.text(0, 0, "", textStyle(UI.body, TEXT.accent, { backgroundColor: "#05060a", padding: { x: 3, y: 2 } })).setOrigin(0.5, 1).setDepth(20);
    this.prompt.setInteractive({ useHandCursor: true });
    this.prompt.on("pointerdown", () => this.interact());

    // Day/night shading for the time-lapse and the long shadow.
    this.shade = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x02030a, 0).setOrigin(0).setScrollFactor(0).setDepth(40);
    this.dayText = this.add.text(WIDTH / 2, 150, "", textStyle(48, TEXT.white)).setOrigin(0.5).setScrollFactor(0).setDepth(41).setAlpha(0);

    this.keys = this.input.keyboard.addKeys({
      left: "LEFT", right: "RIGHT", up: "UP", a: "A", d: "D", w: "W", space: "SPACE", e: "E", enter: "ENTER",
    });
    // Tap or click the ground to walk there.
    this.input.on("pointerdown", (pointer, over) => {
      if (over.length === 0 && pointer.y > 86 && pointer.y < 320) this.walkTo(pointer.worldX, null);
    });
    this.events.once("shutdown", () => this.registry.set("outpostX", this.player.x));

    // On-screen buttons for touch screens (hidden until the first touch).
    // JUMP and USE sit just left of the checklist panel, so it never hides them.
    this.pad = new TouchPad(this, { y: 268, rightEdge: 484 });

    this.scene.launch("OutpostUi");
    this.scene.bringToTop("OutpostUi");
    this.refresh();
  }

  get ui() {
    return this.scene.get("OutpostUi");
  }

  /** Redraw every site from the current state. */
  refresh() {
    const state = this.state;
    for (const [id, site] of Object.entries(this.sites)) {
      const building = state.buildings[id];
      drawSite(site.g, id, site.x, GROUND_Y, building, ITEMS[id].buildDays);
      let icon = null;
      let days = "";
      if (!building.packed) icon = "cross";
      else if (building.status === "building") {
        icon = "build";
        days = `${Math.ceil(building.daysLeft)}d`;
      } else if (building.status === "done" && building.health < 100) icon = "broken";
      // A finished, working building needs no badge: the building itself shows it.
      if (building.status === "done" && site.wasDone === false) this.popSite(site);
      site.wasDone = building.status === "done";
      site.status.clear();
      if (icon) {
        site.status.fillStyle(0x05060a, 0.75);
        site.status.fillCircle(site.x, GROUND_Y - 78, 12);
        if (days) site.status.fillRect(site.x + 8, GROUND_Y - 86, 24, 16);
        drawIcon(site.status, icon, site.x - 9, GROUND_Y - 87, 1.5);
      }
      site.days.setText(days);
      site.name.setColor(building.packed ? "#23262d" : "#4c4f56");
    }
    this.baseShade = isNight(state) ? 0.45 : 0;
    if (!this.lapsing) this.shade.setAlpha(this.baseShade);
    this.drawMarker();
  }

  /** A finished building bounces and sparkles. */
  popSite(site) {
    site.g.setScale(1, 1);
    const burst = this.add.graphics().setDepth(6);
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      burst.fillStyle(i % 2 ? PALETTE.accent : PALETTE.good, 1);
      burst.fillRect(site.x + Math.cos(a) * 26, GROUND_Y - 30 + Math.sin(a) * 26, 3, 3);
    }
    this.tweens.add({ targets: burst, alpha: 0, scale: 1.4, duration: 700, onComplete: () => burst.destroy() });
  }

  /** The astronaut says something: a speech bubble above their head. */
  say(text, icon = null) {
    this.bubble?.destroy();
    const pad = 6;
    const label = this.add.text(0, 0, text, textStyle(UI.body, "#05060a", { wordWrap: { width: 170 } }));
    // The box is always sized to the wrapped text, so the words never spill out.
    const w = label.width + pad * 2 + (icon ? 22 : 0);
    const h = label.height + pad * 2;
    const g = this.add.graphics();
    g.fillStyle(0xf2f5fa, 1);
    g.fillRect(0, 0, w, h);
    g.fillTriangle(w / 2 - 6, h, w / 2 + 6, h, w / 2, h + 8);
    if (icon) drawIcon(g, icon, pad, h / 2 - 9, 1.5);
    label.setPosition(pad + (icon ? 22 : 0), pad);
    const box = this.add.container(0, 0, [g, label]).setDepth(30).setSize(w, h);
    box.bubbleW = w; // not .w: Phaser containers use that name already
    box.bubbleH = h;
    this.bubble = box;
    this.placeBubble();
    box.setScale(0);
    this.tweens.add({ targets: box, scale: 1, duration: 200, ease: "Back.easeOut" });
    this.time.delayedCall(4500, () => {
      if (this.bubble !== box) return;
      this.tweens.add({ targets: box, alpha: 0, duration: 300, onComplete: () => { box.destroy(); if (this.bubble === box) this.bubble = null; } });
    });
  }

  placeBubble() {
    if (!this.bubble) return;
    const cam = this.cameras.main;
    // Stay left of the checklist panel (screen x 488 and beyond).
    const x = Phaser.Math.Clamp(this.player.x - this.bubble.bubbleW / 2, cam.scrollX + 4, cam.scrollX + 482 - this.bubble.bubbleW);
    // Above the "E: ..." prompt, which sits just over the astronaut's head.
    this.bubble.setPosition(x, Math.max(96, this.player.y - 62 - this.bubble.bubbleH));
  }

  /** Pulse an arrow over the thing the guide line is talking about. */
  setFocus(id) {
    this.focusId = id;
    this.drawMarker();
  }

  drawMarker() {
    this.marker.clear();
    const x = this.focusId === "ship" ? SHIP_X : SITE_X[this.focusId];
    if (x === undefined) return;
    const y = GROUND_Y - (this.focusId === "ship" ? 92 : 56);
    this.marker.fillStyle(PALETTE.accent, 1);
    this.marker.fillTriangle(x - 7, y, x + 7, y, x, y + 9);
    this.marker.fillRect(x - 2, y - 8, 4, 8);
  }

  walkTo(x, id) {
    if (this.frozen) return;
    this.walkTarget = { x: Phaser.Math.Clamp(x, 20, WORLD_W - 20), id };
  }

  /** What the astronaut is standing next to: 'ship', a site id, or null. */
  nearest() {
    let best = null;
    let bestDistance = REACH;
    const check = (id, x) => {
      const distance = Math.abs(this.player.x - x);
      if (distance < bestDistance) {
        best = id;
        bestDistance = distance;
      }
    };
    check("ship", SHIP_X);
    for (const [id, x] of Object.entries(SITE_X)) check(id, x);
    return best;
  }

  interact() {
    if (this.frozen) return;
    const near = this.nearest();
    if (!near) return;
    this.walkTarget = null;
    sfx("click");
    if (near === "ship" || (near === "rover" && this.state.buildings.rover.status === "done")) this.ui.openDay();
    else this.ui.openSite(near);
  }

  /** Night passes over the base while the day's work happens. */
  playDay(nextDay, onDone) {
    this.lapsing = true;
    sfx("day");
    this.dayText.setText(`DAY ${nextDay - 1} ...`);
    this.tweens.add({ targets: this.dayText, alpha: 1, duration: 300, yoyo: true, hold: 1100 });
    this.tweens.add({
      targets: this.shade,
      alpha: 0.72,
      duration: 850,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.lapsing = false;
        this.shade.setAlpha(this.baseShade ?? 0);
        onDone();
      },
    });
  }

  update() {
    const body = this.player.body;
    const k = this.keys;
    const onFloor = body.blocked.down || body.touching.down;
    if (this.frozen) {
      this.player.setVelocityX(0);
      this.player.anims.stop();
      this.prompt.setVisible(false);
      // Swallow key presses made while a panel was open, so they do not fire later.
      for (const key of [k.e, k.enter, k.up, k.w, k.space]) Phaser.Input.Keyboard.JustDown(key);
      this.pad.takeJump();
      this.pad.takeUse();
      this.wasFrozen = true;
      return;
    }
    if (this.wasFrozen) {
      // The key that closed a panel must not also act in the world.
      for (const key of [k.e, k.enter, k.up, k.w, k.space]) Phaser.Input.Keyboard.JustDown(key);
      this.wasFrozen = false;
    }

    let direction = 0;
    if (k.left.isDown || k.a.isDown) direction = -1;
    else if (k.right.isDown || k.d.isDown) direction = 1;
    else direction = this.pad.direction;
    let jump = Phaser.Input.Keyboard.JustDown(k.up) || Phaser.Input.Keyboard.JustDown(k.w) || Phaser.Input.Keyboard.JustDown(k.space) || this.pad.takeJump();
    const use = this.pad.takeUse();

    if (direction !== 0 || jump) {
      this.walkTarget = null;
    } else if (this.walkTarget) {
      const dx = this.walkTarget.x - this.player.x;
      if (Math.abs(dx) < 6) {
        const { id } = this.walkTarget;
        this.walkTarget = null;
        if (id && this.nearest() === id) this.interact();
      } else {
        direction = Math.sign(dx);
        // Hop over a rock that is in the way.
        if (onFloor && (body.blocked.left || body.blocked.right)) jump = true;
      }
    }

    this.placeBubble();
    this.player.setVelocityX(direction * SPEED);
    if (direction !== 0) {
      this.player.setFlipX(direction < 0);
      this.player.anims.play("astro-walk", true);
    } else {
      this.player.anims.stop();
    }
    if (jump && onFloor) {
      this.player.setVelocityY(JUMP);
      sfx("jump");
    }

    const near = this.nearest();
    if (near) {
      const label = near === "ship" ? "SHIP: NEXT DAY" : ITEMS[near].name.toUpperCase();
      this.prompt.setText(`${this.registry.get("touchUsed") ? "TAP: " : "E: "}${label}`).setPosition(this.player.x, this.player.y - 30).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.enter) || use) this.interact();
    } else {
      this.prompt.setVisible(false);
    }
  }
}
