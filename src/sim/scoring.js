// Scoring and the debrief: outcome, stars, the "why" chain, and retry hints.
// Pure functions that read state and state.log.

import { CORE, ITEMS } from "./buildings.js";
import { PHOTO, RESOURCES } from "./rules.js";

export const SCORE = {
  PER_DAY: 100,
  PER_PHOTO: 150,
  PER_SCIENCE: 10,
  PER_MSV_UNDER: 10,
  PER_LEFTOVER: 5,
  PER_FRAMING_STAR: 30,
  PER_DECK_CARD: 40,
  STAR_SCIENCE: 12,
  STAR_DOSE_SHARE: 0.6,
  STAR_LEFTOVERS: 8,
};

// Real comparison values, used in the debrief.
export const DOSE_FACTS = {
  CHEST_XRAY_MSV: 0.1, // NASA NTRS, everyday dose comparisons
  CAREER_LIMIT_MSV: 600, // NASA-STD-3001 radiation brief
  SPE_LIMIT_MSV: 250, // NASA limit for a single solar particle event, same brief
  MOON_DAY_MSV: 1.37, // Chang'e-4 LND, Zhang et al. 2020
};

export function leftovers(state) {
  return Math.round(RESOURCES.reduce((sum, key) => sum + state[key], 0) * 10) / 10;
}

export function framingStarTotal(state) {
  return state.photos.reduce((sum, photo) => sum + photo.stars, 0);
}

/** 'success' | 'partial' | 'evacuated' */
export function outcomeKind(state) {
  if (state.outcome?.kind === "evacuated") return "evacuated";
  if (state.outcome?.kind === "success" && state.photosTaken >= PHOTO.TARGETS) return "success";
  return "partial";
}

export function finalScore(state) {
  const parts = {
    days: state.stats.daysSurvived * SCORE.PER_DAY,
    photos: state.photosTaken * SCORE.PER_PHOTO,
    framing: framingStarTotal(state) * SCORE.PER_FRAMING_STAR,
    science: Math.round(state.science * SCORE.PER_SCIENCE),
    dose: Math.max(0, Math.round((state.doseLimit - state.doseMSv) * SCORE.PER_MSV_UNDER)),
    leftovers: Math.round(leftovers(state) * SCORE.PER_LEFTOVER),
    deck: state.weatherDeck.length * SCORE.PER_DECK_CARD,
  };
  const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
  return { total, parts };
}

/** Three goals, one star each. An evacuated mission earns none. */
export function starGoals(state) {
  const kind = outcomeKind(state);
  const goals = [
    { label: `Science score ${SCORE.STAR_SCIENCE} or more`, met: state.science + framingStarTotal(state) >= SCORE.STAR_SCIENCE },
    { label: "Radiation dose kept low", met: state.doseMSv <= state.doseLimit * SCORE.STAR_DOSE_SHARE },
    { label: "Supplies left over", met: leftovers(state) >= SCORE.STAR_LEFTOVERS },
  ];
  if (kind === "evacuated") for (const goal of goals) goal.met = false;
  let stars = goals.filter((goal) => goal.met).length;
  if (kind === "success") stars = Math.max(1, stars);
  return { stars, goals };
}

export function doseComparison(state) {
  const dose = Math.round(state.doseMSv * 10) / 10;
  return {
    dose,
    chestXrays: Math.round(dose / DOSE_FACTS.CHEST_XRAY_MSV),
    careerShare: Math.round((dose / DOSE_FACTS.CAREER_LIMIT_MSV) * 1000) / 10,
    lines: [
      `Your crew got ${dose} mSv. That is about ${Math.round(dose / DOSE_FACTS.CHEST_XRAY_MSV)} chest X-rays.`,
      `NASA's career limit is ${DOSE_FACTS.CAREER_LIMIT_MSV} mSv.`,
      `NASA limits one solar particle storm to ${DOSE_FACTS.SPE_LIMIT_MSV} mSv.`,
    ],
  };
}

/** When each building finished, and which weather delayed building. */
export function buildTimeline(state) {
  const done = state.log.filter((e) => e.type === "build-done").map((e) => ({ day: e.day, id: e.id, name: ITEMS[e.id].name }));
  const delays = state.log
    .filter((e) => e.type === "build-delay" && e.causes.length > 0)
    .map((e) => ({ day: e.day, causes: [...new Set(e.causes)], names: e.ids.map((id) => ITEMS[id].name) }));
  return { done, delays };
}

const MAKER = { oxygen: "oxygen", air: "air", water: "water", food: "greenhouse" };
const SUPPLY_NAME = { oxygen: "Oxygen", air: "Clean air", water: "Water", food: "Food" };

/** A short cause-and-effect chain: why the mission ended the way it did. */
export function causeChain(state) {
  const log = state.log;
  const cause = state.outcome?.cause;
  const kind = outcomeKind(state);
  const steps = [];
  const doneDay = (id) => log.find((e) => e.type === "build-done" && e.id === id)?.day ?? null;
  const alertsOf = (id) => log.filter((e) => e.type === "alert" && e.id === id);

  if (kind === "evacuated" && MAKER[cause]) {
    const maker = MAKER[cause];
    const built = doneDay(maker);
    const endDay = log.find((e) => e.type === "evacuated")?.day ?? state.day;
    steps.push(`You landed with only a few days of ${SUPPLY_NAME[cause].toLowerCase()}.`);
    if (!state.buildings[maker].packed) steps.push(`No ${ITEMS[maker].name.toLowerCase()} blueprint was packed.`);
    else if (built === null) steps.push(`The ${ITEMS[maker].name.toLowerCase()} was not finished in time.`);
    else steps.push(`The ${ITEMS[maker].name.toLowerCase()} was only ready on Day ${built}.`);
    if (cause === "oxygen" && log.some((e) => e.type === "no-water-for-oxygen")) steps.push("The oxygen generator had no water to split.");
    if (cause === "air" && alertsOf("leak").some((e) => e.option === "ignore")) steps.push("An air leak was left open.");
    if (cause === "air" && alertsOf("dust").some((e) => e.option === "leave")) steps.push("Moon dust was left clogging the air filter.");
    if (cause === "food" && alertsOf("plant").length > 0) steps.push("Sick plants grew less food.");
    if (log.some((e) => e.type === "power-short")) steps.push("Power ran short, so machines slowed down.");
    steps.push(`${SUPPLY_NAME[cause]} hit zero on Day ${endDay}.`);
    steps.push("The crew retreated safely to the ISS.");
  } else if (kind === "evacuated" && cause === "dose") {
    const worked = state.stats.flaresWorked;
    if (worked > 0) steps.push(`You kept working through ${worked} solar flare${worked > 1 ? "s" : ""}.`);
    if (state.stats.daysOutside > 0) steps.push(`The crew spent ${state.stats.daysOutside} days working outside.`);
    if (state.wallLevel === 0) steps.push("There was no shield wall to cut the dose outside.");
    steps.push(`The radiation dose passed the mission limit of ${state.doseLimit} mSv.`);
    steps.push("Mission Control called the crew back to the ISS.");
  } else if (kind === "evacuated" && cause === "timer") {
    steps.push(`You reached ${state.photosTaken} of ${PHOTO.TARGETS} photo spots.`);
    steps.push("The far side is very cold, and the suit lost its heat.");
    steps.push("Time ran out before you were back in the rover.");
    steps.push("A rescue flight took the crew to the ISS.");
  } else if (cause === "time") {
    const missing = [...CORE, "rover"].filter((id) => state.buildings[id].status !== "done").map((id) => ITEMS[id].name.toLowerCase());
    const delays = buildTimeline(state).delays;
    if (delays.length > 0) steps.push(`Building was slowed on ${delays.length} day${delays.length > 1 ? "s" : ""} (${[...new Set(delays.flatMap((d) => d.causes))].join(", ")}).`);
    steps.push(`Not finished in time: ${missing.join(", ")}.`);
    steps.push("The launch window to the far side closed.");
  } else if (kind === "partial") {
    steps.push(`You took ${state.photosTaken} of ${PHOTO.TARGETS} photos.`);
    steps.push("You headed back to the rover before the cold got dangerous.");
    steps.push("A safe return with some photos still counts.");
  } else {
    const rover = doneDay("rover");
    steps.push(rover ? `All six buildings and the rover were ready by Day ${rover}.` : "All six buildings and the rover were built in time.");
    if (state.stats.shelters > 0) steps.push(`You took shelter from ${state.stats.shelters} solar flare${state.stats.shelters > 1 ? "s" : ""}.`);
    steps.push(`You photographed all ${PHOTO.TARGETS} craters and made it back to the rover.`);
  }
  return steps;
}

/** One or two "try again" hints matched to how the mission went. */
export function retryHints(state) {
  const hints = [];
  const cause = state.outcome?.cause;
  const order = state.log.filter((e) => e.type === "build-start").map((e) => e.id);
  const last = order[order.length - 1];
  if (cause === "air") hints.push("Clean air runs out first. Build the air recycler early.");
  if (cause === "oxygen") hints.push("Start water first, then oxygen. The oxygen generator needs water.");
  if (cause === "water") hints.push("Start the water extractor on Day 1. Everything depends on it.");
  if (cause === "food") hints.push("Food takes 2 days to grow. Start the greenhouse early.");
  if (cause === "dose") hints.push("Hide from flares. A lost build day beats a big dose.");
  if (cause === "timer") hints.push("Warm up in the rover between photos, and head back sooner.");
  if (cause === "time") hints.push("Keep all 3 build slots busy, or pick a longer mission.");
  if (last === "greenhouse" && cause !== "food") hints.push("Start the greenhouse sooner, so food arrives in time.");
  if (state.stats.powerShortDays > 0) hints.push("Power ran short. Build the solar array first, or pack a battery.");
  if (hints.length === 0 && state.science < SCORE.STAR_SCIENCE) hints.push("For more stars, power science or pick Explore.");
  if (hints.length === 0) hints.push("Try a stormier date for a higher score.");
  return hints.slice(0, 3);
}

/** Pick the fact card that best matches how the player played. */
export function pickFactTag(state) {
  if (state.outcome?.cause === "dose" || state.stats.flaresWorked > 0) return "radiation";
  if (state.stats.foodGrown >= 3) return "plants";
  if (state.stats.daysRested >= 2) return "sleep";
  if (state.stats.daysOutside >= 4) return "bone";
  if (state.photosTaken > 0) return "muscle";
  return "immune";
}

/** The real solar events the mission dates contained, for the debrief list. */
export function realEventsSeen(state) {
  return state.log.filter((e) => e.type === "alert" && e.real).map((e) => ({ day: e.day, badge: e.badge, link: e.link, option: e.option }));
}
