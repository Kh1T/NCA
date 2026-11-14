// Game state shape and creation. Plain data only, so it can be cloned and tested.

import { ITEMS } from "./buildings.js";
import { C } from "./rules.js";

/** @typedef {'spaceship'|'hab'|'shelter'|'outside'} CrewLocation */

/** Small seeded random generator. The seed lives in state so runs can be replayed. */
export function rand(state) {
  state.rngState = (state.rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(state.rngState ^ (state.rngState >>> 15), 1 | state.rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pick(state, list) {
  return list[Math.floor(rand(state) * list.length)];
}

/**
 * @param {object} options
 * @param {Record<string, number>} options.packed  item id -> how many were packed
 * @param {string[]} [options.weatherDeck]         alert ids the player allowed
 * @param {string} [options.missionDate]           ISO date, drives real events
 * @param {number} [options.totalDays]
 * @param {number} [options.seed]
 * @param {Record<number, object[]>} [options.schedule]  day -> events (see events.js)
 */
export function createState({
  packed,
  weatherDeck = [],
  missionDate = "2019-12-01",
  totalDays = 7,
  seed = 1,
  schedule = {},
  dateLabel = "Calm Sun",
}) {
  const buildings = {};
  for (const item of Object.values(ITEMS)) {
    if (item.kind !== "building") continue;
    buildings[item.id] = {
      packed: (packed[item.id] ?? 0) > 0,
      status: "idle", // 'idle' | 'building' | 'done'
      daysLeft: item.buildDays,
      on: true,
      health: 100,
      startedDay: null,
      doneDay: null,
    };
  }

  const batteries = packed.battery ?? 0;
  const foodpacks = packed.foodpack ?? 0;

  return {
    phase: 1, // 1 build, 2 rover, 3 photo race
    day: 1,
    totalDays,
    missionDate,
    dateLabel,
    power: C.START.power + batteries * 4,
    batteryCap: C.SHIP_BATTERY + batteries * C.BATTERY_PACK,
    oxygen: C.START.oxygen,
    air: C.START.air,
    food: C.START.food + foodpacks * 2,
    water: C.START.water, // all four are crew-days of supply
    shielding: "unlimited", // unlimited inside the ship; wallLevel covers work outside
    wallLevel: 0, // 0 none, 1 built, up to 3 with shield power
    wallWork: 0,
    doseMSv: 0,
    doseLimit: C.DOSE_LIMIT,
    science: 0,
    buildings,
    buildQueue: [], // max 3 active builds
    kits: { spares: packed.spares ?? 0, battery: batteries, foodpack: foodpacks },
    packed: { ...packed },
    crewLocation: "spaceship",
    effects: {
      dust: false,
      leak: false,
      nightDaysLeft: 0,
      nightGreenhouseOff: false,
      nightBuildOff: false,
      plantHealth: 1,
      plantSickDays: 0,
    },
    foodPipeline: [], // { day, amount }: greenhouse food arrives 2 days after planting
    zeroDays: { food: 0, water: 0 },
    today: freshToday(),
    eventsToday: [],
    weatherDeck: [...weatherDeck],
    schedule,
    photosTaken: 0,
    photos: [], // { name, stars }
    roverBattery: 0,
    outcome: null, // null while playing, else { kind, cause }
    stats: {
      daysSurvived: 0,
      shelters: 0,
      flaresWorked: 0,
      daysOutside: 0,
      daysRested: 0,
      powerShortDays: 0,
      foodGrown: 0,
      buildDelays: 0,
    },
    rngState: seed | 0,
    log: [], // feeds the debrief
  };
}

/** Modifiers that alerts add for the current day. Reset after each day. */
export function freshToday() {
  return { slow: 1, pause: false, eventDose: 0, extraPower: 0, causes: [] };
}

export function cloneState(state) {
  return structuredClone(state);
}
