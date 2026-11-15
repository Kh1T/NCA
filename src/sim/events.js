// Weather events and alerts. Pure data and functions: no Phaser here.
//
// Real events come from the cached NASA DONKI files. Deck events are curated
// from real lunar science and are labelled "simplified" in the game.

import { ITEMS } from "./buildings.js";
import { C, applyRepair, wallFactor } from "./rules.js";
import { pick, rand } from "./state.js";

/** Game-scale dose added by a real solar event, in mSv. Simplified. */
export const EVENT_DOSE = { M: 0.2, X: 1.0, SEP: 3.0 };

const SIMPLIFIED = { label: "Simplified from real lunar science", real: false };

/**
 * Every alert follows one contract:
 * { id, title, explain, source, timerSec, control, options, buildImpact, scoreFn }
 * Each option has a cost with at least one non-zero number: no free choices.
 * scoreFn(result, state, event) returns the changes to apply.
 */
export const ALERTS = {
  flare: {
    id: "flare",
    title: "Solar flare!",
    icon: "sun",
    explain: "Radiation is coming! Get everyone inside.",
    source: { label: "NASA DONKI", real: true, url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/" },
    timerSec: 12,
    control: "drag",
    minigame: "DragToShelter",
    options: [
      {
        id: "shelter", label: "Take shelter", play: true,
        costText: "Builds go slower today",
        cost: { buildDays: 0.5 },
      },
      { id: "work", label: "Keep working", costText: "Full radiation dose outside", cost: { dose: 1.5 } },
    ],
    buildImpact: { slowFactor: 0.5, pause: false },
    scoreFn(result, state, event) {
      const dose = event.dose ?? EVENT_DOSE.M;
      const exposed = C.OUTSIDE_FACTOR * wallFactor(state);
      if (result.option === "work") {
        return { eventDose: dose * exposed, stat: "flaresWorked", note: "You kept working and took the full dose." };
      }
      const q = result.quality ?? 1;
      const shieldOn = Boolean(result.shieldOn) && state.buildings.shield.status === "done" && state.power >= C.SHIELD_ON_POWER;
      const sheltered = shieldOn ? C.SHIELD_ON_FACTOR : C.SHELTER_FACTOR;
      return {
        eventDose: dose * (q * sheltered + (1 - q) * exposed),
        power: shieldOn ? -C.SHIELD_ON_POWER : 0,
        // Hiding inside costs some build time.
        slow: 0.7,
        stat: "shelters",
        cause: event.level === "SEP" ? "sheltering from a particle storm" : "sheltering from a solar flare",
        note: q >= 1 ? "Everyone got inside in time!" : "Not everyone got inside in time.",
      };
    },
  },

  meteor: {
    id: "meteor",
    title: "Micrometeorite!",
    icon: "rock",
    explain: "A tiny space rock hit the base!",
    source: SIMPLIFIED,
    timerSec: 14,
    control: "joystick",
    minigame: "RepairBot",
    options: [
      { id: "bot", label: "Send the repair bot", play: true, costText: "1 power", cost: { power: 1 } },
      { id: "leave", label: "Leave it for now", costText: "Half output until repaired", cost: { output: 0.5 } },
    ],
    buildImpact: { slowFactor: 1, pause: false },
    scoreFn(result, state, event) {
      const fixed = result.option === "bot" && (result.quality ?? 0) >= 0.5;
      const power = result.option === "bot" ? -1 : 0;
      if (fixed) return { power, repairId: event.targetId, note: "The bot sealed the hole!" };
      return { power, note: result.option === "bot" ? "The bot ran out of time." : "It stays broken until you repair it." };
    },
  },

  leak: {
    id: "leak",
    title: "Air leak!",
    icon: "leak",
    explain: "Air is escaping through a crack! Patch it fast.",
    source: SIMPLIFIED,
    timerSec: 12,
    control: "drag",
    minigame: "PatchLeak",
    options: [
      { id: "patch", label: "Patch it now", play: true, costText: "Oxygen to refill the cabin", cost: { oxygen: 0.5 } },
      { id: "ignore", label: "Deal with it later", costText: "Air leaks out every day", cost: { air: 0.8 } },
    ],
    buildImpact: { slowFactor: 1, pause: false },
    scoreFn(result) {
      if (result.option === "ignore") return { effects: { leak: true }, note: "The leak loses air until you repair it." };
      const q = result.quality ?? 0;
      if (q <= 0) return { air: -1.2, effects: { leak: true }, note: "The patch missed! The leak is still open." };
      const refill = Math.min(1, Math.max(0, result.refill ?? 0.5));
      // A slow patch loses more air. The refill turns stored oxygen into cabin air.
      return { air: -(0.3 + (1 - q)) + refill, oxygen: -refill, note: "Patched! Stored oxygen refilled the cabin." };
    },
  },

  dust: {
    id: "dust",
    title: "Sticky moon dust",
    icon: "dust",
    explain: "Dust covers the solar panels. Wipe it off!",
    source: { label: "Apollo crews reported sticky dust. Simplified", real: false },
    timerSec: 14,
    control: "drag",
    minigame: "DustWipe",
    options: [
      { id: "wipe", label: "Wipe it off now", play: true, costText: "1 power and half a build day", cost: { power: 1, buildDays: 0.5 } },
      { id: "leave", label: "Leave the dust", costText: "Half sunlight, weaker air filter", cost: { sun: 0.5 } },
    ],
    buildImpact: { slowFactor: 0.5, pause: false },
    scoreFn(result) {
      if (result.option === "leave") return { effects: { dust: true }, note: "The dust stays until you repair it." };
      const clean = (result.quality ?? 0) >= 0.6;
      return {
        power: -1,
        slow: 0.5,
        cause: "cleaning moon dust",
        effects: { dust: !clean },
        note: clean ? "Panels are clean again!" : "Some dust is still stuck.",
      };
    },
  },

  temp: {
    id: "temp",
    title: "Temperature swing",
    icon: "thermo",
    explain: "It is getting very cold. Set the heaters.",
    source: SIMPLIFIED,
    timerSec: 0,
    control: "slider",
    minigame: "HeatSlider",
    options: [
      { id: "heat0", label: "Heaters off", costText: "Builds slow, plants stressed", cost: { buildDays: 0.6, food: 0.5 } },
      { id: "heat1", label: "Low heat", costText: "1 power, builds a bit slow", cost: { power: 1, buildDays: 0.4 } },
      { id: "heat2", label: "Medium heat", costText: "2 power, builds slightly slow", cost: { power: 2, buildDays: 0.2 } },
      { id: "heat3", label: "Full heat", costText: "3 power", cost: { power: 3 } },
    ],
    buildImpact: { slowFactor: 0.4, pause: false },
    scoreFn(result) {
      const heat = Math.min(3, Math.max(0, Number(String(result.option).replace("heat", "")) || 0));
      const missing = 3 - heat;
      return {
        power: -heat,
        slow: 1 - 0.2 * missing,
        plantHealth: -0.15 * missing,
        cause: missing > 0 ? "the cold" : null,
        note: missing === 0 ? "Full heat! Work went on as normal." : "The cold slowed builds and stressed plants.",
      };
    },
  },

  plant: {
    id: "plant",
    title: "Sick plants",
    icon: "leaf",
    explain: "The plants are drooping. Give them extra water?",
    source: { label: "CSA food production toolkit. Simplified", real: false, url: "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/" },
    timerSec: 0,
    control: "slider",
    minigame: "PlantBalance",
    requires: "greenhouse",
    options: [
      { id: "water0", label: "No extra water", costText: "Much less food for 3 days", cost: { food: 2 } },
      { id: "water1", label: "A little water", costText: "0.3 water, less food", cost: { water: 0.3, food: 1.3 } },
      { id: "water2", label: "Some water", costText: "0.6 water, a bit less food", cost: { water: 0.6, food: 0.7 } },
      { id: "water3", label: "Lots of water", costText: "0.9 water", cost: { water: 0.9 } },
    ],
    buildImpact: { slowFactor: 1, pause: false },
    scoreFn(result) {
      const water = Math.min(3, Math.max(0, Number(String(result.option).replace("water", "")) || 0));
      return {
        water: -0.3 * water,
        effects: { plantHealth: 0.4 + 0.2 * water, plantSickDays: 3 },
        note: water === 3 ? "Plenty of water! The plants bounced back." : "The plants grow less food for 3 days.",
      };
    },
  },

  comms: {
    id: "comms",
    title: "Earth calling",
    icon: "dish",
    explain: "Strange reading! Ask Earth, or decide yourself?",
    source: { label: "Radio takes about 1.3 seconds each way. Simplified", real: false },
    timerSec: 0,
    control: "toggle",
    minigame: "CommsWait",
    options: [
      { id: "wait", label: "Ask Earth and wait", costText: "Half a build day waiting by the radio", cost: { buildDays: 0.5 } },
      { id: "guess", label: "Decide now", costText: "A wrong guess wastes water", cost: { risk: 1 } },
    ],
    buildImpact: { slowFactor: 0.5, pause: false },
    scoreFn(result, state) {
      if (result.option === "wait") {
        return { science: 2, slow: 0.5, cause: "waiting for Earth's answer", note: "Earth was right! Waiting slowed the builds." };
      }
      const right = result.guessedRight ?? rand(state) < 0.5;
      return right
        ? { science: 2, note: "Good call! Your guess was right." }
        : { water: -1, note: "Wrong valve! Some water spilled." };
    },
  },
};

/** Cards the player can add to the weather deck. Real solar events always apply. */
export const DECK_CARDS = ["meteor", "leak", "dust", "temp", "plant", "comms"];
export const MIN_DECK = 2;

const DAY_MS = 86_400_000;

export function dateForDay(missionDate, day) {
  return new Date(Date.parse(`${missionDate}T00:00:00Z`) + (day - 1) * DAY_MS).toISOString().slice(0, 10);
}

function flareRank(classType = "") {
  const letter = classType[0];
  const size = Number(classType.slice(1)) || 1;
  return ({ X: 100, M: 10, C: 1 }[letter] ?? 0) * size;
}

/**
 * Turn a cached DONKI file into at most one solar alert per mission day, plus
 * notices (warnings that need no decision).
 * @returns {Array<{day, date, alert: object|null, notices: object[]}>}
 */
export function realEventsByDay(donki, missionDate, totalDays) {
  const events = donki?.events ?? {};
  const days = [];
  for (let day = 1; day <= totalDays; day += 1) {
    const date = dateForDay(missionDate, day);
    const onDate = (time) => typeof time === "string" && time.startsWith(date);
    const flares = (events.FLR ?? []).filter((f) => onDate(f.peakTime ?? f.beginTime));
    const strongest = [...flares].sort((a, b) => flareRank(b.classType) - flareRank(a.classType))[0];
    const seps = (events.SEP ?? []).filter((s) => onDate(s.eventTime));
    const level = seps.length > 0 ? "SEP" : strongest?.classType?.[0];

    let alert = null;
    if (level === "SEP" || level === "X" || level === "M") {
      const flareDose = strongest ? EVENT_DOSE[strongest.classType[0]] ?? 0 : 0;
      alert = {
        id: "flare",
        real: true,
        level,
        date,
        classType: strongest?.classType ?? null,
        flareCount: flares.length,
        dose: level === "SEP" ? EVENT_DOSE.SEP : flareDose,
        title: level === "SEP" ? "Particle storm!" : level === "X" ? "Big solar flare!" : "Solar flare",
        badge: level === "SEP"
          ? `Real particle storm, ${date}, NASA DONKI`
          : `Real ${strongest.classType} solar flare, ${date}, NASA DONKI`,
        link: (level === "SEP" ? seps[0].link : strongest.link) ?? null,
      };
    }

    const notices = [];
    const cloud = (events.CME ?? []).find((c) => c.earthDirected && onDate(c.startTime));
    if (cloud) {
      notices.push({
        kind: "cme",
        date,
        text: "A Sun cloud is heading toward Earth and the Moon.",
        badge: `Real solar cloud (CME), ${date}, NASA DONKI`,
        link: cloud.link,
      });
    }
    const storm = (events.GST ?? []).find((g) => onDate(g.startTime));
    if (storm) {
      notices.push({
        kind: "gst",
        date,
        text: `Magnetic storm on Earth (Kp ${storm.maxKp}). Auroras tonight!`,
        badge: `Real geomagnetic storm, ${date}, NASA DONKI`,
        link: storm.link,
      });
    }
    days.push({ day, date, alert, notices });
  }
  return days;
}

/**
 * Build the mission's event schedule: real solar events by date, with deck
 * events layered on top at random days. Uses state-style seeded randomness.
 * @returns {Record<number, {alerts: object[], notices: object[]}>}
 */
export function buildSchedule({ donki, missionDate, totalDays, weatherDeck, seed = 1, maxEvents = null }) {
  const rng = { rngState: seed | 0 };
  const schedule = {};
  for (const entry of realEventsByDay(donki, missionDate, totalDays)) {
    schedule[entry.day] = { alerts: entry.alert ? [entry.alert] : [], notices: entry.notices };
  }

  // About one deck event every two days, never on Day 1, at most one per day.
  const deck = (weatherDeck ?? []).filter((id) => DECK_CARDS.includes(id));
  if (deck.length > 0) {
    const count = Math.max(1, Math.round(totalDays * 0.5));
    const openDays = [];
    for (let day = 2; day <= totalDays; day += 1) openDays.push(day);
    let bag = [];
    for (let i = 0; i < count && openDays.length > 0; i += 1) {
      if (bag.length === 0) bag = [...deck];
      const id = bag.splice(Math.floor(rand(rng) * bag.length), 1)[0];
      const day = openDays.splice(Math.floor(rand(rng) * openDays.length), 1)[0];
      schedule[day].alerts.push({ id, real: false });
    }
  }
  if (maxEvents !== null && maxEvents !== undefined) capEvents(schedule, maxEvents);
  return schedule;
}

/**
 * Keep only the `max` strongest alerts in the whole mission (difficulty).
 * Real solar events rank above deck events; stronger events above weaker;
 * earlier days win ties. Notices (no decision needed) are never removed.
 */
export function capEvents(schedule, max) {
  const all = [];
  for (const [day, entry] of Object.entries(schedule)) {
    entry.alerts.forEach((alert, index) => {
      const rank = alert.real ? 10 + (alert.dose ?? 0) * 100 : 1;
      all.push({ day: Number(day), index, alert, rank });
    });
  }
  all.sort((a, b) => b.rank - a.rank || a.day - b.day);
  const keep = new Set(all.slice(0, Math.max(0, max)).map((e) => e.alert));
  for (const entry of Object.values(schedule)) entry.alerts = entry.alerts.filter((alert) => keep.has(alert));
  return schedule;
}

/** Count the alerts in a schedule. */
export function countEvents(schedule) {
  return Object.values(schedule).reduce((sum, entry) => sum + entry.alerts.length, 0);
}

/**
 * Get today's alerts ready to show. Fills in targets and drops alerts that
 * cannot happen yet (sick plants before there is a greenhouse).
 */
export function alertsForToday(state) {
  const today = state.schedule?.[state.day];
  if (!today) return { alerts: [], notices: [] };
  const alerts = [];
  for (const event of today.alerts) {
    const def = ALERTS[event.id];
    if (!def) continue;
    if (def.requires && state.buildings[def.requires].status !== "done") continue;
    const ready = { ...event };
    if (event.id === "meteor") {
      const built = Object.keys(state.buildings).filter((id) => state.buildings[id].status === "done" && state.buildings[id].health >= 100);
      if (built.length === 0) continue;
      ready.targetId = pick(state, built);
      ready.targetName = ITEMS[ready.targetId].name;
    }
    if (event.id === "comms") ready.guessedRight = rand(state) < 0.5;
    alerts.push(ready);
  }
  return { alerts, notices: today.notices ?? [] };
}

/** Things that happen the moment an alert appears, before the player chooses. */
export function onAlertStart(state, event) {
  if (event.id === "meteor" && event.targetId) {
    state.buildings[event.targetId].health = 50;
    state.log.push({ day: state.day, type: "damage", id: event.targetId });
  }
}

/**
 * Apply the player's answer to an alert. Mutates state and returns the note
 * to show on the result card.
 * @param {{option: string, quality?: number}} result
 */
export function applyAlertResult(state, event, result) {
  const def = ALERTS[event.id];
  const full = { ...result, guessedRight: event.guessedRight };
  const change = def.scoreFn(full, state, event) ?? {};

  for (const key of ["power", "oxygen", "air", "water", "food"]) {
    if (!change[key]) continue;
    const cap = key === "power" ? state.batteryCap : C.CAP;
    state[key] = Math.round(Math.min(cap, Math.max(0, state[key] + change[key])) * 100) / 100;
  }
  if (change.science) state.science += change.science;
  if (change.eventDose) state.today.eventDose += change.eventDose;
  if (change.pause) state.today.pause = true;
  if (change.slow !== undefined) state.today.slow = Math.min(state.today.slow, change.slow);
  if (change.cause) state.today.causes.push(change.cause);
  if (change.plantHealth) state.effects.plantHealth = Math.max(0.2, state.effects.plantHealth + change.plantHealth);
  if (change.effects) Object.assign(state.effects, change.effects);
  if (change.stat) state.stats[change.stat] += 1;
  if (change.repairId) {
    state.buildings[change.repairId].health = 100;
    state.log.push({ day: state.day, type: "repair", target: ITEMS[change.repairId].name });
  }

  state.eventsToday.push(event.id);
  state.log.push({
    day: state.day,
    type: "alert",
    id: event.id,
    title: event.title ?? def.title,
    option: result.option,
    real: Boolean(event.real),
    badge: event.badge ?? null,
    link: event.link ?? null,
    dose: change.eventDose ? Math.round(change.eventDose * 100) / 100 : 0,
  });
  return { note: change.note ?? "", change };
}

export { applyRepair };
