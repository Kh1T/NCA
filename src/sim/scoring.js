// Scoring and the debrief: outcome, stars, the "why" chain, and retry hints.
// Pure functions that read state and state.log.

import { ITEMS, REQUIRED } from "./buildings.js";
import { PHOTO, RESOURCES } from "./rules.js";

export const SCORE = {
  PER_DAY: 100,
  PER_PHOTO: 150,
  PER_SCIENCE: 10,
  PER_MSV_UNDER: 10,
  PER_LEFTOVER: 5,
  PER_FRAMING_STAR: 30,
  PER_GOOD_CALL: 50,
  STAR_GOOD_CALLS: 0.7,
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

/** How many of the day's choices were the best call for the situation. */
export function goodCalls(state) {
  const all = state.decisions ?? [];
  return { good: all.filter((d) => d.good).length, total: all.length };
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
    calls: goodCalls(state).good * SCORE.PER_GOOD_CALL,
    dose: Math.max(0, Math.round((state.doseLimit - state.doseMSv) * SCORE.PER_MSV_UNDER)),
    leftovers: Math.round(leftovers(state) * SCORE.PER_LEFTOVER),
  };
  const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
  return { total, parts };
}

/** Three goals, one star each. An evacuated mission earns none. */
export function starGoals(state) {
  const kind = outcomeKind(state);
  const calls = goodCalls(state);
  const goals = [
    { label: "Smart choices", icon: "star", met: calls.total > 0 && calls.good / calls.total >= SCORE.STAR_GOOD_CALLS },
    { label: "Low radiation", icon: "dose", met: state.doseMSv <= state.doseLimit * SCORE.STAR_DOSE_SHARE },
    { label: "Supplies left over", icon: "crate", met: leftovers(state) >= SCORE.STAR_LEFTOVERS },
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

const MAKER = { oxygen: "oxygen", air: "air", food: "greenhouse" };
const SUPPLY_NAME = { oxygen: "Oxygen", air: "Clean air", water: "Water", food: "Food" };

/** A short cause-and-effect chain: why the mission ended the way it did. */
export function causeChain(state) {
  const log = state.log;
  const cause = state.outcome?.cause;
  const kind = outcomeKind(state);
  const steps = [];
  const doneDay = (id) => log.find((e) => e.type === "build-done" && e.id === id)?.day ?? null;
  const alertsOf = (id) => log.filter((e) => e.type === "alert" && e.id === id);
  const endDay = log.find((e) => e.type === "evacuated")?.day ?? state.day;

  if (kind === "evacuated" && cause === "water") {
    steps.push("Power ran short, so the water recycler stopped.");
    if (state.stats.nightPowerOut > 0) steps.push("The battery ran flat in the night.");
    steps.push(`Water ran out on Day ${endDay}.`);
    steps.push("The crew retreated safely to the ISS.");
  } else if (kind === "evacuated" && MAKER[cause]) {
    const maker = MAKER[cause];
    const built = doneDay(maker);
    steps.push(`You landed with only a few days of ${SUPPLY_NAME[cause].toLowerCase()}.`);
    if (!state.buildings[maker].packed) steps.push(`No ${ITEMS[maker].name.toLowerCase()} was packed.`);
    else if (built === null) steps.push(`The ${ITEMS[maker].name.toLowerCase()} was not finished in time.`);
    else steps.push(`The ${ITEMS[maker].name.toLowerCase()} was only ready on Day ${built}.`);
    if (cause === "air" && alertsOf("leak").some((e) => e.option === "ignore")) steps.push("An air leak was left open.");
    if (cause === "food" && alertsOf("plant").length > 0) steps.push("Sick plants grew less food.");
    if (state.stats.nightPowerOut > 0) steps.push("The battery ran flat in the night.");
    else if (log.some((e) => e.type === "power-short")) steps.push("Power ran short, so machines stopped.");
    steps.push(`${SUPPLY_NAME[cause]} hit zero on Day ${endDay}.`);
    steps.push("The crew retreated safely to the ISS.");
  } else if (kind === "evacuated" && cause === "dose") {
    const worked = state.stats.flaresWorked;
    if (worked > 0) steps.push(`You kept working through ${worked} solar flare${worked > 1 ? "s" : ""}.`);
    if (state.stats.daysOutside > 0) steps.push(`The crew spent ${state.stats.daysOutside} days working outside.`);
    if (state.wallLevel === 0) steps.push("There was no shield wall to cut the dose.");
    steps.push(`The radiation dose passed the limit of ${state.doseLimit} mSv.`);
    steps.push("Mission Control called the crew back to the ISS.");
  } else if (kind === "partial") {
    const missing = REQUIRED.filter((id) => state.buildings[id].status !== "done").map((id) => ITEMS[id].name.toLowerCase());
    steps.push("You survived the lunar night!");
    if (missing.length > 0) steps.push(`Not built in time: ${missing.join(", ")}.`);
    if (state.photosTaken < PHOTO.TARGETS) steps.push(`You took ${state.photosTaken} of ${PHOTO.TARGETS} photos.`);
    steps.push("Finish everything before the night to win.");
  } else {
    const rover = doneDay("rover");
    steps.push(rover ? `The base and rover were ready by Day ${rover}.` : "The base and rover were built in time.");
    if (state.stats.shelters > 0) steps.push(`You hid from ${state.stats.shelters} solar flare${state.stats.shelters > 1 ? "s" : ""}.`);
    steps.push(`You photographed all ${PHOTO.TARGETS} craters.`);
    steps.push("Your power lasted through the lunar night!");
  }
  return steps;
}

/** One or two "try again" hints matched to how the mission went. */
export function retryHints(state) {
  const hints = [];
  const cause = state.outcome?.cause;
  if (cause === "air") hints.push("Clean air runs out first. Build the air cleaner early.");
  if (cause === "oxygen") hints.push("Build the oxygen maker early, and keep it powered.");
  if (cause === "water") hints.push("Charge up before night, so the water recycler keeps running.");
  if (cause === "food") hints.push("Food takes 2 days to grow. Build the greenhouse early.");
  if (cause === "dose") hints.push("Hide from flares. A slow day beats a big dose.");
  if (cause === "time") hints.push("Keep all 3 build slots busy, and take trips early.");
  if (state.stats.nightPowerOut > 0 && cause !== "water") hints.push("Pick CHARGE UP before night, or pack a battery.");
  if (hints.length === 0 && goodCalls(state).good < goodCalls(state).total) hints.push("Watch the arrows on the card: they show each choice's result.");
  if (hints.length === 0) hints.push("Try the Solar Storm for a bigger challenge.");
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
