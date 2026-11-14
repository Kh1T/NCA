import Phaser from "phaser";
import { GROUND_Y, HEIGHT, PALETTE, TEXT, WIDTH, textStyle } from "../constants.js";
import { getCraters, preloadCraterImages } from "../data/nasa.js";
import { Viewfinder } from "../minigames/Viewfinder.js";
import { PHOTO, clockRate, coldRate } from "../sim/rules.js";
import { drawRover } from "../ui/art.js";
import { drawGround, drawHills, drawStars } from "../ui/backdrop.js";
import { ICON_COLOR } from "../ui/icons.js";
import { Layer, clearFocusFor, dialog } from "../ui/kit.js";
import { sfx } from "../ui/sfx.js";

const WORLD_W = 2140;
const ROVER_START = 110;
const ROCK_FIELD = 1230; // the rover cannot drive past here
const TARGET_X = [380, 720, 1060, 1500, 1880];
const WALK = 100;
const DRIVE = 210;
const JUMP = -150;

/**
 * Phase 3: the crater photo race on the far side. Drive the rover, hop out,
 * climb to each camera spot, frame the photo, and be back inside the rover
 * before the clock runs out. The far side is bitterly cold: the suit loses
 * heat faster the farther you are from the rover.
 */
export class PhotoMission extends Phaser.Scene {
  constructor() {
    super("PhotoMission");
  }

  get state() {
    return this.registry.get("state");
  }

  preload() {
    preloadCraterImages(this);
  }

  create() {
    this.events.once("shutdown", () => clearFocusFor(this));
    const state = this.state;
    this.timeLeft = PHOTO.TIME_SEC;
    this.heat = PHOTO.SUIT_HEAT;
    this.battery = state.roverBattery || PHOTO.ROVER_BATTERY_BASE;
    this.inRover = true;
    this.paused = true;
    this.ended = false;
    this.viewfinder = null;
    this.walkTarget = null;

    // The far side never sees Earth, so the sky has stars only.
    this.physics.world.setBounds(0, 0, WORLD_W, HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_W, HEIGHT);
    drawStars(this, { seed: "farside", maxY: GROUND_Y - 10, scroll: 0, count: 140 });
    drawHills(this, { width: WORLD_W, seed: "farside-hills", color: 0x2c2e33, scroll: 0.5 });
    drawGround(this, { width: WORLD_W, dark: true, seed: "farside-ground" });

    this.solids = this.physics.add.staticGroup();
    this.solids.add(this.add.rectangle(WORLD_W / 2, GROUND_Y + 30, WORLD_W, 60, 0, 0));
    // Ledges are one-way: jump up through them, walk under them, stand on top.
    // That way nobody can get walled in on the way back to the rover.
    const ledge = (x, y, w) => {
      const block = this.add.rectangle(x, y, w, 8, 0x3c3e44).setStrokeStyle(1, 0x6d7078);
      this.solids.add(block);
      block.body.checkCollision.down = false;
      block.body.checkCollision.left = false;
      block.body.checkCollision.right = false;
    };

    // Rock field: too rough for the rover, fine on foot.
    const rocks = this.add.graphics();
    rocks.fillStyle(0x2c2e33, 1);
    for (let x = ROCK_FIELD; x < ROCK_FIELD + 90; x += 18) rocks.fillTriangle(x, GROUND_Y, x + 9, GROUND_Y - 12 - (x % 7), x + 18, GROUND_Y);
    this.add.text(ROCK_FIELD + 45, GROUND_Y + 8, "TOO ROCKY FOR THE ROVER", textStyle(8, "#16181c")).setOrigin(0.5, 0);

    // Five camera spots, each on a ledge you have to climb.
    const craters = Phaser.Utils.Array.Shuffle([...getCraters(this)]).slice(0, PHOTO.TARGETS);
    this.targets = TARGET_X.map((x, i) => {
      const high = i % 2 === 1;
      // A stack of ledges that all overlap above x: stand there and jump
      // straight up, two or three times, to reach the flag.
      ledge(x - 18, GROUND_Y - 26, 56);
      if (high) ledge(x + 14, GROUND_Y - 56, 56);
      const topY = high ? GROUND_Y - 86 : GROUND_Y - 56;
      ledge(high ? x + 2 : x + 16, topY, 60);
      const spotX = x + 14;
      const g = this.add.graphics();
      const label = this.add.text(spotX, topY - 44, `PHOTO ${i + 1}`, textStyle(8, TEXT.accent)).setOrigin(0.5, 0);
      const target = { index: i, x: spotX, climbX: x, y: topY - 4, g, label, done: false, crater: craters[i] ?? { name: `Crater ${i + 1}`, nasaId: "none", kidFact: "", credit: "NASA", mission: "", link: null } };
      this.drawSpot(target);
      // Tap or click a flag to walk there and climb up.
      const hit = this.add.rectangle(spotX, topY - 20, 44, 48, 0, 0.001).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        if (!this.paused && !this.inRover) this.walkTarget = { x, climbTo: target.y };
        else if (!this.paused) this.walkTarget = { x: x - 40, climbTo: null };
      });
      return target;
    });

    this.rover = this.add.graphics().setDepth(8);
    this.roverX = ROVER_START;
    this.drawRover();

    this.player = this.physics.add.sprite(ROVER_START, GROUND_Y - 30, "astro-walk-1").setDepth(10).setVisible(false);
    this.player.body.setSize(14, 32).setOffset(17, 14);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.solids);
    this.player.body.enable = false;
    this.cameraSpot = this.add.rectangle(ROVER_START, GROUND_Y - 30, 2, 2, 0, 0);
    this.cameras.main.startFollow(this.cameraSpot, true, 0.12, 0.12, 0, 40);

    this.prompt = this.add.text(0, 0, "", textStyle(8, TEXT.accent, { backgroundColor: "#05060a", padding: { x: 3, y: 2 } })).setOrigin(0.5, 1).setDepth(20);
    this.prompt.setInteractive({ useHandCursor: true });
    this.prompt.on("pointerdown", () => this.interact());
    this.cold = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x6cc5ff, 0).setOrigin(0).setScrollFactor(0).setDepth(30);

    this.buildHud();
    this.keys = this.input.keyboard.addKeys({ left: "LEFT", right: "RIGHT", up: "UP", a: "A", d: "D", w: "W", space: "SPACE", e: "E", enter: "ENTER", h: "H" });
    this.input.on("pointerdown", (pointer, over) => {
      if (over.length === 0 && pointer.y > 60 && !this.paused) this.walkTarget = { x: pointer.worldX, climbTo: null };
    });

    dialog(this, {
      title: "PHASE 3: THE CRATER PHOTO RACE",
      body: `You have ${PHOTO.TIME_SEC} seconds. The far side is extremely cold!\n\nDRIVE: arrow keys. E: get out or in.\nOn foot, climb to each PHOTO flag and press E.\nYour suit loses heat faster the farther you walk. Warm up inside the rover.\n\nTake up to 5 photos, then be INSIDE the rover before time runs out. H in the rover: head home early.`,
      buttons: [{ label: "GO!", onClick: () => { this.paused = false; } }],
      width: 480,
    });
  }

  drawSpot(target) {
    const { g, x, y } = target;
    g.clear();
    const color = target.done ? PALETTE.good : PALETTE.accent;
    g.fillStyle(0x6b7384, 1);
    g.fillRect(x - 1, y - 26, 2, 26);
    g.fillStyle(color, 1);
    g.fillTriangle(x + 1, y - 26, x + 13, y - 21, x + 1, y - 16);
    if (target.done) {
      // A tick as well as the colour change.
      g.fillRect(x - 12, y - 22, 3, 3);
      g.fillRect(x - 9, y - 19, 3, 3);
      g.fillRect(x - 6, y - 22, 3, 3);
      target.label.setText("DONE").setColor(TEXT.good);
    }
  }

  drawRover() {
    this.rover.clear();
    drawRover(this.rover, this.roverX, GROUND_Y);
  }

  buildHud() {
    const H = (this.hud = new Layer(this, { depth: 100, fixed: true }));
    H.rect(0, 0, WIDTH, 44, 0x05060a, 0.92);
    H.text(5, 4, "TIME", { color: TEXT.muted });
    H.text(170, 4, "SUIT HEAT", { color: TEXT.muted });
    H.text(335, 4, "ROVER", { color: TEXT.muted });
    this.bars = H.gfx();
    this.timeText = H.text(155, 4, "", { origin: 1 });
    this.heatText = H.text(320, 4, "", { origin: 1 });
    this.batteryText = H.text(485, 4, "", { origin: 1 });
    this.photoText = H.text(635, 4, "", { origin: 1, color: TEXT.accent });
    this.doseText = H.text(635, 16, "", { origin: 1, color: TEXT.muted });
    this.guide = H.text(5, 31, "", { color: TEXT.good });
  }

  updateHud() {
    const g = this.bars;
    g.clear();
    const bar = (x, share, color, danger) => {
      g.fillStyle(0x232a36, 1);
      g.fillRect(x, 16, 150, 8);
      g.fillStyle(danger ? PALETTE.danger : color, 1);
      g.fillRect(x, 16, Math.round(150 * Phaser.Math.Clamp(share, 0, 1)), 8);
      if (danger) {
        g.fillStyle(0x05060a, 1);
        for (let nx = x + 3; nx < x + 150 * share; nx += 6) g.fillRect(nx, 16, 2, 8);
      }
    };
    bar(5, this.timeLeft / PHOTO.TIME_SEC, PALETTE.accent, this.timeLeft < 30);
    bar(170, this.heat / PHOTO.SUIT_HEAT, 0xff8c42, this.heat < 25);
    bar(335, this.battery / 100, ICON_COLOR.power, this.battery < 10);
    this.timeText.setText(`${Math.ceil(this.timeLeft)}s`);
    this.heatText.setText(this.heat <= 0 ? "COLD!" : `${Math.round(this.heat)}`);
    this.batteryText.setText(`${Math.round(this.battery)}%`);
    const state = this.state;
    this.photoText.setText(`PHOTOS ${state.photosTaken}/${PHOTO.TARGETS}`);
    this.doseText.setText(`DOSE ${state.doseMSv.toFixed(1)}/${state.doseLimit}`);

    let guide;
    if (this.inRover && state.photosTaken >= PHOTO.TARGETS) guide = "All 5 photos! You made it back.";
    else if (this.inRover && this.roverX > ROCK_FIELD - 80) guide = "The rover stops here. Go on foot (E), or press H to head home.";
    else if (this.inRover) guide = "Drive to a PHOTO flag, then press E to get out. H: head home.";
    else if (this.heat <= 0) guide = "Your suit is COLD! The clock is running fast. Get to the rover!";
    else if (this.heat < 35) guide = "Suit heat is low. Warm up inside the rover.";
    else if (state.photosTaken >= PHOTO.TARGETS) guide = "All 5 photos taken! Get back inside the rover (E).";
    else guide = "Climb to a PHOTO flag and press E. Stay close to the rover to stay warm.";
    this.guide.setText(guide).setColor(this.heat < 35 && !this.inRover ? TEXT.danger : TEXT.good);
    this.cold.setAlpha(this.inRover ? 0 : Phaser.Math.Clamp((40 - this.heat) / 40, 0, 1) * 0.28);
  }

  /** What E would do right now: 'exit', 'enter', a target, or null. */
  nearby() {
    if (this.inRover) return "exit";
    const onFloor = this.player.body.blocked.down;
    const spot = this.targets.find((t) => !t.done && Math.abs(this.player.x - t.x) < 24 && Math.abs(this.player.y + 22 - t.y) < 16 && onFloor);
    if (spot) return spot;
    // Close enough counts even from a low ledge right above the rover.
    if (Math.abs(this.player.x - this.roverX) < 34 && this.player.y > GROUND_Y - 70) return "enter";
    return null;
  }

  interact() {
    if (this.paused || this.ended) return;
    const near = this.nearby();
    if (!near) return;
    this.walkTarget = null;
    sfx("click");
    if (near === "exit") {
      this.inRover = false;
      this.player.body.enable = true;
      this.player.setPosition(this.exitSpot(), GROUND_Y - 24).setVisible(true).setVelocity(0, 0);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 40);
    } else if (near === "enter") {
      this.enterRover();
    } else {
      this.takePhoto(near);
    }
  }

  /** A clear patch of ground beside the rover, never inside a ledge. */
  exitSpot() {
    const clear = (x) => x > 20 && x < WORLD_W - 20 && !this.solids.getChildren().some((block) => block.height < 20 && Math.abs(block.x - x) < block.width / 2 + 10 && block.y > GROUND_Y - 40);
    return [30, -30, 56, -56, 84, -84].map((offset) => this.roverX + offset).find(clear) ?? this.roverX;
  }

  enterRover() {
    this.inRover = true;
    this.player.setVisible(false).setVelocity(0, 0);
    this.player.body.enable = false;
    this.cameraSpot.setPosition(this.roverX, GROUND_Y - 30);
    this.cameras.main.startFollow(this.cameraSpot, true, 0.12, 0.12, 0, 40);
    if (this.state.photosTaken >= PHOTO.TARGETS) this.finish("success", null);
  }

  takePhoto(target) {
    this.player.setVelocity(0, 0);
    this.player.anims.stop();
    // The clock keeps running while you frame the shot, and pauses for the reveal.
    this.viewfinder = new Viewfinder(this, target.crater, {
      onSnap: ({ stars }) => {
        const state = this.state;
        target.done = true;
        this.drawSpot(target);
        state.photosTaken += 1;
        state.photos.push({ name: target.crater.name, nasaId: target.crater.nasaId, stars });
        state.science += stars;
        state.log.push({ day: state.day, type: "photo", name: target.crater.name, stars });
        this.paused = true;
      },
      onClose: () => {
        this.viewfinder = null;
        this.paused = false;
      },
    });
  }

  headHome() {
    if (!this.inRover || this.paused || this.ended) return;
    const taken = this.state.photosTaken;
    this.paused = true;
    dialog(this, {
      title: "HEAD HOME?",
      body: `You have ${taken} of ${PHOTO.TARGETS} photos. Heading home now is safe, but you will not get the rest.`,
      buttons: [
        { label: "KEEP GOING", onClick: () => { this.paused = false; } },
        { label: "HEAD HOME", onClick: () => this.finish("partial", "returned") },
      ],
    });
  }

  finish(kind, cause) {
    if (this.ended) return;
    this.ended = true;
    const state = this.state;
    state.doseMSv = Math.round(state.doseMSv * 100) / 100;
    state.outcome = { kind, cause };
    state.log.push({ day: state.day, type: kind === "evacuated" ? "evacuated" : "mission-end", cause });
    this.viewfinder?.cleanup();
    if (kind === "evacuated") {
      sfx("bad");
      this.scene.start("Evacuated");
      return;
    }
    sfx("win");
    this.paused = true;
    dialog(this, {
      title: kind === "success" ? "ALL 5 PHOTOS!" : "SAFE IN THE ROVER",
      body: kind === "success"
        ? "You are back inside the rover with every photo. Sending the report to Mission Control through the relay satellite..."
        : `You are safe with ${state.photosTaken} photo${state.photosTaken === 1 ? "" : "s"}. Sending the report to Mission Control through the relay satellite...`,
      buttons: [{ label: "SEE DEBRIEF", onClick: () => this.scene.start("Debrief") }],
    });
  }

  update(time, delta) {
    const dt = delta / 1000;
    const k = this.keys;
    this.viewfinder?.update(dt);
    // During the photo reveal, a dialog, or the end, nothing moves.
    const framing = this.viewfinder && !this.viewfinder.snapped;
    if (this.ended || (this.paused && !framing)) {
      this.prompt.setVisible(false);
      for (const key of [k.e, k.enter, k.h, k.up, k.w, k.space]) Phaser.Input.Keyboard.JustDown(key);
      if (!this.inRover) this.player.setVelocityX(0);
      this.wasPaused = true;
      return;
    }
    if (this.wasPaused) {
      // The key that closed a pop-up must not also act in the world.
      for (const key of [k.e, k.enter, k.h, k.up, k.w, k.space]) Phaser.Input.Keyboard.JustDown(key);
      this.wasPaused = false;
    }

    const state = this.state;
    // The clock: faster when the suit has gone cold.
    this.timeLeft -= dt * (this.inRover ? 1 : clockRate(this.heat));
    if (this.inRover) {
      this.heat = Math.min(PHOTO.SUIT_HEAT, this.heat + PHOTO.WARM_RATE * dt);
    } else {
      this.heat = Math.max(0, this.heat - coldRate(this.player.x - this.roverX) * dt);
    }
    state.doseMSv += PHOTO.DOSE_PER_SEC * dt * (this.inRover ? 0.4 : 1);

    if (state.doseMSv > state.doseLimit) {
      this.finish("evacuated", "dose");
      return;
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.updateHud();
      if (this.inRover) this.finish(state.photosTaken >= PHOTO.TARGETS ? "success" : "partial", "returned");
      else this.finish("evacuated", "timer");
      return;
    }
    this.updateHud();
    if (framing) return;

    let direction = 0;
    if (k.left.isDown || k.a.isDown) direction = -1;
    else if (k.right.isDown || k.d.isDown) direction = 1;
    let jump = Phaser.Input.Keyboard.JustDown(k.up) || Phaser.Input.Keyboard.JustDown(k.w) || Phaser.Input.Keyboard.JustDown(k.space);
    if (direction !== 0 || jump) this.walkTarget = null;

    if (this.inRover) {
      if (this.walkTarget !== null && direction === 0) {
        const dx = this.walkTarget.x - this.roverX;
        if (Math.abs(dx) < 8) this.walkTarget = null;
        else direction = Math.sign(dx);
      }
      if (direction !== 0 && this.battery > 0) {
        const next = Phaser.Math.Clamp(this.roverX + direction * DRIVE * dt, 40, ROCK_FIELD - 30);
        this.battery = Math.max(0, this.battery - (Math.abs(next - this.roverX) / 100) * PHOTO.ROVER_COST_PER_100PX);
        if (next === this.roverX) this.walkTarget = null;
        this.roverX = next;
        this.cameraSpot.x = next;
        this.drawRover();
      }
      this.prompt.setText("E: GET OUT").setPosition(this.roverX, GROUND_Y - 44).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(k.h)) this.headHome();
    } else {
      const body = this.player.body;
      if (this.walkTarget !== null && direction === 0) {
        const dx = this.walkTarget.x - this.player.x;
        const climbTo = this.walkTarget.climbTo;
        if (Math.abs(dx) >= 6) direction = Math.sign(dx);
        else if (climbTo !== null && this.player.y + 22 > climbTo + 4) jump = body.blocked.down; // keep hopping up the ledges
        else this.walkTarget = null;
      }
      this.player.setVelocityX(direction * WALK);
      if (direction !== 0) {
        this.player.setFlipX(direction < 0);
        this.player.anims.play("astro-walk", true);
      } else {
        this.player.anims.stop();
      }
      if (jump && body.blocked.down) {
        this.player.setVelocityY(JUMP);
        sfx("jump");
      }
      const near = this.nearby();
      if (near) {
        const label = near === "enter" ? "E: GET IN THE ROVER" : "E: TAKE PHOTO";
        this.prompt.setText(label).setPosition(this.player.x, this.player.y - 30).setVisible(true);
      } else {
        this.prompt.setVisible(false);
      }
    }
    if (Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.enter)) this.interact();
  }
}
