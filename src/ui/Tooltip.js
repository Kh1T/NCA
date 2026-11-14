import { HEIGHT, PALETTE, TEXT, WIDTH } from "../constants.js";
import { Layer, measure } from "./kit.js";

/** Every science word in the game, in one plain sentence. */
export const GLOSSARY = {
  Regolith: "The loose gray dust and rocks that cover the Moon.",
  "Solar flare": "A sudden burst of light and radiation from the Sun.",
  "Particle storm": "Fast particles from the Sun. The strongest kind of space radiation.",
  CME: "A giant cloud of gas the Sun throws into space.",
  Radiation: "Invisible energy that can hurt the body if you get too much.",
  Dose: "How much radiation a body has soaked up. Measured in mSv.",
  mSv: "Millisievert. The unit for a radiation dose. A chest X-ray is about 0.1.",
  "Far side": "The half of the Moon that always faces away from Earth.",
  "Relay satellite": "A satellite that passes radio messages around the Moon to Earth.",
  "Life support": "The machines that make air, oxygen and water for the crew.",
  "CO2 scrubber": "A machine that cleans used air so it is safe to breathe again.",
  Rover: "A car built to drive on the Moon.",
  Crater: "A bowl-shaped hole made when a space rock hits the ground.",
  ISS: "The International Space Station, a lab that circles Earth.",
  DONKI: "NASA's database of real space weather events.",
  Simplified: "Made easier than real life, so the game is quick to learn.",
};

/** One-line explanations for the HUD meters. */
export const METER_INFO = {
  power: ["Power", "Electricity for every machine. Solar panels make it. The battery stores it."],
  oxygen: ["Oxygen", "The part of air your body uses. Made by splitting water."],
  air: ["Clean air", "Air with the used breath cleaned out. It runs out first."],
  food: ["Food", "Days of meals left. Greenhouse food arrives 2 days after planting."],
  water: ["Water", "Days of water left. Oxygen and plants need it too."],
  shield: ["Shielding", "Protection from radiation. The ship is fully shielded. The wall protects work outside."],
  dose: ["Radiation dose", "How much radiation the crew has soaked up, in mSv. Stay under the limit."],
  science: ["Science", "Points for discoveries. Spend power on science or explore."],
};

/**
 * A small pop-up near x, y with a title and one sentence. It closes on any
 * click or key press. Returns the layer.
 */
export function showTooltip(scene, title, body, x = WIDTH / 2, y = 60) {
  scene.outpostTooltip?.destroy();
  const layer = new Layer(scene, { depth: 400, fixed: true });
  const width = 300;
  const left = Math.max(6, Math.min(WIDTH - width - 6, x - width / 2));
  const height = measure(scene, body, width - 16).height + 30;
  const top = Math.min(HEIGHT - height - 6, y);
  layer.panel(left, top, width, height, { edge: PALETTE.accent, alpha: 1 });
  layer.text(left + 8, top + 7, title.toUpperCase(), { color: TEXT.accent });
  layer.text(left + 8, top + 22, body, { wrap: width - 16 });
  scene.outpostTooltip = layer;

  const close = () => {
    if (scene.outpostTooltip === layer) scene.outpostTooltip = null;
    scene.input.off("pointerdown", close);
    scene.input.keyboard.off("keydown", close);
    layer.destroy();
  };
  // Wait a moment so the click that opened it does not also close it.
  scene.time.delayedCall(120, () => {
    if (scene.outpostTooltip !== layer) return;
    scene.input.once("pointerdown", close);
    scene.input.keyboard.once("keydown", close);
  });
  return layer;
}

/** The WORDS pop-up: the whole glossary on one or more pages. */
export function showGlossary(scene, onClose) {
  const layer = new Layer(scene, { depth: 320, fixed: true, keys: true });
  const words = Object.entries(GLOSSARY);
  const perPage = 6;
  const pages = Math.ceil(words.length / perPage);
  let page = 0;
  let pageLayer = null;
  layer.dim(0.75);
  layer.panel(40, 24, 560, 312, { edge: PALETTE.accent });
  layer.text(56, 36, "WORDS", { size: 16, color: TEXT.accent });
  const counter = layer.text(584, 42, "", { origin: 1, color: TEXT.muted });

  const draw = () => {
    pageLayer?.destroy();
    pageLayer = new Layer(scene, { depth: 321, fixed: true });
    words.slice(page * perPage, (page + 1) * perPage).forEach(([word, meaning], i) => {
      const y = 62 + i * 40;
      pageLayer.text(56, y, word.toUpperCase(), { color: TEXT.good });
      pageLayer.text(56, y + 12, meaning, { wrap: 528, color: TEXT.white });
    });
    counter.setText(`PAGE ${page + 1}/${pages}`);
  };
  const close = () => {
    pageLayer?.destroy();
    layer.destroy();
    onClose?.();
  };
  layer.button(120, 316, "< BACK", () => { page = (page - 1 + pages) % pages; draw(); }, { w: 96 });
  layer.button(230, 316, "MORE >", () => { page = (page + 1) % pages; draw(); }, { w: 96 });
  const closeButton = layer.button(520, 316, "CLOSE", close, { w: 96, key: "ESCAPE" });
  layer.focusFirst(closeButton);
  draw();
  return layer;
}
