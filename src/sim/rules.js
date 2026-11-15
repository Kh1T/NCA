// The daily rules of the outpost. Pure functions: no Phaser here.
// All numbers are simplified game values, not mission data. The one real
// anchor is the Moon surface dose rate (see BASE_DOSE).

import { BUILD_ORDER, CORE, ITEMS, activeBuilds, canStartBuild, coreDone, startBuild } from "./buildings.js";
import { cloneState, createState, freshToday } from "./state.js";

export const C = {
  CAP: 10, // most crew-days of any supply the tanks can hold
  CREW_USE: 1, // crew-days used per day
  REST_USE: 0.8, // a resting crew breathes and eats a little less
  START: { oxygen: 6, air: 4.5, water: 5, food: 7, power: 6 },
  SHIP_BATTERY: 8,
  BATTERY_PACK: 8,
  SHIP_TRICKLE: 2, // the ship's own small power supply, per day
  SOLAR_OUT: 7,
  BUILD_POWER: 1, // per active build, per day
  LIFE_NEED: { oxygen: 2, air: 1, water: 2 },
  GREENHOUSE_NEED: 2,
  SHIELD_MAX: 3,
  SCIENCE_MAX: 3,
  WALL_WORK_PER_LEVEL: 3,
  OUT: { oxygen: 1.6, air: 1.5, water: 1.9, food: 1.7 },
  WATER_USE: { oxygen: 0.3, greenhouse: 0.3, tending: 0.3 },
  FOOD_DELAY: 2,
  TEND_BONUS: 1.5,
  LEAK_LOSS: 0.8,
  DUST_SUN: 0.5,
  DUST_AIR: 0.7,
  DAMAGED_OUTPUT: 0.5,
  // Real anchor: Chang'e-4 LND measured 1,369 microsieverts per day on the
  // Moon's surface (Zhang et al. 2020, Science Advances).
  BASE_DOSE: 1.37,
  DOSE_LIMIT: 22, // game mission limit in mSv, simplified
  SHIP_FACTOR: 0.3,
  WALL_FACTOR: [1.0, 0.7, 0.6, 0.5],
  SHELTER_FACTOR: 0.3,
  SHIELD_ON_FACTOR: 0.1,
  SHIELD_ON_POWER: 3,
  OUTSIDE_FACTOR: 1.5,
  EXPLORE_SCIENCE: 3,
  REPAIR_POWER: 1,
  EXPLORE_POWER: 1,
  LOW_SUPPLY: 1.5,
};

export const RESOURCES = ["oxygen", "air", "water", "food"];
export const ALLOC_KEYS = ["life", "greenhouse", "shield", "science"];
export const ACTIONS = {
  work: { label: "Build", icon: "build", gain: [["build", "FAST"]], cost: [["dose", "MORE"]] },
  rest: { label: "Rest", icon: "crew", gain: [["dose", "LESS"], ["air", "SAVE"]], cost: [["build", "SLOW"]] },
  repair: { label: "Repair", icon: "wrench", gain: [["wrench", "FIX 1"]], cost: [["power", "-1"]] },
  explore: { label: "Explore", icon: "camera", gain: [["science", "+3"]], cost: [["power", "-1"], ["dose", "MORE"]] },
  grow: { label: "Grow", icon: "leaf", gain: [["food", "+50%"]], cost: [["water", "MORE"]] },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round2 = (value) => Math.round(value * 100) / 100;

function running(state, id) {
  const building = state.buildings[id];
  return Boolean(building && building.status === "done" && building.on);
}

function healthFactor(state, id) {
  return state.buildings[id].health < 100 ? C.DAMAGED_OUTPUT : 1;
}

export function sunFactor(state) {
  if (state.effects.nightDaysLeft > 0) return 0;
  return state.effects.dust ? C.DUST_SUN : 1;
}

/** Power each slider group can use today at full output. */
export function powerNeeds(state) {
  const life = Object.entries(C.LIFE_NEED).reduce((sum, [id, need]) => sum + (running(state, id) ? need : 0), 0);
  const greenhouseOff = state.effects.nightDaysLeft > 0 && state.effects.nightGreenhouseOff;
  return {
    life,
    greenhouse: running(state, "greenhouse") && !greenhouseOff ? C.GREENHOUSE_NEED : 0,
    shield: running(state, "shield") && state.wallLevel < 3 ? C.SHIELD_MAX : 0,
    science: C.SCIENCE_MAX,
  };
}

export function powerIn(state) {
  const solar = running(state, "solar") ? C.SOLAR_OUT * sunFactor(state) * healthFactor(state, "solar") : 0;
  return round2(solar + C.SHIP_TRICKLE);
}

function buildsPaused(state) {
  return state.today.pause || (state.effects.nightDaysLeft > 0 && state.effects.nightBuildOff);
}

export function buildPower(state) {
  return buildsPaused(state) ? 0 : activeBuilds(state).length * C.BUILD_POWER;
}

/** Power the sliders may share out today: stored + today's sunlight - builds. */
export function powerBudget(state) {
  return Math.max(0, Math.floor(state.power + powerIn(state) - buildPower(state) - state.today.extraPower));
}

/** Trim a slider plan so no group exceeds its need and the total fits the budget. */
export function clampAlloc(state, alloc) {
  const needs = powerNeeds(state);
  const result = {};
  let left = powerBudget(state);
  for (const key of ALLOC_KEYS) {
    const want = clamp(Math.floor(alloc?.[key] ?? 0), 0, needs[key]);
    result[key] = Math.min(want, left);
    left -= result[key];
  }
  return result;
}

export function wallFactor(state) {
  return C.WALL_FACTOR[state.wallLevel] ?? 1;
}

/** Which thing a Repair action would fix first, or null. */
export function repairTarget(state) {
  if (state.effects.leak) return { kind: "leak", label: "the air leak" };
  const damaged = Object.keys(state.buildings).find((id) => state.buildings[id].health < 100);
  if (damaged) return { kind: "building", id: damaged, label: `the ${ITEMS[damaged].name.toLowerCase()}` };
  if (state.effects.dust) return { kind: "dust", label: "the dusty panels" };
  return null;
}

/** Fix one thing. Shared by the Repair action and the spare parts kit. */
export function applyRepair(state) {
  const target = repairTarget(state);
  if (!target) return null;
  if (target.kind === "leak") state.effects.leak = false;
  if (target.kind === "building") state.buildings[target.id].health = 100;
  if (target.kind === "dust") state.effects.dust = false;
  state.log.push({ day: state.day, type: "repair", target: target.label });
  return target;
}

/** Use a spare parts kit: an instant repair that does not cost the day's action. */
export function useSpareKit(state) {
  if (state.kits.spares <= 0 || !repairTarget(state)) return null;
  state.kits.spares -= 1;
  return applyRepair(state);
}

/**
 * Run one day. Returns a new state and a report for the day summary.
 * @param {object} state
 * @param {{alloc?: Record<string, number>, action?: string}} plan
 */
export function advanceDay(state, plan = {}) {
  const s = cloneState(state);
  const before = cloneState(state);
  const action = ACTIONS[plan.action] ? plan.action : "work";
  const notes = [];
  const night = s.effects.nightDaysLeft > 0;
  const paused = buildsPaused(s);
  const active = activeBuilds(s);
  // Buildings running this morning produce today, powered by the sliders.
  const on = Object.fromEntries(Object.keys(s.buildings).map((id) => [id, running(s, id)]));

  // 1-4. Power: sunlight in, sliders and builds out, cut in a fixed order if short.
  let alloc = clampAlloc(s, plan.alloc);
  let actionPower = 0;
  if (action === "repair" && repairTarget(s)) actionPower = C.REPAIR_POWER;
  if (action === "explore") actionPower = C.EXPLORE_POWER;
  const income = powerIn(s);
  let buildCost = paused ? 0 : active.length * C.BUILD_POWER;
  const available = s.power + income;
  let wanted = alloc.life + alloc.greenhouse + alloc.shield + alloc.science + buildCost + actionPower + s.today.extraPower;
  let buildsUnpowered = false;
  if (wanted > available + 0.001) {
    // Science goes first and life support last, so the crew keeps breathing.
    let shortBy = wanted - available;
    for (const key of ["science", "shield", "greenhouse"]) {
      const cut = Math.min(alloc[key], Math.ceil(shortBy));
      alloc[key] -= cut;
      shortBy -= cut;
      if (shortBy <= 0) break;
    }
    if (shortBy > 0 && buildCost > 0) {
      shortBy -= buildCost;
      buildCost = 0;
      buildsUnpowered = true;
    }
    if (shortBy > 0) alloc.life = Math.max(0, alloc.life - Math.ceil(shortBy));
    wanted = alloc.life + alloc.greenhouse + alloc.shield + alloc.science + buildCost + actionPower + s.today.extraPower;
    s.stats.powerShortDays += 1;
    s.log.push({ day: s.day, type: "power-short" });
    notes.push("Not enough power: some systems switched off.");
  }
  s.power = round2(clamp(available - wanted, 0, s.batteryCap));

  // Builds move forward. Weather, resting and the long shadow slow them.
  let slow = s.today.slow * (action === "rest" ? 0.5 : 1) * (night ? 0.5 : 1);
  if (paused || buildsUnpowered) slow = 0;
  const completed = [];
  for (const id of active) {
    const building = s.buildings[id];
    building.daysLeft = round2(building.daysLeft - slow);
    if (building.daysLeft <= 0.01) {
      building.status = "done";
      building.daysLeft = 0;
      building.doneDay = s.day;
      completed.push(id);
      s.log.push({ day: s.day, type: "build-done", id });
      if (id === "shield") s.wallLevel = Math.max(s.wallLevel, 1);
    }
  }
  s.buildQueue = s.buildQueue.filter((id) => s.buildings[id].status === "building");
  if (active.length > 0 && slow < 1) {
    s.stats.buildDelays += 1;
    s.log.push({ day: s.day, type: "build-delay", ids: active, causes: [...s.today.causes, ...(action === "rest" ? ["resting"] : []), ...(night ? ["the long shadow"] : []), ...(buildsUnpowered ? ["no power"] : [])] });
  }

  // 5. Supplies: the crew uses them, the machines refill them.
  const needs = powerNeeds({ ...s, buildings: before.buildings });
  const sliderEff = needs.life > 0 ? Math.min(1, alloc.life / needs.life) : 0;
  // A building that finishes today does a free full-power test run the same day.
  const fresh = (id) => completed.includes(id) && s.buildings[id].on;
  const eff = (id) => (fresh(id) ? 1 : on[id] ? sliderEff : 0);
  const greenhouseDark = night && s.effects.nightGreenhouseOff;
  const greenEff = greenhouseDark ? 0 : fresh("greenhouse") ? 1 : on.greenhouse && needs.greenhouse > 0 ? Math.min(1, alloc.greenhouse / needs.greenhouse) : 0;
  const use = action === "rest" ? C.REST_USE : C.CREW_USE;

  s.water -= C.CREW_USE;
  s.water += C.OUT.water * eff("water") * healthFactor(s, "water");
  s.water = Math.max(0, s.water);

  s.oxygen -= use;
  if (eff("oxygen") > 0) {
    if (s.water > 0) {
      s.oxygen += C.OUT.oxygen * eff("oxygen") * healthFactor(s, "oxygen");
      s.water = Math.max(0, s.water - C.WATER_USE.oxygen * eff("oxygen"));
    } else {
      notes.push("The oxygen generator had no water, so it made nothing.");
      s.log.push({ day: s.day, type: "no-water-for-oxygen" });
    }
  }

  s.air -= C.CREW_USE;
  s.air += C.OUT.air * eff("air") * healthFactor(s, "air") * (s.effects.dust ? C.DUST_AIR : 1);
  if (s.effects.leak) s.air -= C.LEAK_LOSS;

  s.food -= use;
  if (greenEff > 0) {
    if (s.water > 0) {
      const tending = action === "grow";
      const planted = C.OUT.food * greenEff * s.effects.plantHealth * healthFactor(s, "greenhouse") * (tending ? C.TEND_BONUS : 1);
      s.water = Math.max(0, s.water - C.WATER_USE.greenhouse * greenEff - (tending ? C.WATER_USE.tending : 0));
      s.foodPipeline.push({ day: s.day + C.FOOD_DELAY, amount: round2(planted) });
    } else {
      notes.push("The greenhouse had no water, so nothing was planted.");
    }
  }
  const arriving = s.foodPipeline.filter((batch) => batch.day <= s.day);
  s.foodPipeline = s.foodPipeline.filter((batch) => batch.day > s.day);
  for (const batch of arriving) {
    s.food += batch.amount;
    s.stats.foodGrown = round2(s.stats.foodGrown + batch.amount);
  }
  if (arriving.length > 0) notes.push("Fresh food arrived from the greenhouse.");

  for (const key of RESOURCES) s[key] = round2(clamp(s[key], 0, C.CAP));

  // 6. Radiation: the ship shields well, work outside does not.
  const worksOutside = active.length > 0 && !paused && action !== "rest";
  const outside = action === "explore" || worksOutside ? 0.5 : action === "rest" ? 0 : 0.1;
  const baseDose = C.BASE_DOSE * ((1 - outside) * C.SHIP_FACTOR + outside * wallFactor(s) * C.OUTSIDE_FACTOR);
  s.doseMSv = round2(s.doseMSv + baseDose + s.today.eventDose);
  if (outside >= 0.5) s.stats.daysOutside += 1;
  if (action === "rest") s.stats.daysRested += 1;
  s.crewLocation = outside >= 0.5 ? "outside" : "spaceship";

  // 7. Science and the shield wall.
  const antenna = on.antenna || fresh("antenna") ? 2 : 1;
  s.science = round2(s.science + alloc.science * antenna + (action === "explore" ? C.EXPLORE_SCIENCE : 0));
  if (alloc.shield > 0 && on.shield) {
    s.wallWork += alloc.shield;
    const level = Math.min(3, 1 + Math.floor(s.wallWork / C.WALL_WORK_PER_LEVEL));
    if (level > s.wallLevel) {
      s.wallLevel = level;
      notes.push(`The shield wall is thicker now (level ${level} of 3).`);
    }
  }
  if (action === "repair") {
    const fixed = applyRepair(s);
    notes.push(fixed ? `You repaired ${fixed.label}.` : "Nothing needed repair today.");
  }

  // Effects that tick down.
  if (s.effects.nightDaysLeft > 0) {
    s.effects.nightDaysLeft -= 1;
    if (s.effects.nightDaysLeft === 0) {
      s.effects.nightGreenhouseOff = false;
      s.effects.nightBuildOff = false;
      notes.push("The long shadow has passed. Sunlight is back.");
    }
  }
  if (s.effects.plantSickDays > 0) {
    s.effects.plantSickDays -= 1;
    if (s.effects.plantSickDays === 0) s.effects.plantHealth = 1;
  }
  s.effects.plantHealth = clamp(s.effects.plantHealth, 0.2, 1);

  // Phase 2 opens when all six buildings stand.
  if (s.phase === 1 && coreDone(s)) {
    s.phase = 2;
    s.log.push({ day: s.day, type: "phase", phase: 2 });
  }

  // 8. Lose checks. Nobody dies: the crew retreats to the ISS.
  s.zeroDays.food = s.food <= 0 ? s.zeroDays.food + 1 : 0;
  s.zeroDays.water = s.water <= 0 ? s.zeroDays.water + 1 : 0;
  const cause = loseCause(s);
  s.stats.daysSurvived = s.day;
  if (cause) {
    s.outcome = { kind: "evacuated", cause };
    s.log.push({ day: s.day, type: "evacuated", cause });
  } else if (s.day >= s.totalDays && s.buildings.rover.status !== "done") {
    s.outcome = { kind: "partial", cause: "time" };
    s.log.push({ day: s.day, type: "out-of-time" });
  }

  const changes = {};
  for (const key of ["power", ...RESOURCES, "doseMSv", "science"]) changes[key] = round2(s[key] - before[key]);

  s.log.push({ day: s.day, type: "day-end", action, power: s.power, oxygen: s.oxygen, air: s.air, water: s.water, food: s.food, dose: s.doseMSv });
  s.today = freshToday();
  s.eventsToday = [];
  s.day += 1;

  return { state: s, report: { day: before.day, action, alloc, completed, notes, changes, income } };
}

export function loseCause(state) {
  // Clean air is checked first: it is the supply that fails fastest.
  if (state.air <= 0) return "air";
  if (state.oxygen <= 0) return "oxygen";
  if (state.zeroDays.water >= 2) return "water";
  if (state.zeroDays.food >= 2) return "food";
  if (state.doseMSv > state.doseLimit) return "dose";
  return null;
}

/** True when the rover is built and the photo race can start. */
export function canLaunch(state) {
  return state.buildings.rover.status === "done" && !state.outcome;
}

/**
 * The one sentence that says what matters most right now (the guide line).
 * focus names the thing the HUD should pulse.
 */
export function guideLine(state) {
  const fix = repairTarget(state);
  if (fix && fix.kind !== "dust") return { text: `Something is broken! Fix ${fix.label}.`, focus: fix.id ?? "air" };
  const low = RESOURCES.filter((key) => state[key] <= C.LOW_SUPPLY).sort((a, b) => state[a] - state[b])[0];
  if (low) {
    const names = { oxygen: "Oxygen", air: "Clean air", water: "Water", food: "Food" };
    const maker = { oxygen: "oxygen", air: "air", water: "water", food: "greenhouse" }[low];
    const building = state.buildings[maker];
    if (building.status === "done" && low === "food") return { text: "Food is low! Power the greenhouse and grow food.", focus: low };
    if (building.status === "done") return { text: `${names[low]} is low! Give life support more power.`, focus: low };
    if (building.status === "building") return { text: `${names[low]} is low! Its building is almost ready.`, focus: low };
    return { text: `${names[low]} is low! Build the ${ITEMS[maker].name.toLowerCase()}.`, focus: low };
  }
  if (state.power <= 1 && state.buildings.solar.status !== "done") return { text: "Power is low! Build the solar array.", focus: "power" };
  if (fix) return { text: "Dust blocks the sun. Repair to clean it.", focus: "power" };
  if (canLaunch(state)) return { text: "The rover is ready! Walk to it and launch.", focus: "rover" };
  const next = BUILD_ORDER.find((id) => canStartBuild(state, id).ok);
  if (next) return { text: `A build slot is free. Build the ${ITEMS[next].name.toLowerCase()}!`, focus: next };
  return { text: "All set! Plan the day at the ship.", focus: "plan" };
}

/** A sensible plan for today. Used by the forecast, the tests and the hint button. */
export function autoPlan(state) {
  const needs = powerNeeds(state);
  let left = powerBudget(state);
  const alloc = { life: 0, greenhouse: 0, shield: 0, science: 0 };
  for (const key of ["life", "greenhouse"]) {
    alloc[key] = Math.min(needs[key], left);
    left -= alloc[key];
  }
  // Keep a little in the battery before spending on extras.
  const spare = Math.max(0, left - 2);
  alloc.shield = Math.min(needs.shield, spare);
  alloc.science = Math.min(needs.science, Math.max(0, spare - alloc.shield));
  let action = "work";
  if (repairTarget(state)) action = "repair";
  else if (state.buildings.greenhouse.status === "done" && state.water > 2 && activeBuilds(state).length === 0) action = "grow";
  return { alloc, action };
}

/** Start whatever the suggested order allows. Mutates state. */
export function autoBuild(state) {
  for (const id of BUILD_ORDER) startBuild(state, id);
}

/**
 * "Will it last?" Plays the mission with a sensible plan and no weather, and
 * reports the first day each supply would hit zero (null = it lasts).
 */
export function forecast(packed, totalDays = 10) {
  let state = createState({ packed, totalDays });
  const result = { oxygen: null, air: null, water: null, food: null, power: null, roverDay: null, days: totalDays };
  for (let day = 1; day <= totalDays; day += 1) {
    autoBuild(state);
    const plan = autoPlan(state);
    const needs = powerNeeds(state);
    // Power "fails" on the first day the machines cannot all be run.
    const short = plan.alloc.life < needs.life || plan.alloc.greenhouse < needs.greenhouse;
    const next = advanceDay(state, plan).state;
    for (const key of RESOURCES) if (result[key] === null && next[key] <= 0) result[key] = day;
    if (result.power === null && (short || next.stats.powerShortDays > 0)) result.power = day;
    if (result.roverDay === null && next.buildings.rover.status === "done") result.roverDay = day;
    // Keep playing past a failure so every bar gets its own answer.
    next.outcome = null;
    state = next;
  }
  return result;
}

// ---------- Phase 3: the crater photo race ----------

export const PHOTO = {
  TARGETS: 5,
  TIME_SEC: 150,
  SUIT_HEAT: 100,
  COLD_BASE: 2.2, // suit heat lost per second on foot, next to the rover
  COLD_PER_100PX: 0.45, // extra loss per second for every 100 px from the rover
  WARM_RATE: 30, // suit heat regained per second inside the rover
  FROZEN_TIME_FACTOR: 2.5, // the clock runs this much faster with a cold suit
  ROVER_BATTERY_BASE: 50,
  ROVER_BATTERY_PER_POWER: 5,
  ROVER_COST_PER_100PX: 4,
  DOSE_PER_SEC: 0.012, // about 1.8 mSv for the full race, outside the whole time
};

/** Suit heat lost per second at a distance (in pixels) from the rover. */
export function coldRate(distancePx) {
  return PHOTO.COLD_BASE + (Math.abs(distancePx) / 100) * PHOTO.COLD_PER_100PX;
}

/** How fast the mission clock runs: faster when the suit has gone cold. */
export function clockRate(suitHeat) {
  return suitHeat <= 0 ? PHOTO.FROZEN_TIME_FACTOR : 1;
}

export function roverBatteryAtLaunch(state) {
  return Math.min(100, PHOTO.ROVER_BATTERY_BASE + Math.round(state.power) * PHOTO.ROVER_BATTERY_PER_POWER);
}

/** Framing accuracy 0..1 (1 = dead centre) to 1-3 science stars. */
export function framingStars(accuracy) {
  if (accuracy >= 0.8) return 3;
  if (accuracy >= 0.5) return 2;
  return 1;
}

export { CORE };
