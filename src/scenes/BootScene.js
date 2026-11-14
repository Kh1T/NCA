import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.on("loaderror", (file) => {
      console.warn(`Astropeer: failed to load ${file.src}`);
    });
  }

  create() {
    this.scene.start("MenuScene");
  }
}
