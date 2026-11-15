import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { missionStartDate } from "../../data/nasa.js";
import { SCENARIOS, missionFromScenario } from "../../data/scenarios.js";
import { INFO } from "../../data/info.js";
import { REQUIRED, packCost, starterPlan } from "../buildings.js";
import { ALERTS, DECK_CARDS, alertsForToday, applyAlertResult, buildSchedule, capEvents, countEvents, onAlertStart } from "../events.js";
import { PHOTO, advanceDay, autoBuild, dayCard, recordChoice } from "../rules.js";
import { createState } from "../state.js";

const donki = (id) => JSON.parse(fs.readFileSync(path.resolve("public/data/donki", `${id}.json`), "utf8"));
const words = (text) => text.trim().split(/\s+/).length;

/**
 * Play a whole mission with the best call each day. Each rover trip is
 * counted as 3 photos (a careful player can get more). flare: shelter|work.
 */
function playMission(mission, { seed = 11, flare = "shelter", choose = (card) => card.best } = {}) {
  const file = donki(mission.dateId);
  const missionDate = missionStartDate(file, mission.dateId, mission.totalDays, 0.5);
  const schedule = buildSchedule({ donki: file, missionDate, totalDays: mission.totalDays, weatherDeck: mission.deck, seed, maxEvents: mission.maxEvents });
  let state = createState({ packed: starterPlan(mission.budget), weatherDeck: mission.deck, missionDate, totalDays: mission.totalDays, nightDays: mission.nightDays, seed, schedule });
  while (!state.outcome) {
    autoBuild(state);
    const card = dayCard(state);
    const action = choose(card);
    recordChoice(state, card, action);
    for (const event of alertsForToday(state).alerts) {
      onAlertStart(state, event);
      const option = event.id === "flare" ? flare : ALERTS[event.id].options[0].id;
      applyAlertResult(state, event, { option, quality: 1, refill: 0.5 });
    }
    if (action === "trip") state.photosTaken = Math.min(PHOTO.TARGETS, state.photosTaken + 3);
    state = advanceDay(state, { action }).state;
  }
  return state;
}

describe("scenario data", () => {
  it("every scenario has the full shape, unique ids and an info card", () => {
    const ids = new Set();
    for (const s of SCENARIOS) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      for (const field of ["title", "icon", "story", "donki", "info", "tip"]) expect(typeof s[field]).toBe("string");
      expect(INFO[s.info], s.info).toBeDefined();
      expect(fs.existsSync(path.resolve("public/data/donki", `${s.donki}.json`))).toBe(true);
      for (const card of s.deck) expect(DECK_CARDS).toContain(card);
      expect(s.nightDays).toBeGreaterThan(0);
      expect(s.days - s.nightDays).toBeGreaterThanOrEqual(5);
      expect(s.budget).toBeGreaterThanOrEqual(packCost(Object.fromEntries(REQUIRED.map((id) => [id, 1]))));
      expect(s.stars).toBeGreaterThanOrEqual(1);
    }
  });

  it("the missions go from easy to hard", () => {
    const stars = SCENARIOS.map((s) => s.stars);
    expect([...stars].sort()).toEqual(stars);
  });

  it("keeps card text short (12 words or fewer)", () => {
    for (const s of SCENARIOS) {
      expect(words(s.story)).toBeLessThanOrEqual(12);
      expect(words(s.tip)).toBeLessThanOrEqual(12);
    }
  });
});

describe("event cap", () => {
  it("never schedules more alerts than maxEvents", () => {
    for (const s of SCENARIOS) {
      const mission = missionFromScenario(s);
      const file = donki(mission.dateId);
      const date = missionStartDate(file, mission.dateId, mission.totalDays, 0);
      const schedule = buildSchedule({ donki: file, missionDate: date, totalDays: mission.totalDays, weatherDeck: mission.deck, seed: 3, maxEvents: mission.maxEvents });
      expect(countEvents(schedule)).toBeLessThanOrEqual(mission.maxEvents);
    }
  });

  it("keeps the strongest real events and drops deck cards first", () => {
    const schedule = {
      1: { alerts: [{ id: "flare", real: true, dose: 0.2 }], notices: [] },
      2: { alerts: [{ id: "leak", real: false }], notices: [{ kind: "cme" }] },
      3: { alerts: [{ id: "flare", real: true, dose: 3 }], notices: [] },
    };
    capEvents(schedule, 2);
    expect(schedule[2].alerts).toHaveLength(0);
    expect(schedule[2].notices).toHaveLength(1);
    expect(schedule[1].alerts).toHaveLength(1);
    expect(schedule[3].alerts[0].dose).toBe(3);
  });
});

describe("balance: every mission can be won with good choices", () => {
  for (const s of SCENARIOS) {
    it(`${s.title}: the best calls win`, () => {
      const state = playMission(missionFromScenario(s));
      expect(state.outcome, JSON.stringify(state.outcome)).toMatchObject({ kind: "success" });
    });
  }

  it("the storm night drains the battery: never charging or saving runs it flat", () => {
    const mission = missionFromScenario(SCENARIOS.find((s) => s.id === "gannon-2024"));
    const careless = playMission(mission, { choose: (card) => card.options.find((o) => o !== "charge" && o !== "save") ?? card.best });
    expect(careless.stats.nightPowerOut).toBeGreaterThan(0);
  });

  it("always working through the storm costs far more radiation", () => {
    const mission = missionFromScenario(SCENARIOS.find((s) => s.id === "gannon-2024"));
    const safe = playMission(mission, { flare: "shelter" });
    const reckless = playMission(mission, { flare: "work" });
    expect(reckless.doseMSv).toBeGreaterThan(safe.doseMSv * 1.5);
  });
});
