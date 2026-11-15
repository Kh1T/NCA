// The daily rules of the outpost. Pure functions: no Phaser here.
// All numbers are simplified game values, not mission data. The one real
// anchor is the Moon surface dose rate (see BASE_DOSE).
//
// Each day the player picks ONE choice from a card (dayCard). Power is shared
// out automatically in a fixed order, so the choice is what matters: build
// hard or stay safe, charge up before the night or keep building, and so on.

import { BUILD_ORDER, CORE, ITEMS, REQUIRED, activeBuilds, allBuilt, canStartBuild, startBuild } from "./buildings.js";
import { cloneState, createState, freshToday } from "./state.js";

export const C = {
  CAP: 10, // most crew-days of any supply the tanks can hold
  CREW_USE: 1, // crew-days used per day
  REST_USE: 0.8, // a resting crew breathes and eats a little less
  START: { oxygen: 6, air: 4.5, water: 5, food: 6, power: 6 },
  SHIP_BATTERY: 8,
  BATTERY_PACK: 8,
  SHIP_TRICKLE: 2, // the ship's own small power supply, per day, day and night
  SOLAR_OUT: 7,
  BUILD_POWER: 1, // per active build, per day
  NEED: { air: 1, oxygen: 2, recycler: 1, greenhouse: 2, heat: 2 }, // heat: heaters, only at night
  OUT: { oxygen: 1.6, air: 1.5, food: 1.7 },
  RECYCLE: 1, // water the ship's recycler wins back each day when powered
  WATER_USE: { oxygen: 0.2, greenhouse: 0.2, grow: 0.3 },
  FOOD_DELAY: 2,
  GROW_BONUS: 1.5,
  LEAK_LOSS: 0.8,
  DUST_SUN: 0.5,
  DUST_AIR: 0.7,
  DAMAGED_OUTPUT: 0.5,
  NIGHT_BUILD: 0.5, // builds go at half speed in the cold and dark
  // Real anchor: Chang'e-4 LND measured 1,369 microsieverts per day on the
  // Moon's surface (Zhang et al. 2020, Science Advances).
  BASE_DOSE: 1.37,
  DOSE_LIMIT: 22, // game mission limit in mSv, simplified
  SHIP_FACTOR: 0.3,
  WALL_FACTOR: [1.0, 0.6],
  SHELTER_FACTOR: 0.3,
  SHIELD_ON_FACTOR: 0.1,
  SHIELD_ON_POWER: 3,
  OUTSIDE_FACTOR: 1.5,
  REPAIR_POWER: 1,
  TRIP_POWER: 2,
  LOW_SUPPLY: 1.5,
};

export const RESOURCES = ["oxygen", "air", "water", "food"];

/**
 * The choices a day card can offer. gain/cost are icon chips for the card.
 * slow: how fast builds go (1 normal, 0 stopped). outside: share of the day
 * the crew spends outside (more radiation).
 */
export const ACTIONS = {
  work: { label: "BUILD HARD", icon: "build", gain: [["build", "FAST"]], cost: [["dose", "MORE"]], slow: 1, outside: 0.5 },
  rest: { label: "STAY INSIDE", icon: "crew", gain: [["dose", "LESS"], ["air", "SAVE"]], cost: [["build", "SLOW"]], slow: 0.5, outside: 0 },
  repair: { label: "FIX IT", icon: "wrench", gain: [["wrench", "FIX"]], cost: [["power", "-1"], ["build", "SLOW"]], slow: 0.5, outside: 0.3 },
  grow: { label: "GROW FOOD", icon: "leaf", gain: [["food", "MORE"]], cost: [["water", "-"], ["build", "SLOW"]], slow: 0.5, outside: 0.1 },
  trip: { label: "ROVER TRIP", icon: "rover", gain: [["camera", "PHOTOS"]], cost: [["power", "-2"], ["dose", "MORE"]], slow: 0.5, outside: 0.5 },
  charge: { label: "CHARGE UP", icon: "battery", gain: [["power", "SAVE"]], cost: [["build", "STOP"]], slow: 0, outside: 0.1 },
  save: { label: "SAVE POWER", icon: "battery", gain: [["power", "SAVE"]], cost: [["food", "NO GROW"], ["build", "STOP"]], slow: 0, outside: 0 },
  keep: { label: "KEEP ALL ON", icon: "power", gain: [["food", "GROW"], ["build", "SLOW"]], cost: [["power", "DRAIN"]], slow: 1, outside: 0.3 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round2 = (value) => Math.round(value * 100) / 100;

export function isNight(state, day = state.day) {
  return state.nightDays > 0 && day >= state.nightStart && day <= state.totalDays;
}

/** Days until the night starts (0 = tonight is night already or no night). */
export function daysToNight(state) {
  return state.nightDays > 0 && state.day < state.nightStart ? state.nightStart - state.day : 0;
}

function running(state, id) {
  const building = state.buildings[id];
  return Boolean(building && building.status === "done" && building.on);
}

function healthFactor(state, id) {
  return state.buildings[id].health < 100 ? C.DAMAGED_OUTPUT : 1;
}

export function sunFactor(state, day = state.day) {
  if (isNight(state, day)) return 0;
  return state.effects.dust ? C.DUST_SUN : 1;
}

export function powerIn(state, day = state.day) {
  const solar = running(state, "solar") ? C.SOLAR_OUT * sunFactor(state, day) * healthFactor(state, "solar") : 0;
  return round2(solar + C.SHIP_TRICKLE);
}

/** Power the base's machines need each day with everything switched on. */
export function lifePower(state, { greenhouse = true, night = true } = {}) {
  let need = C.NEED.recycler + (night ? C.NEED.heat : 0);
  if (running(state, "air")) need += C.NEED.air;
  if (running(state, "oxygen")) need += C.NEED.oxygen;
  if (greenhouse && running(state, "greenhouse")) need += C.NEED.greenhouse;
  return need;
}

/** Power the whole night will take from the battery (beyond the ship's trickle). */
export function nightNeed(state, { greenhouse = true } = {}) {
  const nightsLeft = isNight(state) ? state.totalDays - state.day + 1 : state.nightDays;
  return Math.max(0, (lifePower(state, { greenhouse }) - C.SHIP_TRICKLE) * nightsLeft);
}

/** Which thing a Repair would fix first, or null. */
export function repairTarget(state) {
  if (state.effects.leak) return { kind: "leak", label: "the air leak" };
  const damaged = Object.keys(state.buildings).find((id) => state.buildings[id].health < 100);
  if (damaged) return { kind: "building", id: damaged, label: `the ${ITEMS[damaged].name.toLowerCase()}` };
  if (state.effects.dust) return { kind: "dust", label: "the dusty panels" };
  return null;
}

/** Fix one thing. Shared by the FIX IT choice and the spare parts kit. */
export function applyRepair(state) {
  const target = repairTarget(state);
  if (!target) return null;
  if (target.kind === "leak") state.effects.leak = false;
  if (target.kind === "building") state.buildings[target.id].health = 100;
  if (target.kind === "dust") state.effects.dust = false;
  state.log.push({ day: state.day, type: "repair", target: target.label });
  return target;
}

/** Use a spare parts kit: an instant repair that does not use the day's choice. */
export function useSpareKit(state) {
  if (state.kits.spares <= 0 || !repairTarget(state)) return null;
  state.kits.spares -= 1;
  return applyRepair(state);
}

export function wallFactor(state) {
  return C.WALL_FACTOR[state.wallLevel] ?? 1;
}

/** True when a rover trip is possible today. */
export function canTrip(state) {
  return state.buildings.rover.status === "done" && !isNight(state) && state.photosTaken < PHOTO.TARGETS && !state.outcome;
}

// ---------- The day card ----------

/**
 * The one decision of the day. Picks the most pressing situation, offers 2-3
 * choices that fit it, and knows which one is the best call (for the debrief).
 * @returns {{id, title, icon, options: string[], best: string}}
 */
export function dayCard(state) {
  const night = isNight(state);
  const soon = daysToNight(state);
  const broken = repairTarget(state);
  const building = activeBuilds(state).length > 0;
  const greenhouse = state.buildings.greenhouse.status === "done";
  let card;
  if (night) card = { id: "night", title: "IT IS NIGHT!", icon: "moon", options: ["save", "keep"] };
  else if (soon === 1 || soon === 2) card = { id: "dusk", title: soon === 1 ? "NIGHT TOMORROW!" : "NIGHT IN 2 DAYS!", icon: "moon", options: ["charge", building ? "work" : "rest"] };
  else if (broken) card = { id: "broken", title: "SOMETHING BROKE!", icon: "broken", options: ["repair", building ? "work" : "rest"] };
  else if (canTrip(state)) card = { id: "rover", title: "ROVER READY!", icon: "rover", options: ["trip", building ? "work" : "rest"] };
  else if (greenhouse && state.food <= 3) card = { id: "food", title: "FOOD IS LOW!", icon: "food", options: ["grow", building ? "work" : "rest"] };
  else if (building) card = { id: "build", title: "BUILD DAY!", icon: "build", options: ["work", "rest"] };
  else card = { id: "quiet", title: "QUIET DAY", icon: "sun", options: ["rest", greenhouse ? "grow" : "charge"] };

  // One extra choice that also fits today, so there is always something to weigh.
  const extras = [];
  if (broken && !night) extras.push("repair");
  if (canTrip(state)) extras.push("trip");
  if (greenhouse && !night) extras.push("grow");
  const extra = extras.find((id) => !card.options.includes(id));
  if (extra && card.options.length < 3) card.options.push(extra);
  card.best = bestChoice(state, card);
  return card;
}

/** The best call for this card, judged from the state (used for hints and the debrief). */
export function bestChoice(state, card) {
  const doseHigh = state.doseMSv > state.doseLimit * 0.6;
  switch (card.id) {
    case "night": return state.power >= nightNeed(state) ? "keep" : "save";
    case "dusk": {
      // Will the battery be full enough for the night?
      if (state.power < Math.min(state.batteryCap, nightNeed(state))) return "charge";
      return card.options.includes("trip") ? "trip" : card.options[1];
    }
    case "broken": return "repair";
    case "rover": return "trip";
    case "food": return "grow";
    case "build": return doseHigh ? "rest" : "work";
    default: return card.options.includes("grow") && state.food <= 5 ? "grow" : card.options[0];
  }
}

/** What would each choice do today? Runs the day on a copy (no alerts). */
export function previewChoice(state, action) {
  const { report } = advanceDay(state, { action });
  return report.changes;
}

/** Record the choice for the debrief's "good calls". Mutates state. */
export function recordChoice(state, card, option) {
  state.decisions.push({ day: state.day, card: card.id, option, best: card.best, good: option === card.best });
}

// ---------- One day ----------

/**
 * Run one day. Returns a new state and a report for the day summary.
 * @param {object} state
 * @param {{action?: string}} plan
 */
export function advanceDay(state, plan = {}) {
  const s = cloneState(state);
  const before = cloneState(state);
  const action = ACTIONS[plan.action] ? plan.action : "work";
  const def = ACTIONS[action];
  const notes = [];
  const night = isNight(s);
  const active = activeBuilds(s);
  const buildsStopped = s.today.pause || def.slow === 0;
  const on = Object.fromEntries(Object.keys(s.buildings).map((id) => [id, running(s, id)]));

  // 1. Power: sunlight in, then machines get power in a fixed order.
  //    Air first (it runs out fastest), the greenhouse last.
  const income = powerIn(s);
  let left = s.power + income;
  const eff = {};
  let short = false;
  const give = (key, need) => {
    if (need <= 0) {
      eff[key] = 0;
      return;
    }
    const got = Math.min(need, Math.max(0, left));
    left -= got;
    eff[key] = got / need;
    if (got < need - 0.001) short = true;
  };
  left -= s.today.extraPower;
  give("air", on.air ? C.NEED.air : 0);
  give("oxygen", on.oxygen ? C.NEED.oxygen : 0);
  give("heat", night ? C.NEED.heat : 0); // the lunar night is very cold
  give("recycler", C.NEED.recycler);
  give("action", action === "trip" ? C.TRIP_POWER : action === "repair" && repairTarget(s) ? C.REPAIR_POWER : 0);
  give("builds", buildsStopped ? 0 : active.length * C.BUILD_POWER);
  give("greenhouse", on.greenhouse && action !== "save" ? C.NEED.greenhouse : 0);
  s.power = round2(clamp(left, 0, s.batteryCap));
  if (short) {
    s.stats.powerShortDays += 1;
    if (night) s.stats.nightPowerOut += 1;
    s.log.push({ day: s.day, type: "power-short" });
    notes.push("Not enough power! Some machines stopped.");
  }

  // 2. Builds move forward. The choice, the weather and the night set the speed.
  let slow = def.slow * s.today.slow * (night ? C.NIGHT_BUILD : 1);
  if (buildsStopped) slow = 0;
  else if (active.length > 0) slow *= eff.builds;
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
      if (id === "shield") s.wallLevel = 1;
    }
  }
  s.buildQueue = s.buildQueue.filter((id) => s.buildings[id].status === "building");
  if (active.length > 0 && slow < 1) {
    s.stats.buildDelays += 1;
    const causes = [...s.today.causes];
    if (def.slow < 1) causes.push(action === "charge" || action === "save" ? "saving power" : "the day's choice");
    if (night) causes.push("the night");
    if (eff.builds < 1 && !buildsStopped) causes.push("no power");
    s.log.push({ day: s.day, type: "build-delay", ids: active, causes });
  }

  // 3. Supplies: the crew uses them, the machines refill them.
  // A building that finishes today does a free test run the same day.
  const fresh = (id) => completed.includes(id) && s.buildings[id].on;
  const work = (id) => (fresh(id) ? 1 : on[id] ? eff[id] : 0);
  const use = action === "rest" || action === "save" ? C.REST_USE : C.CREW_USE;

  s.water += -C.CREW_USE + C.RECYCLE * eff.recycler;
  if (eff.recycler < 1) s.log.push({ day: s.day, type: "no-recycle" });

  s.oxygen -= use;
  if (work("oxygen") > 0) {
    if (s.water > 0) {
      s.oxygen += C.OUT.oxygen * work("oxygen") * healthFactor(s, "oxygen");
      s.water -= C.WATER_USE.oxygen * work("oxygen");
    } else {
      notes.push("No water, so no oxygen was made.");
      s.log.push({ day: s.day, type: "no-water-for-oxygen" });
    }
  }

  s.air -= C.CREW_USE * (use / C.CREW_USE);
  s.air += C.OUT.air * work("air") * healthFactor(s, "air") * (s.effects.dust ? C.DUST_AIR : 1);
  if (s.effects.leak) s.air -= C.LEAK_LOSS;

  s.food -= use;
  const green = action === "save" ? 0 : work("greenhouse");
  if (green > 0) {
    if (s.water > 0) {
      const growing = action === "grow";
      const planted = C.OUT.food * green * s.effects.plantHealth * healthFactor(s, "greenhouse") * (growing ? C.GROW_BONUS : 1);
      s.water -= C.WATER_USE.greenhouse * green + (growing ? C.WATER_USE.grow : 0);
      s.foodPipeline.push({ day: s.day + C.FOOD_DELAY, amount: round2(planted) });
    } else {
      notes.push("No water, so nothing was planted.");
    }
  }
  const arriving = s.foodPipeline.filter((batch) => batch.day <= s.day);
  s.foodPipeline = s.foodPipeline.filter((batch) => batch.day > s.day);
  for (const batch of arriving) {
    s.food += batch.amount;
    s.stats.foodGrown = round2(s.stats.foodGrown + batch.amount);
  }
  if (arriving.length > 0) notes.push("Fresh food from the greenhouse!");
  for (const key of RESOURCES) s[key] = round2(clamp(s[key], 0, C.CAP));

  // 4. Radiation: the ship shields well, work outside does not.
  const outside = active.length > 0 || action === "trip" || action === "repair" ? def.outside : Math.min(def.outside, 0.1);
  const baseDose = C.BASE_DOSE * ((1 - outside) * C.SHIP_FACTOR + outside * wallFactor(s) * C.OUTSIDE_FACTOR);
  s.doseMSv = round2(s.doseMSv + baseDose + s.today.eventDose);
  if (outside >= 0.5) s.stats.daysOutside += 1;
  if (action === "rest") s.stats.daysRested += 1;
  s.crewLocation = outside >= 0.5 ? "outside" : "spaceship";

  // 5. The day's choice.
  if (action === "repair") {
    const fixed = applyRepair(s);
    notes.push(fixed ? `You fixed ${fixed.label}!` : "Nothing needed fixing.");
  }
  if (action === "trip") s.trips += 1;

  if (s.effects.plantSickDays > 0) {
    s.effects.plantSickDays -= 1;
    if (s.effects.plantSickDays === 0) s.effects.plantHealth = 1;
  }
  s.effects.plantHealth = clamp(s.effects.plantHealth, 0.2, 1);
  if (s.day + 1 === s.nightStart) notes.push("Night starts tomorrow! No sunlight.");

  // 6. Lose checks. Nobody dies: the crew retreats to the ISS.
  s.zeroDays.food = s.food <= 0 ? s.zeroDays.food + 1 : 0;
  s.zeroDays.water = s.water <= 0 ? s.zeroDays.water + 1 : 0;
  const cause = loseCause(s);
  s.stats.daysSurvived = s.day;
  if (cause) {
    s.outcome = { kind: "evacuated", cause };
    s.log.push({ day: s.day, type: "evacuated", cause });
  } else if (s.day >= s.totalDays) {
    // Sunrise after the last night: the mission is over.
    const won = allBuilt(s) && s.photosTaken >= PHOTO.TARGETS;
    s.outcome = won ? { kind: "success", cause: null } : { kind: "partial", cause: "time" };
    s.log.push({ day: s.day, type: "mission-end", won });
    notes.push("Sunrise! You made it through the night!");
  }

  const changes = {};
  for (const key of ["power", ...RESOURCES, "doseMSv"]) changes[key] = round2(s[key] - before[key]);

  s.log.push({ day: s.day, type: "day-end", action, power: s.power, oxygen: s.oxygen, air: s.air, water: s.water, food: s.food, dose: s.doseMSv });
  s.today = freshToday();
  s.eventsToday = [];
  s.day += 1;

  return { state: s, report: { day: before.day, action, completed, notes, changes, income, short } };
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

// ---------- The checklist and the "do this now" line ----------

/** The mission checklist: what is done, what is left. */
export function checklist(state) {
  const items = REQUIRED.map((id) => {
    const b = state.buildings[id];
    return { id, icon: id === "rover" ? "rover" : null, label: ITEMS[id].short, done: b.status === "done", busy: b.status === "building", packed: b.packed };
  });
  items.push({ id: "photos", icon: "camera", label: `PHOTOS ${state.photosTaken}/${PHOTO.TARGETS}`, done: state.photosTaken >= PHOTO.TARGETS });
  items.push({ id: "night", icon: "moon", label: "SURVIVE NIGHT", done: state.outcome?.kind === "success" || (state.day > state.totalDays && !state.outcome?.cause) });
  return items;
}

/**
 * The one thing to do right now (the "DO THIS NOW" line). focus names what
 * the world arrow should point at: a site id or "ship".
 */
export function guideLine(state) {
  const fix = repairTarget(state);
  if (fix && fix.kind !== "dust") return { text: "Something is broken! Fix it today.", focus: "ship" };
  const low = RESOURCES.filter((key) => state[key] <= C.LOW_SUPPLY).sort((a, b) => state[a] - state[b])[0];
  if (low) {
    const names = { oxygen: "Oxygen", air: "Clean air", water: "Water", food: "Food" };
    const maker = { oxygen: "oxygen", air: "air", food: "greenhouse" }[low];
    if (low === "water") return { text: "Water is low! Keep power for the recycler.", focus: "ship" };
    if (state.buildings[maker].status === "idle" && canStartBuild(state, maker).ok) return { text: `${names[low]} is low! Build the ${ITEMS[maker].name.toLowerCase()}.`, focus: maker };
  }
  const next = BUILD_ORDER.find((id) => canStartBuild(state, id).ok);
  if (next) return { text: `Build the ${ITEMS[next].name.toLowerCase()}! Tap its flag.`, focus: next };
  const soon = daysToNight(state);
  if (soon > 0 && soon <= 2 && state.power < Math.min(state.batteryCap, nightNeed(state))) return { text: "Night is coming! Charge up the battery.", focus: "ship" };
  if (canTrip(state)) return { text: "Rover ready! Go on a photo trip.", focus: "ship" };
  if (isNight(state)) return { text: "Night! Save power until sunrise.", focus: "ship" };
  return { text: "All set! Tap NEXT DAY at the ship.", focus: "ship" };
}

// ---------- Helpers for the tests, the forecast and the bots ----------

/** A sensible choice for today: the card's best call. */
export function autoPlan(state) {
  return { action: dayCard(state).best };
}

/** Start whatever the suggested order allows. Mutates state. */
export function autoBuild(state) {
  for (const id of BUILD_ORDER) startBuild(state, id);
}

/**
 * "Will it last?" Plays the mission with sensible choices and no weather, and
 * reports the first day each supply would hit zero (null = it lasts).
 */
export function forecast(packed, totalDays = 7, nightDays = 2) {
  let state = createState({ packed, totalDays, nightDays });
  const result = { oxygen: null, air: null, water: null, food: null, power: null, roverDay: null, days: totalDays };
  for (let day = 1; day <= totalDays; day += 1) {
    autoBuild(state);
    const plan = autoPlan(state);
    const { state: next, report } = advanceDay(state, plan);
    if (plan.action === "trip") next.photosTaken = Math.min(PHOTO.TARGETS, next.photosTaken + 3);
    for (const key of RESOURCES) if (result[key] === null && next[key] <= 0) result[key] = day;
    if (result.power === null && report.short) result.power = day;
    if (result.roverDay === null && next.buildings.rover.status === "done") result.roverDay = day;
    // Keep playing past a failure so every bar gets its own answer.
    next.outcome = null;
    state = next;
  }
  return result;
}

// ---------- The crater photo trips ----------

export const PHOTO = {
  TARGETS: 5,
  SUIT_HEAT: 100,
  COLD_BASE: 2.2, // suit heat lost per second on foot, next to the rover
  COLD_PER_100PX: 0.45, // extra loss per second for every 100 px from the rover
  WARM_RATE: 30, // suit heat regained per second inside the rover
  ROVER_BATTERY_BASE: 60,
  ROVER_BATTERY_PER_POWER: 4,
  ROVER_COST_PER_100PX: 4,
  DOSE_PER_SEC: 0.006, // a small extra dose while outside on a trip
};

/** Suit heat lost per second at a distance (in pixels) from the rover. */
export function coldRate(distancePx) {
  return PHOTO.COLD_BASE + (Math.abs(distancePx) / 100) * PHOTO.COLD_PER_100PX;
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
