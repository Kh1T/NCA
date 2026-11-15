// "Did you know?" cards, opened only when the player taps an "i" button.
// Each card: a big picture, a title, 1–3 short lines (12 words or fewer each),
// and an optional glossary term for READ MORE.
//
// art: { icon } draws a big pixel icon, { building } draws a finished building,
//      { ship: true } or { rover: true } draw those pictures.

export const INFO = {
  // ---- HUD meters ----
  "meter.power": {
    title: "Power", art: { icon: "power" },
    lines: ["Every machine needs electricity.", "Solar panels make it. Batteries store it."],
    glossary: "solar-panel",
  },
  "meter.oxygen": {
    title: "Oxygen", art: { icon: "oxygen" },
    lines: ["The part of air your body needs.", "We make it by splitting water."],
    glossary: "oxygen",
  },
  "meter.air": {
    title: "Clean air", art: { icon: "air" },
    lines: ["Breathing out makes air stale.", "The air cleaner cleans it.", "Clean air runs out first!"],
    glossary: "life-support",
  },
  "meter.food": {
    title: "Food", art: { icon: "food" },
    lines: ["Each bar is a day of meals.", "Greenhouse food takes 2 days to grow."],
    glossary: "greenhouse",
  },
  "meter.water": {
    title: "Water", art: { icon: "water" },
    lines: ["The crew drinks it. Plants and oxygen use it.", "The ship recycles water using power."],
    glossary: "water-ice",
  },
  "meter.shield": {
    title: "Shield", art: { icon: "shield" },
    lines: ["Thick walls block space radiation.", "The ship is your safest room."],
    glossary: "radiation",
  },
  "meter.dose": {
    title: "Radiation dose", art: { icon: "dose" },
    lines: ["How much radiation the crew soaked up.", "Keep it under the limit!"],
    glossary: "dose",
  },
  "meter.science": {
    title: "Science", art: { icon: "science" },
    lines: ["Points for discoveries.", "Good photos earn the most."],
    glossary: "science",
  },
  "meter.day": {
    title: "Mission days", art: { icon: "calendar" },
    lines: ["Each day you make one choice.", "The last days are the lunar night."],
  },

  // ---- Buildings and kits ----
  "item.solar": {
    title: "Solar array", art: { building: "solar" },
    lines: ["Turns sunlight into power.", "No sun means no power!"],
    glossary: "solar-panel",
  },
  "item.oxygen": {
    title: "Oxygen maker", art: { building: "oxygen" },
    lines: ["Splits water into oxygen and hydrogen.", "No water means no oxygen."],
    glossary: "oxygen",
  },
  "item.air": {
    title: "Air cleaner", art: { building: "air" },
    lines: ["Scrubs used breath out of the air.", "Space stations use one every day."],
    glossary: "life-support",
  },
  "item.greenhouse": {
    title: "Greenhouse", art: { building: "greenhouse" },
    lines: ["Grows fresh food under lamps.", "Plants need power, water and time."],
    glossary: "greenhouse",
  },
  "item.shield": {
    title: "Shield wall", art: { building: "shield" },
    lines: ["Piles of moon dirt block radiation.", "Work outside is safer behind it."],
    glossary: "regolith",
  },
  "item.rover": {
    title: "Rover", art: { rover: true },
    lines: ["A car for the Moon.", "It drives you to the far side craters."],
    glossary: "rover",
  },
  "item.battery": {
    title: "Battery pack", art: { icon: "battery" },
    lines: ["Saves power for later.", "Handy when the Sun is hidden."],
    glossary: "battery",
  },
  "item.spares": {
    title: "Spare parts", art: { icon: "wrench" },
    lines: ["Fix one broken machine at once.", "Wasted if nothing breaks."],
  },
  "item.foodpack": {
    title: "Food crate", art: { icon: "crate" },
    lines: ["Two extra days of meals.", "It never fails, but it runs out."],
  },

  // ---- Alerts ----
  "alert.flare": {
    title: "Solar flare", art: { icon: "sun" },
    lines: ["A sudden flash of energy from the Sun.", "Its radiation reaches the Moon in minutes."],
    glossary: "solar-flare",
  },
  "alert.storm": {
    title: "Particle storm", art: { icon: "dose" },
    lines: ["Super-fast bits of the Sun fly out.", "The strongest kind of space radiation."],
    glossary: "particle",
  },
  "alert.meteor": {
    title: "Micrometeorite", art: { icon: "rock" },
    lines: ["Tiny space rocks hit the Moon all the time.", "No air slows them down."],
    glossary: "meteoroid",
  },
  "alert.leak": {
    title: "Air leak", art: { icon: "leak" },
    lines: ["Outside is a vacuum: no air at all.", "Any crack lets air escape."],
    glossary: "vacuum",
  },
  "alert.dust": {
    title: "Moon dust", art: { icon: "dust" },
    lines: ["Moon dust is sharp and sticky.", "Apollo astronauts found it everywhere!"],
    glossary: "regolith",
  },
  "alert.temp": {
    title: "Cold snap", art: { icon: "cold" },
    lines: ["Moon shade can drop below -170 °C.", "Machines and plants need heat."],
    glossary: "moon",
  },
  "alert.plant": {
    title: "Sick plants", art: { icon: "leaf" },
    lines: ["Stressed plants grow less food.", "Water helps, but water is precious."],
    glossary: "greenhouse",
  },
  "alert.comms": {
    title: "Earth calling", art: { icon: "earth" },
    lines: ["Radio takes over a second each way.", "Earth is 384,000 km away!"],
    glossary: "radio-waves",
  },

  // ---- Places and missions ----
  "place.farside": {
    title: "The far side", art: { icon: "moon" },
    lines: ["The Moon always shows Earth the same face.", "The far side faces away from us."],
    glossary: "far-side",
  },
  "place.crater": {
    title: "Craters", art: { icon: "rock" },
    lines: ["Holes blasted out by space rocks.", "Some are older than the dinosaurs!"],
    glossary: "crater",
  },
  "mission.calm": {
    title: "Calm Sun", art: { icon: "moon" },
    lines: ["December 2019: the Sun was very quiet.", "Few storms. A good first mission!"],
    glossary: "sun",
  },
  "mission.busy": {
    title: "Busy Sun", art: { icon: "sun" },
    lines: ["July 2021: the Sun woke up.", "Real flares from NASA records will hit."],
    glossary: "solar-flare",
  },
  "mission.recent": {
    title: "This Month", art: { icon: "calendar" },
    lines: ["The newest space weather we saved.", "Real NASA records from recent days."],
    glossary: "space-weather",
  },
  "mission.storm": {
    title: "Solar Storm!", art: { icon: "dose" },
    lines: ["May 2024: the biggest storm in 20 years.", "Auroras were seen far from the poles!", "The hardest mission, with a long night."],
    glossary: "aurora-borealis",
  },
  "meter.night": {
    title: "Lunar night", art: { icon: "moon" },
    lines: ["A real Moon night lasts about 14 Earth days!", "No sun means no solar power.", "Charge the battery before dark."],
    glossary: "lunar-night",
  },
};

/** Look up a card. Unknown ids give a safe placeholder instead of crashing. */
export function infoFor(id) {
  return INFO[id] ?? { title: "Did you know?", art: { icon: "info" }, lines: ["More to learn soon!"] };
}
