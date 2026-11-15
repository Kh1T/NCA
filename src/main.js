import Phaser from "phaser";
import "@fontsource/jersey-15";
import "@fontsource/nunito/600.css";
import "./game.css";
import { HEIGHT, PALETTE, WIDTH } from "./constants.js";
import { Alert } from "./scenes/Alert.js";
import { Blueprints } from "./scenes/Blueprints.js";
import { Badges } from "./scenes/Badges.js";
import { Boot } from "./scenes/Boot.js";
import { HowTo } from "./scenes/HowTo.js";
import { Credits } from "./scenes/Credits.js";
import { Debrief } from "./scenes/Debrief.js";
import { Evacuated } from "./scenes/Evacuated.js";
import { Glossary } from "./scenes/Glossary.js";
import { Landing } from "./scenes/Landing.js";
import { Outpost } from "./scenes/Outpost.js";
import { OutpostUi } from "./scenes/OutpostUi.js";
import { PhotoMission } from "./scenes/PhotoMission.js";
import { Scenario } from "./scenes/Scenario.js";
import { Story } from "./scenes/Story.js";
import { Title } from "./scenes/Title.js";
import { UiTest } from "./scenes/UiTest.js";
import { findOverflow } from "./utils/overflow.js";

// Pixel art stays crisp (nearest sampling), but text is drawn at 2-4x and shrunk
// smoothly, so letters keep an even width at any window size.
const updateText = Phaser.GameObjects.Text.prototype.updateText;
Phaser.GameObjects.Text.prototype.updateText = function patched(...args) {
  const result = updateText.apply(this, args);
  this.texture?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return result;
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: PALETTE.sky,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Lets the glossary use a real text field for search (phone keyboards).
  dom: { createContainer: true },
  input: {
    // Room for two thumbs at once on a phone: move and jump.
    activePointers: 3,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 260 }, debug: false },
  },
  scene: [
    Boot, Title, Story, Scenario, HowTo, Blueprints, Landing, Outpost, OutpostUi, Alert, PhotoMission,
    Evacuated, Debrief, Credits, Glossary, Badges, UiTest,
  ],
});

// A long press on a phone must not open the browser's menu over the game.
document.addEventListener("contextmenu", (event) => event.preventDefault());

// The first touch anywhere turns on the on-screen buttons for the rest of the visit.
window.addEventListener("touchstart", () => game.registry.set("touchUsed", true), { passive: true, once: true });

// Handy for testing in the browser console and for automated play-throughs.
window.__outpost = game;
// Lists any text that spills out of its panel or button (see src/utils/overflow.js).
window.__overflow = () => findOverflow(game);

export default game;
