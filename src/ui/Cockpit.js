import Phaser from "phaser";
import { PALETTE } from "../constants.js";
import { drawIcon } from "./icons.js";

/**
 * The rover cockpit, a window seen from behind the astronaut's helmet. The
 * steering wheel turns as the player steers and springs back to centre when
 * they let go. The ground outside streams past while the rover moves, and a
 * small dashboard shows battery, suit heat and time.
 */
export class Cockpit {
  constructor(scene, { x, y, w = 180, h = 124, depth = 95 } = {}) {
    this.scene = scene;
    this.w = w;
    this.h = h;
    this.angle = 0;
    this.scrollX = 0;
    this.shown = false;
    this.homeY = y;

    const c = (this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(depth));
    this.view = scene.add.graphics(); // the world outside, redrawn as it scrolls
    this.frame = scene.add.graphics();
    this.helmet = scene.add.graphics();
    this.wheel = scene.add.graphics();
    this.dash = scene.add.graphics();
    c.add([this.view, this.frame, this.helmet, this.wheel, this.dash]);

    // Window frame: a console strip on top (the gauges), the windshield in
    // the middle (drawn by drawView), and the dark cabin at the bottom.
    this.frame.fillStyle(0x10141c, 1);
    this.frame.fillRect(0, 0, w, 18);
    this.frame.fillStyle(0x1b2029, 1);
    this.frame.fillRect(0, h - 30, w, 30);
    this.frame.lineStyle(3, PALETTE.panelEdge, 1);
    this.frame.strokeRect(0, 0, w, h);
    this.frame.lineStyle(1, PALETTE.panelEdge, 1);
    this.frame.lineBetween(0, 18, w, 18);

    // Back of the helmet, lower left: a white dome with a shadow and a light.
    const hx = 44;
    const hy = h - 28;
    const r = 24;
    this.helmet.fillStyle(0xa8b3c2, 1);
    this.helmet.fillCircle(hx + 2, hy + 2, r);
    this.helmet.fillStyle(0xdfe7f2, 1);
    this.helmet.fillCircle(hx, hy, r);
    this.helmet.fillStyle(0xf1845e, 1);
    this.helmet.fillRect(hx - r, hy - 3, r * 2, 4); // stripe round the helmet
    this.helmet.fillStyle(0x6b7384, 1);
    this.helmet.fillRect(hx + 12, hy - r - 10, 2, 12); // antenna
    this.helmet.fillStyle(0xffd166, 1);
    this.helmet.fillRect(hx + 11, hy - r - 13, 4, 4);

    // Steering wheel, in front and to the right, rotating about its centre.
    this.wheel.setPosition(w - 56, h - 30);
    this.wheel.lineStyle(6, 0x3a3d44, 1);
    this.wheel.strokeCircle(0, 0, 26);
    this.wheel.lineStyle(3, 0x6b7384, 1);
    this.wheel.strokeCircle(0, 0, 26);
    this.wheel.fillStyle(0x3a3d44, 1);
    this.wheel.fillRect(-26, -3, 52, 6);
    this.wheel.fillRect(-3, 0, 6, 26);
    this.wheel.fillStyle(0xffd166, 1);
    this.wheel.fillCircle(0, 0, 6);
    this.wheel.fillRect(-2, -28, 4, 6); // top marker, so the turning is easy to see

    this.container.y = -h - 20;
    this.container.setVisible(false);
  }

  show(on) {
    if (on === this.shown) return;
    this.shown = on;
    this.scene.tweens.killTweensOf(this.container);
    if (on) this.container.setVisible(true);
    this.scene.tweens.add({
      targets: this.container,
      y: on ? this.homeY : -this.h - 20,
      duration: 260,
      ease: on ? "Back.easeOut" : "Quad.easeIn",
      onComplete: () => { if (!on) this.container.setVisible(false); },
    });
  }

  /**
   * @param {number} dt  seconds
   * @param {{steer: number, moving: boolean, battery: number, heat: number, time: number}} s
   *   steer: -1 left, 0 straight, 1 right. battery/heat/time: 0..1 shares.
   */
  update(dt, s) {
    if (!this.shown) return;
    // The wheel turns toward the steering and springs back when released.
    const target = s.moving ? s.steer * 0.6 : 0;
    this.angle += (target - this.angle) * Math.min(1, dt * 10);
    // A little jiggle while driving over bumps.
    const bump = s.moving ? Math.sin(this.scene.time.now / 60) * 0.03 : 0;
    this.wheel.setRotation(this.angle + bump);
    if (s.moving) this.scrollX += s.steer * dt * 120;
    this.drawView(s.moving);
    this.drawDash(s);
  }

  drawView(moving) {
    const g = this.view;
    const { w, h } = this;
    const top = 19;
    const horizon = 52;
    const bottom = h - 30;
    g.clear();
    g.fillStyle(0x05060a, 1);
    g.fillRect(3, top, w - 6, horizon - top);
    // Stars barely move; far hills a bit; near rocks rush past.
    g.fillStyle(0xdfe7f2, 0.8);
    for (let i = 0; i < 14; i += 1) {
      const sx = Phaser.Math.Wrap(i * 37 - this.scrollX * 0.05, 4, w - 4);
      g.fillRect(sx, top + 3 + ((i * 13) % (horizon - top - 8)), 1, 1);
    }
    g.fillStyle(0x2c2e33, 1);
    for (let i = 0; i < 5; i += 1) {
      // Hills stay inside the windshield: never wider than the space left at the edge.
      const hx = Phaser.Math.Wrap(i * 48 - this.scrollX * 0.3, 16, w - 16);
      const half = Math.min(24, hx - 3, w - 3 - hx);
      g.fillTriangle(hx - half, horizon, hx, horizon - Math.min(12 + (i % 2) * 6, horizon - top - 2), hx + half, horizon);
    }
    g.fillStyle(0x55585f, 1);
    g.fillRect(3, horizon, w - 6, bottom - horizon);
    g.fillStyle(0x3c3e44, 1);
    for (let i = 0; i < 9; i += 1) {
      const rx = Phaser.Math.Wrap(i * 29 - this.scrollX, 3, w - 9);
      const ry = horizon + 4 + ((i * 17) % Math.max(4, bottom - horizon - 8));
      const size = 2 + ((ry - horizon) / 10);
      g.fillRect(rx, ry, size, size * 0.6);
    }
    // Speed lines when driving.
    if (moving) {
      g.fillStyle(0xb9bcc2, 0.5);
      for (let i = 0; i < 3; i += 1) g.fillRect(Phaser.Math.Wrap(i * 61 - this.scrollX * 1.6, 3, w - 20), horizon + 6 + i * 7, 14, 1);
    }
  }

  drawDash(s) {
    const g = this.dash;
    const { w, h } = this;
    g.clear();
    // Gauges along the console strip at the top of the window.
    const gauge = (x, icon, share, color, warn = true) => {
      drawIcon(g, icon, x, 3, 1);
      g.fillStyle(0x232a36, 1);
      g.fillRect(x + 15, 7, 36, 5);
      g.fillStyle(warn && share < 0.25 ? PALETTE.danger : color, 1);
      g.fillRect(x + 15, 7, Math.round(36 * Phaser.Math.Clamp(share, 0, 1)), 5);
    };
    void h;
    gauge(6, "battery", s.battery, PALETTE.good);
    gauge(64, "thermo", s.heat, 0xff8c42);
    gauge(122, "camera", s.time, PALETTE.accent, false);
    void w;
  }

  destroy() {
    this.container.destroy();
  }
}
