import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { missionStartDate } from "../../data/nasa.js";
import { CUSTOM, DIFFICULTY_IDS, SCENARIOS, goalsFor, missionFromScenario } from "../../data/scenarios.js";
import { packCost, starterPlan } from "../buildings.js";
import { ALERTS, DECK_CARDS, alertsForToday, applyAlertResult, buildSchedule, capEvents, countEvents, onAlertStart } from "../events.js";
import { advanceDay, autoBuild, autoPlan } from "../rules.js";
import { createState } from "../state.js";

const donki = (id) => JSON.parse(fs.readFileSync(path.resolve("public/data/donki", `${id}.json`), "utf8"));
const words = (text) => text.trim().split(/\s+/).length;

/** Play a mission's base phase with the helper plan. Returns the final state. */
function playMission(mission, seed = 11) {
  const file = donki(mission.dateId);
  const missionDate = missionStartDate(file, mission.dateId, mission.totalDays, 0.5);
  const schedule = buildSchedule({ donki: file, missionDate, totalDays: mission.totalDays, weatherDeck: mission.deck, seed, maxEvents: mission.maxEvents });
  const packed = starterPlan(mission.budget);
  let state = createState({ packed, weatherDeck: mission.deck, missionDate, totalDays: mission.totalDays, seed, schedule });
  while (!state.outcome && state.day <= mission.totalDays) {
    autoBuild(state);
    for (const event of alertsForToday(state).alerts) {
      onAlertStart(state, event);
      // Shelter from flares unless a supply is about to run out.
      const urgent = ["oxygen", "air", "water"].some((key) => state[key] < 2.2 && state.buildings[key].status !== "done");
      const option = event.id === "flare" ? (urgent ? "work" : "shelter") : ALERTS[event.id].options[0].id;
      applyAlertResult(state, event, { option, quality: 1, refill: 0.5 });
    }
    state = advanceDay(state, autoPlan(state)).state;
    if (state.buildings.rover.status === "done") break;
  }
  return { state, schedule };
}

describe("scenario data", () => {
  it("every scenario has the full shape and unique ids", () => {
    const ids = new Set();
    for (const s of SCENARIOS) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.mode).toBe("real");
      for (const field of ["title", "icon", "story", "donki"]) expect(typeof s[field]).toBe("string");
      expect(fs.existsSync(path.resolve("public/data/donki", `${s.donki}.json`))).toBe(true);
      for (const card of s.deck) expect(DECK_CARDS).toContain(card);
      for (const level of DIFFICULTY_IDS) {
        const d = s.difficulty[level];
        expect(d.days).toBeGreaterThan(0);
        expect(d.budget).toBeGreaterThanOrEqual(packCost({ solar: 1, water: 1, oxygen: 1, air: 1, greenhouse: 1, shield: 1, rover: 1 }));
      }
    }
  });

  it("keeps card and briefing text short (12 words or fewer)", () => {
    for (const s of [...SCENARIOS, CUSTOM]) {
      expect(words(s.story)).toBeLessThanOrEqual(12);
      for (const goal of goalsFor(s, 10)) expect(words(goal.text)).toBeLessThanOrEqual(12);
    }
  });

  it("harder levels mean more alerts, fewer points and fewer days to build", () => {
    for (const s of SCENARIOS) {
      const [easy, medium, hard] = DIFFICULTY_IDS.map((id) => s.difficulty[id]);
      expect(easy.days).toBeGreaterThan(medium.days);
      expect(medium.days).toBeGreaterThan(hard.days);
      expect(easy.budget).toBeGreaterThan(hard.budget);
      expect(easy.maxEvents).toBeLessThan(medium.maxEvents);
      expect(medium.maxEvents).toBeLessThan(hard.maxEvents);
    }
  });

  it("turns a custom setup into a mission", () => {
    const mission = missionFromScenario(CUSTOM, null, { donki: "storm", days: 5, events: 2, deck: ["leak", "dust"] });
    expect(mission).toMatchObject({ mode: "custom", dateId: "storm", totalDays: 5, maxEvents: 2, deck: ["leak", "dust"] });
  });
});

describe("event cap (difficulty)", () => {
  it("never schedules more alerts than maxEvents", () => {
    for (const s of SCENARIOS) {
      for (const level of DIFFICULTY_IDS) {
        const mission = missionFromScenario(s, level);
        const file = donki(mission.dateId);
        const date = missionStartDate(file, mission.dateId, mission.totalDays, 0);
        const schedule = buildSchedule({ donki: file, missionDate: date, totalDays: mission.totalDays, weatherDeck: mission.deck, seed: 3, maxEvents: mission.maxEvents });
        expect(countEvents(schedule)).toBeLessThanOrEqual(mission.maxEvents);
      }
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

describe("balance: every real scenario can be won at every level", () => {
  for (const s of SCENARIOS) {
    for (const level of DIFFICULTY_IDS) {
      it(`${s.title} on ${level}: the helper plan builds the rover in time`, () => {
        const mission = missionFromScenario(s, level);
        const { state } = playMission(mission);
        expect(state.outcome).toBeNull();
        expect(state.buildings.rover.status).toBe("done");
      });
    }
  }
});
