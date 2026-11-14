import Phaser from "phaser";
import {
  COLORS,
  FONT,
  HEIGHT,
  ROUND_SECONDS,
  START_HULL,
  WIDTH,
} from "../config.js";
import { readBestScore, saveBestScore } from "../utils/storage.js";
import { createButton } from "../ui/Button.js";
import { createStarfield } from "../ui/Starfield.js";

const PLAYER_SPEED = 330;
const PLAYER_RADIUS = 15;
const STAR_RADIUS = 8;
const HAZARD_RADIUS = 13;
const STAR_COUNT = 7;

export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    this.physics.resume();
    this.isGameOver = false;
    this.score = 0;
    this.hull = START_HULL;
    this.timeLeft = ROUND_SECONDS;
    this.invulnerable = false;
    this.lastPointerTarget = null;

    this.cameras.main.fadeIn(300, 5, 8, 16);
    createStarfield(this, { starCount: 80 });

    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    this.createPlayer();
    this.createGroups();
    this.createHud();
    this.bindInput();

    for (let i = 0; i < STAR_COUNT; i += 1) {
      this.spawnStar();
    }

    this.time.addEvent({
      delay: 1050,
      loop: true,
      callback: () => {
        if (!this.isGameOver) {
          this.spawnHazard();
        }
      },
    });

    this.roundTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickClock(),
    });
  }

  createPlayer() {
    this.playerGlow = this.add
      .circle(WIDTH / 2, HEIGHT / 2, PLAYER_RADIUS + 12, COLORS.cyan, 0.12)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.player = this.add
      .circle(WIDTH / 2, HEIGHT / 2, PLAYER_RADIUS, COLORS.cyan, 1)
      .setStrokeStyle(2, COLORS.white, 0.6)
      .setDepth(5);

    this.physics.add.existing(this.player);
    this.player.body.setCircle(PLAYER_RADIUS);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED);

    this.tweens.add({
      targets: this.playerGlow,
      scale: 1.35,
      alpha: 0.04,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  createGroups() {
    this.stars = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.hazards = this.physics.add.group({
      allowGravity: false,
      bounceX: 1,
      bounceY: 1,
      collideWorldBounds: true,
    });

    this.physics.add.overlap(this.player, this.stars, this.collectStar, undefined, this);
    this.physics.add.overlap(this.player, this.hazards, this.hitHazard, undefined, this);
  }

  createHud() {
    this.add
      .rectangle(0, 0, WIDTH, 58, COLORS.background, 0.82)
      .setOrigin(0)
      .setDepth(10);
    this.add
      .line(0, 0, 58, 0, WIDTH, COLORS.cyan, 0.35)
      .setOrigin(0)
      .setDepth(11);

    this.scoreLabel = this.add
      .text(24, 16, "SCORE", {
        fontFamily: FONT,
        fontSize: "11px",
        color: COLORS.muted,
      })
      .setDepth(12);

    this.scoreText = this.add
      .text(24, 28, "0000", {
        fontFamily: FONT,
        fontSize: "22px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setDepth(12);

    this.clockText = this.add
      .text(WIDTH / 2, 28, `${ROUND_SECONDS}`, {
        fontFamily: FONT,
        fontSize: "26px",
        color: COLORS.text,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(12);

    this.add
      .text(WIDTH / 2, 14, "TIME", {
        fontFamily: FONT,
        fontSize: "11px",
        color: COLORS.muted,
      })
      .setOrigin(0.5, 0)
      .setDepth(12);

    this.hullLabel = this.add
      .text(WIDTH - 24, 16, "HULL", {
        fontFamily: FONT,
        fontSize: "11px",
        color: COLORS.muted,
      })
      .setOrigin(1, 0)
      .setDepth(12);

    this.hullText = this.add
      .text(WIDTH - 24, 28, "", {
        fontFamily: FONT,
        fontSize: "22px",
        color: COLORS.pink,
        fontStyle: "bold",
      })
      .setOrigin(1, 0)
      .setDepth(12);

    this.updateHud();
  }

  bindInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  update() {
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.scene.restart();
      } else if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.scene.start("MenuScene");
      }
      return;
    }

    this.drivePlayer();
    this.playerGlow.setPosition(this.player.x, this.player.y);
  }

  drivePlayer() {
    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      x -= 1;
    }
    if (this.cursors.right.isDown || this.keys.D.isDown) {
      x += 1;
    }
    if (this.cursors.up.isDown || this.keys.W.isDown) {
      y -= 1;
    }
    if (this.cursors.down.isDown || this.keys.S.isDown) {
      y += 1;
    }

    const pointer = this.input.activePointer;

    if (x === 0 && y === 0 && pointer.isDown) {
      const dx = pointer.worldX - this.player.x;
      const dy = pointer.worldY - this.player.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 12) {
        x = dx / distance;
        y = dy / distance;
      }
    }

    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
    }

    this.player.body.setVelocity(x * PLAYER_SPEED, y * PLAYER_SPEED);
  }

  spawnStar() {
    const star = this.add
      .circle(0, 0, STAR_RADIUS, COLORS.gold, 1)
      .setStrokeStyle(2, COLORS.white, 0.55)
      .setDepth(4);

    this.physics.add.existing(star);
    star.body.setCircle(STAR_RADIUS);
    star.body.setAllowGravity(false);
    star.body.setImmovable(true);

    this.stars.add(star);
    this.positionStar(star);

    this.tweens.add({
      targets: star,
      scale: 1.18,
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    return star;
  }

  positionStar(star) {
    star.setPosition(
      Phaser.Math.Between(70, WIDTH - 70),
      Phaser.Math.Between(100, HEIGHT - 70),
    );

    if (
      this.player &&
      Phaser.Math.Distance.Between(star.x, star.y, this.player.x, this.player.y) < 110
    ) {
      this.positionStar(star);
    }
  }

  spawnHazard() {
    const hazard = this.add
      .circle(0, 0, HAZARD_RADIUS, COLORS.pink, 0.92)
      .setStrokeStyle(2, COLORS.danger, 0.9)
      .setDepth(4);

    this.physics.add.existing(hazard);
    hazard.body.setCircle(HAZARD_RADIUS);
    hazard.body.setAllowGravity(false);
    hazard.body.setCollideWorldBounds(true);
    hazard.body.setBounce(1);

    const edge = Phaser.Math.Between(0, 3);
    const margin = 30;

    if (edge === 0) {
      hazard.setPosition(Phaser.Math.Between(margin, WIDTH - margin), margin);
    } else if (edge === 1) {
      hazard.setPosition(WIDTH - margin, Phaser.Math.Between(margin, HEIGHT - margin));
    } else if (edge === 2) {
      hazard.setPosition(Phaser.Math.Between(margin, WIDTH - margin), HEIGHT - margin);
    } else {
      hazard.setPosition(margin, Phaser.Math.Between(margin, HEIGHT - margin));
    }

    const angle = Phaser.Math.Angle.Between(
      hazard.x,
      hazard.y,
      WIDTH / 2 + Phaser.Math.Between(-120, 120),
      HEIGHT / 2 + Phaser.Math.Between(-80, 80),
    );
    const speed = Phaser.Math.Between(70, 125);

    hazard.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.hazards.add(hazard);

    this.tweens.add({
      targets: hazard,
      alpha: 0.45,
      duration: Phaser.Math.Between(350, 650),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  collectStar(player, star) {
    if (this.isGameOver) {
      return;
    }

    star.disableBody(true, true);
    this.score += 10;
    this.updateHud();

    this.tweens.add({
      targets: this.playerGlow,
      scale: 1.7,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeOut",
    });

    this.time.delayedCall(220, () => {
      if (!this.isGameOver) {
        this.spawnStar();
      }
    });
  }

  hitHazard() {
    if (this.isGameOver || this.invulnerable) {
      return;
    }

    this.hull -= 1;
    this.updateHud();
    this.cameras.main.shake(220, 0.008);
    this.cameras.main.flash(160, 255, 77, 141, false);

    this.invulnerable = true;
    this.tweens.add({
      targets: [this.player, this.playerGlow],
      alpha: 0.15,
      duration: 90,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.player.setAlpha(1);
        this.playerGlow.setAlpha(1);
      },
    });

    this.time.delayedCall(1300, () => {
      this.invulnerable = false;
    });

    if (this.hull <= 0) {
      this.endRun("HULL BREACH");
    }
  }

  tickClock() {
    if (this.isGameOver) {
      return;
    }

    this.timeLeft -= 1;
    this.updateHud();

    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.updateHud();
      this.endRun("TIME UP");
    }
  }

  updateHud() {
    this.scoreText.setText(this.score.toString().padStart(4, "0"));
    this.clockText.setText(this.timeLeft.toString().padStart(2, "0"));
    this.clockText.setColor(this.timeLeft <= 10 ? "#ff5d5d" : COLORS.text);
    this.hullText.setText("\u2665".repeat(Math.max(0, this.hull)));
  }

  endRun(reason) {
    if (this.isGameOver) {
      return;
    }

    this.isGameOver = true;
    this.player.body.setVelocity(0, 0);
    this.physics.pause();
    this.roundTimer.remove();

    this.stars.children.each((star) => star.disableBody(true, true));
    this.hazards.children.each((hazard) => hazard.disableBody(true, true));

    this.cameras.main.flash(180, 255, 255, 255, false);

    const previousBest = readBestScore();
    const best = saveBestScore(this.score);
    const isNewBest = this.score > previousBest;

    const overlay = this.add
      .rectangle(0, 0, WIDTH, HEIGHT, 0x02040a, 0.78)
      .setOrigin(0)
      .setDepth(30)
      .setInteractive();

    const panel = this.add
      .rectangle(WIDTH / 2, HEIGHT / 2 + 8, 580, 360, COLORS.panel, 0.98)
      .setStrokeStyle(2, COLORS.cyan, 0.55)
      .setDepth(31);

    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 122, reason, {
        fontFamily: FONT,
        fontSize: "38px",
        color: "#4de2ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(32)
      .setShadow(0, 0, "#4de2ff", 18, true, true);

    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 72, `SCORE  ${this.score.toString().padStart(4, "0")}`, {
        fontFamily: FONT,
        fontSize: "22px",
        color: COLORS.text,
      })
      .setOrigin(0.5)
      .setDepth(32);

    this.add
      .text(
        WIDTH / 2,
        HEIGHT / 2 - 38,
        isNewBest ? "NEW PERSONAL BEST" : `BEST  ${best.toString().padStart(4, "0")}`,
        {
          fontFamily: FONT,
          fontSize: "14px",
          color: isNewBest ? "#ffd166" : COLORS.muted,
        },
      )
      .setOrigin(0.5)
      .setDepth(32);

    createButton(this, WIDTH / 2 - 132, HEIGHT / 2 + 62, "PLAY AGAIN", () => {
      this.scene.restart();
    }, { width: 230, height: 56, fontSize: 18 });

    createButton(this, WIDTH / 2 + 132, HEIGHT / 2 + 62, "MAIN MENU", () => {
      this.scene.start("MenuScene");
    }, { width: 230, height: 56, fontSize: 18, accent: COLORS.pink });

    const retry = this.add
      .text(WIDTH / 2, HEIGHT / 2 + 122, "ENTER TO RETRY   \u00b7   ESC FOR MENU", {
        fontFamily: FONT,
        fontSize: "12px",
        color: COLORS.muted,
      })
      .setOrigin(0.5)
      .setDepth(32);

    [overlay, panel, retry].forEach((item) => item.setAlpha(0));
    this.tweens.add({
      targets: [overlay, panel, retry],
      alpha: { from: 0, to: 1 },
      duration: 260,
      ease: "Sine.easeOut",
    });
  }
}
