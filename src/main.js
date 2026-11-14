import Phaser from "phaser";
import "@fontsource/press-start-2p";
import "./game.css";
import { HEIGHT, PALETTE, WIDTH } from "./constants.js";
import { Alert } from "./scenes/Alert.js";
import { Blueprints } from "./scenes/Blueprints.js";
import { Boot } from "./scenes/Boot.js";
import { Credits } from "./scenes/Credits.js";
import { DateSelect } from "./scenes/DateSelect.js";
import { Debrief } from "./scenes/Debrief.js";
import { Evacuated } from "./scenes/Evacuated.js";
import { Landing } from "./scenes/Landing.js";
import { Outpost } from "./scenes/Outpost.js";
import { OutpostUi } from "./scenes/OutpostUi.js";
import { PhotoMission } from "./scenes/PhotoMission.js";
import { RoverBuild } from "./scenes/RoverBuild.js";
import { Title } from "./scenes/Title.js";
import { UiTest } from "./scenes/UiTest.js";
import { WeatherDeck } from "./scenes/WeatherDeck.js";

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
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 260 }, debug: false },
  },
  scene: [
    Boot, Title, Blueprints, WeatherDeck, DateSelect, Landing, Outpost, OutpostUi, Alert, RoverBuild, PhotoMission,
    Evacuated, Debrief, Credits, UiTest,
  ],
});

// Handy for testing in the browser console and for automated play-throughs.
window.__outpost = game;

export default game;
