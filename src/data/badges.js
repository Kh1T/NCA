// Badges the player can unlock. Pure data and rules: no Phaser here, so the
// tests can check every badge. To add one, add an object to BADGES.
//
// test({ state, when }) returns true when the badge is earned.
// when is "day" (after each day at the base) or "end" (the mission is over).

import { CORE } from "../sim/buildings.js";
import { outcomeKind } from "../sim/scoring.js";

const built = (state, id) => state.buildings[id]?.status === "done";
const won = (state) => outcomeKind(state) === "success";
const finished = (state) => Boolean(state.outcome) && outcomeKind(state) !== "evacuated";

export const BADGES = [
  { id: "first-build", icon: "build", title: "First Build", how: "Finish your first building.",
    test: ({ state }) => state.log.some((e) => e.type === "build-done") },
  { id: "base-builder", icon: "home", title: "Base Builder", how: "Finish all five base buildings.",
    test: ({ state }) => CORE.every((id) => built(state, id)) },
  { id: "rover-ready", icon: "rover", title: "Rover Ready", how: "Build the rover.",
    test: ({ state }) => built(state, "rover") },
  { id: "flare-dodger", icon: "ship", title: "Flare Dodger", how: "Hide from a solar flare.",
    test: ({ state }) => (state.stats?.shelters ?? 0) >= 1 },
  { id: "plant-whisperer", icon: "leaf", title: "Plant Whisperer", how: "Grow food 3 times.",
    test: ({ state }) => (state.stats?.foodGrown ?? 0) >= 3 },
  { id: "photographer", icon: "camera", title: "Photo Pro", how: "Take all 5 crater photos.",
    test: ({ state }) => (state.photosTaken ?? 0) >= 5 },
  { id: "perfect-shot", icon: "star", title: "Perfect Shot", how: "Take a 3-star photo.",
    test: ({ state }) => (state.photos ?? []).some((p) => p.stars >= 3) },
  { id: "science-star", icon: "science", title: "Science Star", how: "Finish with 20+ science.",
    test: ({ state, when }) => when === "end" && finished(state) && state.science >= 20 },
  { id: "low-dose", icon: "shield", title: "Low Dose Hero", how: "Win with a very low dose.",
    test: ({ state, when }) => when === "end" && won(state) && state.doseMSv <= state.doseLimit * 0.4 },
  { id: "nothing-broke", icon: "wrench", title: "Nothing Broke", how: "Win with no damage at all.",
    test: ({ state, when }) => when === "end" && won(state) && !state.log.some((e) => e.type === "damage") },
  { id: "quiet-sun", icon: "moon", title: "Quiet Sun", how: "Win the Calm Sun mission.",
    test: ({ state, when }) => when === "end" && won(state) && state.scenarioId === "calm-2019" },
  { id: "busy-sun", icon: "sun", title: "Busy Sun", how: "Win the Busy Sun mission.",
    test: ({ state, when }) => when === "end" && won(state) && state.scenarioId === "busy-2021" },
  { id: "storm-survivor", icon: "dose", title: "Storm Survivor", how: "Win the Solar Storm mission.",
    test: ({ state, when }) => when === "end" && won(state) && state.scenarioId === "gannon-2024" },
  { id: "up-to-date", icon: "calendar", title: "Up To Date", how: "Win the This Month mission.",
    test: ({ state, when }) => when === "end" && won(state) && state.scenarioId === "recent" },
  { id: "night-owl", icon: "moon", title: "Night Owl", how: "Get through the night with power left.",
    test: ({ state, when }) => when === "end" && finished(state) && (state.stats?.nightPowerOut ?? 0) === 0 },
  { id: "smart-chief", icon: "medal", title: "Smart Chief", how: "Make the best choice every day.",
    test: ({ state, when }) => when === "end" && won(state) && (state.decisions ?? []).length > 0 && state.decisions.every((d) => d.good) },
];

/** Badges earned right now that are not already unlocked. */
export function newlyEarned(state, when, unlocked = {}) {
  return BADGES.filter((badge) => !unlocked[badge.id] && badge.test({ state, when }));
}
