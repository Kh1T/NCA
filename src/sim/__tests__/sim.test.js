import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUDGETS, CORE, ITEMS, MAX_ACTIVE_BUILDS, REQUIRED, canStartBuild, packCost, packWarnings, startBuild, starterPlan } from "../buildings.js";
import { difficultyFor } from "../difficulty.js";
import { ALERTS, DECK_CARDS, applyAlertResult, buildSchedule, realEventsByDay } from "../events.js";
import {
  ACTIONS, C, PHOTO, advanceDay, autoPlan, checklist, dayCard, daysToNight, forecast, framingStars, guideLine, isNight,
  nightNeed, previewChoice,
} from "../rules.js";
import { causeChain, finalScore, goodCalls, outcomeKind, retryHints, starGoals } from "../scoring.js";
import { createState } from "../state.js";

const FULL_PACK = { solar: 1, oxygen: 1, air: 1, greenhouse: 1, shield: 1, rover: 1, battery: 1 };
const donki = (id) => JSON.parse(fs.readFileSync(path.resolve("public/data/donki", `${id}.json`), "utf8"));
const allDone = (state) => {
  for (const id of REQUIRED) state.buildings[id].status = "done";
  state.wallLevel = 1;
};

describe("blueprints and budget", () => {
  it("has no antenna and no water extractor any more", () => {
    expect(ITEMS.antenna).toBeUndefined();
    expect(ITEMS.water).toBeUndefined();
    expect(CORE).not.toContain("water");
  });

  it("lets every budget pack the base and the rover", () => {
    for (const budget of Object.values(BUDGETS)) expect(packCost(FULL_PACK)).toBeLessThanOrEqual(budget);
  });

  it("forces a trade-off: nobody can pack everything", () => {
    const everything = Object.fromEntries(Object.values(ITEMS).map((item) => [item.id, item.max]));
    expect(packCost(everything)).toBeGreaterThan(BUDGETS.easy);
  });

  it("the starter pack fits the budget and includes everything needed", () => {
    for (const budget of Object.values(BUDGETS)) {
      const plan = starterPlan(budget);
      expect(packCost(plan)).toBeLessThanOrEqual(budget);
      for (const id of REQUIRED) expect(plan[id]).toBe(1);
      expect(plan.battery).toBeGreaterThanOrEqual(1);
    }
  });

  it("warns but does not block a risky pack", () => {
    expect(packWarnings(FULL_PACK)).toEqual([]);
    expect(packWarnings({ ...FULL_PACK, air: 0 }).join(" ")).toMatch(/air/i);
  });
});

describe("build rules", () => {
  it("allows at most 3 builds at once", () => {
    const state = createState({ packed: FULL_PACK });
    expect(startBuild(state, "solar").ok).toBe(true);
    expect(startBuild(state, "air").ok).toBe(true);
    expect(startBuild(state, "oxygen").ok).toBe(true);
    expect(startBuild(state, "greenhouse").ok).toBe(false);
    expect(state.buildQueue).toHaveLength(MAX_ACTIVE_BUILDS);
  });

  it("the rover can be built at any time", () => {
    const state = createState({ packed: FULL_PACK });
    expect(canStartBuild(state, "rover").ok).toBe(true);
  });

  it("cannot build what was not packed", () => {
    const state = createState({ packed: { ...FULL_PACK, shield: 0 } });
    expect(canStartBuild(state, "shield").ok).toBe(false);
  });

  it("the day's choice sets the build speed", () => {
    const base = createState({ packed: FULL_PACK });
    startBuild(base, "oxygen"); // 2 days
    expect(advanceDay(base, { action: "work" }).state.buildings.oxygen.daysLeft).toBe(1);
    expect(advanceDay(base, { action: "rest" }).state.buildings.oxygen.daysLeft).toBe(1.5);
    expect(advanceDay(base, { action: "charge" }).state.buildings.oxygen.daysLeft).toBe(2);

    const cold = structuredClone(base);
    applyAlertResult(cold, { id: "temp" }, { option: "heat0" });
    expect(advanceDay(cold, { action: "work" }).state.buildings.oxygen.daysLeft).toBeGreaterThan(1);
  });
});

describe("water is recycled with power", () => {
  it("water holds steady with power, and drains without it", () => {
    const state = createState({ packed: FULL_PACK });
    state.power = 8;
    expect(advanceDay(state, { action: "rest" }).state.water).toBe(C.START.water);
    const flat = createState({ packed: FULL_PACK, totalDays: 10, nightDays: 3 });
    flat.day = flat.nightStart; // night: no sun
    flat.power = 0;
    const next = advanceDay(flat, { action: "save" }).state;
    expect(next.water).toBeLessThan(C.START.water);
  });
});

describe("the lunar night", () => {
  it("covers the last days of the mission and brings no sunlight", () => {
    const state = createState({ packed: FULL_PACK, totalDays: 8, nightDays: 2 });
    expect(state.nightStart).toBe(7);
    expect(isNight(state)).toBe(false);
    expect(daysToNight(state)).toBe(6);
    state.day = 7;
    expect(isNight(state)).toBe(true);
    state.buildings.solar.status = "done";
    state.power = 10;
    const next = advanceDay(state, { action: "keep" }).state;
    expect(next.power).toBeLessThan(10); // the battery drains in the dark
  });

  it("charging up before the night stores power, building does not", () => {
    const state = createState({ packed: FULL_PACK, totalDays: 8 });
    allDone(state);
    state.buildings.rover.status = "idle";
    startBuild(state, "rover");
    state.power = 4;
    const charged = advanceDay(state, { action: "charge" }).state.power;
    const built = advanceDay(state, { action: "work" }).state.power;
    expect(charged).toBeGreaterThan(built);
  });

  it("SAVE POWER uses less battery than KEEP ALL ON", () => {
    const state = createState({ packed: FULL_PACK, totalDays: 8 });
    allDone(state);
    state.day = 7;
    state.power = 14;
    expect(advanceDay(state, { action: "save" }).state.power).toBeGreaterThan(advanceDay(state, { action: "keep" }).state.power);
    expect(nightNeed(state, { greenhouse: false })).toBeLessThan(nightNeed(state));
  });

  it("the mission ends at sunrise after the last night", () => {
    let state = createState({ packed: FULL_PACK, totalDays: 3, nightDays: 1 });
    allDone(state);
    state.photosTaken = 5;
    state.power = 12;
    while (!state.outcome) state = advanceDay(state, autoPlan(state)).state;
    expect(state.outcome.kind).toBe("success");
  });
});

describe("the day card", () => {
  it("always offers 2-3 choices, each with gains and costs, and knows the best", () => {
    const state = createState({ packed: FULL_PACK, totalDays: 8 });
    for (let day = 1; day <= 8; day += 1) {
      state.day = day;
      const card = dayCard(state);
      expect(card.options.length).toBeGreaterThanOrEqual(2);
      expect(card.options.length).toBeLessThanOrEqual(3);
      expect(card.options).toContain(card.best);
      for (const id of card.options) {
        expect(ACTIONS[id].gain.length).toBeGreaterThan(0);
        expect(ACTIONS[id].cost.length).toBeGreaterThan(0);
      }
    }
  });

  it("fits the situation: night, dusk, broken, rover", () => {
    const state = createState({ packed: FULL_PACK, totalDays: 8 });
    state.day = 7;
    expect(dayCard(state).id).toBe("night");
    state.day = 5;
    expect(dayCard(state).id).toBe("dusk");
    state.day = 2;
    state.effects.leak = true;
    expect(dayCard(state)).toMatchObject({ id: "broken", best: "repair" });
    state.effects.leak = false;
    state.buildings.rover.status = "done";
    expect(dayCard(state)).toMatchObject({ id: "rover", best: "trip" });
  });

  it("at dusk with a low battery, charging is the best call", () => {
    const state = createState({ packed: FULL_PACK, totalDays: 8 });
    allDone(state);
    state.day = 5;
    state.power = 2;
    expect(dayCard(state).best).toBe("charge");
  });

  it("previews each choice without changing the real state", () => {
    const state = createState({ packed: FULL_PACK });
    startBuild(state, "solar");
    const before = JSON.stringify(state);
    const work = previewChoice(state, "work");
    const rest = previewChoice(state, "rest");
    expect(JSON.stringify(state)).toBe(before);
    expect(work.doseMSv).toBeGreaterThan(rest.doseMSv);
  });
});

describe("alerts: no free choice", () => {
  it("every alert option has a visible, non-zero cost", () => {
    for (const alert of Object.values(ALERTS)) {
      expect(alert.options.length).toBeGreaterThanOrEqual(2);
      for (const option of alert.options) {
        expect(option.costText, `${alert.id}/${option.id} cost text`).toBeTruthy();
        const numbers = Object.values(option.cost);
        expect(numbers.length, `${alert.id}/${option.id}`).toBeGreaterThan(0);
        expect(numbers.every((n) => typeof n === "number" && n > 0), `${alert.id}/${option.id}`).toBe(true);
      }
    }
  });

  it("every alert follows the contract, and the night is no longer a random card", () => {
    for (const alert of Object.values(ALERTS)) {
      for (const key of ["id", "title", "explain", "source", "control", "options", "buildImpact"]) expect(alert[key], `${alert.id}.${key}`).toBeDefined();
      expect(typeof alert.scoreFn).toBe("function");
    }
    for (const id of DECK_CARDS) expect(ALERTS[id]).toBeDefined();
    expect(DECK_CARDS).not.toContain("night");
  });

  it("sheltering from a flare cuts the dose, working takes it in full", () => {
    const event = { id: "flare", level: "SEP", dose: 3 };
    const a = createState({ packed: FULL_PACK });
    const b = createState({ packed: FULL_PACK });
    applyAlertResult(a, event, { option: "shelter", quality: 1 });
    applyAlertResult(b, event, { option: "work" });
    expect(a.today.eventDose).toBeCloseTo(3 * C.SHELTER_FACTOR);
    expect(b.today.eventDose).toBeCloseTo(3 * C.OUTSIDE_FACTOR);
    expect(a.today.slow).toBeLessThan(1);
  });
});

describe("daily rules", () => {
  it("supplies drain when nothing is built, and the crew is evacuated, not killed", () => {
    let state = createState({ packed: FULL_PACK, totalDays: 10 });
    while (!state.outcome) state = advanceDay(state, { action: "rest" }).state;
    expect(state.outcome.kind).toBe("evacuated");
    expect(state.outcome.cause).toBe("air"); // clean air fails first
    expect(causeChain(state).join(" ")).toMatch(/ISS/);
    expect(retryHints(state).length).toBeGreaterThan(0);
  });

  it("greenhouse food arrives two days after planting", () => {
    let state = createState({ packed: FULL_PACK, totalDays: 10 });
    state.buildings.greenhouse.status = "done";
    state.power = 8;
    const startFood = state.food;
    state = advanceDay(state, { action: "work" }).state; // day 1 planted
    expect(state.food).toBe(startFood - 1);
    state.buildings.greenhouse.on = false;
    state = advanceDay(state, { action: "work" }).state;
    expect(state.food).toBe(startFood - 2);
    state = advanceDay(state, { action: "work" }).state; // day 3: arrives
    expect(state.food).toBeCloseTo(startFood - 3 + C.OUT.food);
  });

  it("the guide line names the most urgent thing", () => {
    const state = createState({ packed: FULL_PACK });
    expect(guideLine(state).text).toMatch(/solar array/i);
    state.effects.leak = true;
    expect(guideLine(state).text).toMatch(/broken/i);
  });

  it("the checklist lists every building, the photos and the night", () => {
    const state = createState({ packed: FULL_PACK });
    const items = checklist(state);
    expect(items.map((i) => i.id)).toEqual([...REQUIRED, "photos", "night"]);
    expect(items.every((i) => !i.done)).toBe(true);
  });

  it("forecast: a full pack lasts, a pack without the air cleaner does not", () => {
    const good = forecast(FULL_PACK, 8, 2);
    expect([good.oxygen, good.air, good.water, good.food]).toEqual([null, null, null, null]);
    expect(good.roverDay).not.toBeNull();
    expect(forecast({ ...FULL_PACK, air: 0 }, 8, 2).air).not.toBeNull();
    expect(forecast({ ...FULL_PACK, solar: 0 }, 8, 2).power).not.toBeNull();
  });
});

describe("real DONKI data", () => {
  it("gives the calm date no flares and the storm date many", () => {
    const calm = donki("calm");
    const storm = donki("storm");
    expect(realEventsByDay(calm, calm.startDate, 7).filter((d) => d.alert)).toHaveLength(0);
    const stormDays = realEventsByDay(storm, storm.startDate, 7).filter((d) => d.alert);
    expect(stormDays.length).toBeGreaterThanOrEqual(5);
    expect(stormDays[0].alert.badge).toMatch(/NASA DONKI/);
  });

  it("rates calm one star, busy two, storm three", () => {
    for (const days of [5, 7, 10]) {
      expect(difficultyFor(donki("calm"), "2019-12-01", days).stars).toBe(1);
      expect(difficultyFor(donki("busy"), "2021-07-01", days).stars).toBe(2);
      expect(difficultyFor(donki("storm"), "2024-05-08", days).stars).toBe(3);
    }
  });

  it("builds the same schedule from the same seed, and a different one from another", () => {
    const file = donki("calm");
    const make = (seed) => JSON.stringify(buildSchedule({ donki: file, missionDate: file.startDate, totalDays: 10, weatherDeck: DECK_CARDS, seed }));
    expect(make(3)).toBe(make(3));
    expect(make(3)).not.toBe(make(4));
  });
});

describe("scoring", () => {
  it("scores a full success above a partial, and gives an evacuation no stars", () => {
    const win = createState({ packed: FULL_PACK });
    allDone(win);
    win.stats.daysSurvived = 8;
    win.photosTaken = 5;
    win.photos = [1, 2, 3, 4, 5].map((n) => ({ name: `c${n}`, stars: 3 }));
    win.decisions = [{ good: true }, { good: true }, { good: false }];
    win.outcome = { kind: "success", cause: null };
    const partial = structuredClone(win);
    partial.photosTaken = 2;
    partial.photos = partial.photos.slice(0, 2);
    partial.outcome = { kind: "partial", cause: "time" };
    expect(outcomeKind(win)).toBe("success");
    expect(outcomeKind(partial)).toBe("partial");
    expect(finalScore(win).total).toBeGreaterThan(finalScore(partial).total);
    expect(starGoals(win).stars).toBeGreaterThanOrEqual(1);
    expect(goodCalls(win)).toEqual({ good: 2, total: 3 });

    const lost = structuredClone(win);
    lost.outcome = { kind: "evacuated", cause: "dose" };
    expect(starGoals(lost).stars).toBe(0);
  });

  it("framing accuracy maps to 1-3 stars", () => {
    expect([framingStars(0.1), framingStars(0.6), framingStars(0.95)]).toEqual([1, 2, 3]);
    expect(PHOTO.TIME_SEC).toBeUndefined(); // the photo trips have no timer
  });
});
