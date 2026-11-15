// The player's pre-mission choices, kept in the Phaser registry between scenes,
// and the step that turns them into a fresh game state.

import { BUDGETS, starterPlan } from "../sim/buildings.js";
import { DECK_CARDS, buildSchedule } from "../sim/events.js";
import { createState } from "../sim/state.js";
import { DATE_PRESETS, getDonki, missionStartDate } from "./nasa.js";
import { SCENARIOS, missionFromScenario, scenarioById } from "./scenarios.js";

export function defaultMission() {
  return {
    ...missionFromScenario(SCENARIOS[1], "medium"),
    packed: {},
    roll: Math.random(),
  };
}

export function getMission(scene) {
  let mission = scene.registry.get("mission");
  if (!mission) {
    mission = defaultMission();
    scene.registry.set("mission", mission);
  }
  return mission;
}

/** Replace the scenario settings but keep the last pack, so a retry is quick. */
export function setMission(scene, settings) {
  const old = scene.registry.get("mission");
  const mission = { ...settings, packed: old?.packed ?? {}, roll: Math.random() };
  scene.registry.set("mission", mission);
  return mission;
}

export function budgetOf(mission) {
  return mission.budget ?? BUDGETS[mission.difficulty] ?? BUDGETS.normal;
}

export function scenarioOf(mission) {
  return scenarioById(mission.scenarioId);
}

/** Build the starting state from the mission choices and the cached NASA data. */
export function startMission(scene) {
  const mission = getMission(scene);
  const file = getDonki(scene, mission.dateId);
  const missionDate = missionStartDate(file, mission.dateId, mission.totalDays, mission.roll);
  const seed = Math.floor(Math.random() * 2 ** 31);
  const deck = (mission.deck ?? []).filter((id) => DECK_CARDS.includes(id));
  const schedule = buildSchedule({
    donki: file, missionDate, totalDays: mission.totalDays, weatherDeck: deck, seed, maxEvents: mission.maxEvents ?? null,
  });
  const packed = Object.keys(mission.packed ?? {}).length > 0 ? mission.packed : starterPlan(budgetOf(mission));
  const state = createState({
    packed,
    weatherDeck: deck,
    missionDate,
    totalDays: mission.totalDays,
    seed,
    schedule,
    dateLabel: DATE_PRESETS.find((p) => p.id === mission.dateId)?.label ?? mission.dateId,
  });
  state.dateId = mission.dateId;
  state.scenarioId = mission.scenarioId;
  state.difficulty = mission.difficulty;
  state.mode = mission.mode ?? "real";
  scene.registry.set("state", state);
  return state;
}

const BEST_KEY = "outpost-best-score";

export function readBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Save the score if it is a new best. Returns true when it was. */
export function saveBest(score) {
  try {
    if (score > readBest()) {
      localStorage.setItem(BEST_KEY, String(score));
      return true;
    }
  } catch {
    // Storage blocked: no best score this visit.
  }
  return false;
}
