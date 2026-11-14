import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUDGETS, CORE, ITEMS, MAX_ACTIVE_BUILDS, canStartBuild, packCost, packWarnings, startBuild, starterPlan } from "../buildings.js";
import { difficultyFor } from "../difficulty.js";
import { ALERTS, DECK_CARDS, alertsForToday, applyAlertResult, buildSchedule, onAlertStart, realEventsByDay } from "../events.js";
import { C, advanceDay, autoBuild, autoPlan, clampAlloc, forecast, framingStars, guideLine, powerBudget } from "../rules.js";
import { causeChain, finalScore, outcomeKind, retryHints, starGoals } from "../scoring.js";
import { createState } from "../state.js";

const FULL_PACK = { solar: 1, water: 1, oxygen: 1, air: 1, greenhouse: 1, shield: 1, rover: 1 };
const donki = (id) => JSON.parse(fs.readFileSync(path.resolve("public/data/donki", `${id}.json`), "utf8"));

/** Play a whole base phase with the helper plan and one fixed answer to every alert. */
// shelter: true = always, false = never, "smart" = shelter unless a supply is about to run out.
function playBase({ dateId = "calm", totalDays = 7, deck = [], packed = FULL_PACK, shelter = "smart", seed = 7, stopDay = 99 }) {
  const file = donki(dateId);
  const schedule = buildSchedule({ donki: file, missionDate: file.startDate, totalDays, weatherDeck: deck, seed });
  let state = createState({ packed, weatherDeck: deck, missionDate: file.startDate, totalDays, seed, schedule });
  while (!state.outcome && state.day <= totalDays) {
    autoBuild(state);
    for (const event of alertsForToday(state).alerts) {
      onAlertStart(state, event);
      const def = ALERTS[event.id];
      const urgent = ["oxygen", "air", "water"].some((key) => state[key] < 2.2 && state.buildings[key].status !== "done");
      // A string like "wsswws" gives one flare choice per day (w = work, s = shelter).
      const byDay = typeof shelter === "string" && /^[ws]+$/.test(shelter) ? shelter[state.day - 1] !== "w" : null;
      const hide = byDay ?? (shelter === "smart" ? !urgent : shelter);
      const option = event.id === "flare" ? (hide ? "shelter" : "work") : def.options[0].id;
      applyAlertResult(state, event, { option, quality: 1, refill: 0.5 });
    }
    state = advanceDay(state, autoPlan(state)).state;
    if (state.buildings.rover.status === "done" || state.day > stopDay) break;
  }
  return state;
}

describe("blueprints and budget", () => {
  it("lets every difficulty pack the six buildings and the rover", () => {
    const needed = packCost(FULL_PACK);
    for (const budget of Object.values(BUDGETS)) expect(needed).toBeLessThanOrEqual(budget);
  });

  it("forces a trade-off: nobody can pack everything", () => {
    const everything = Object.fromEntries(Object.values(ITEMS).map((item) => [item.id, item.max]));
    expect(packCost(everything)).toBeGreaterThan(BUDGETS.easy);
  });

  it("starter plan fits the budget and includes all required items", () => {
    for (const budget of Object.values(BUDGETS)) {
      const plan = starterPlan(budget);
      expect(packCost(plan)).toBeLessThanOrEqual(budget);
      for (const id of [...CORE, "rover"]) expect(plan[id]).toBe(1);
    }
  });

  it("warns but does not block a risky pack", () => {
    expect(packWarnings(FULL_PACK)).toEqual([]);
    expect(packWarnings({ ...FULL_PACK, water: 0 }).join(" ")).toMatch(/water/i);
  });
});

describe("build rules", () => {
  it("allows at most 3 builds at once", () => {
    const state = createState({ packed: FULL_PACK });
    expect(startBuild(state, "solar").ok).toBe(true);
    expect(startBuild(state, "water").ok).toBe(true);
    expect(startBuild(state, "oxygen").ok).toBe(true);
    const fourth = startBuild(state, "air");
    expect(fourth.ok).toBe(false);
    expect(state.buildQueue).toHaveLength(MAX_ACTIVE_BUILDS);
  });

  it("keeps the rover locked until all six buildings are done", () => {
    const state = createState({ packed: FULL_PACK });
    expect(canStartBuild(state, "rover").ok).toBe(false);
    for (const id of CORE.slice(0, 5)) state.buildings[id].status = "done";
    expect(canStartBuild(state, "rover").ok).toBe(false);
    state.buildings[CORE[5]].status = "done";
    expect(canStartBuild(state, "rover").ok).toBe(true);
  });

  it("cannot build what was not packed", () => {
    const state = createState({ packed: { ...FULL_PACK, antenna: 0 } });
    expect(canStartBuild(state, "antenna").ok).toBe(false);
  });

  it("weather slows a build, and sheltering pauses it", () => {
    const base = createState({ packed: FULL_PACK });
    startBuild(base, "oxygen"); // 2 days
    const normal = advanceDay(base, autoPlan(base)).state;
    expect(normal.buildings.oxygen.daysLeft).toBe(1);

    const cold = structuredClone(base);
    applyAlertResult(cold, { id: "temp" }, { option: "heat0" });
    expect(advanceDay(cold, autoPlan(cold)).state.buildings.oxygen.daysLeft).toBeGreaterThan(1);

    const flare = structuredClone(base);
    applyAlertResult(flare, { id: "flare", level: "SEP", dose: 3 }, { option: "shelter", quality: 1 });
    expect(advanceDay(flare, autoPlan(flare)).state.buildings.oxygen.daysLeft).toBe(2);
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

  it("every alert follows the contract and every deck card has an alert", () => {
    for (const alert of Object.values(ALERTS)) {
      for (const key of ["id", "title", "explain", "source", "control", "options", "buildImpact"]) expect(alert[key], `${alert.id}.${key}`).toBeDefined();
      expect(typeof alert.scoreFn).toBe("function");
    }
    for (const id of DECK_CARDS) expect(ALERTS[id]).toBeDefined();
  });

  it("sheltering from a flare cuts the dose, working takes it in full", () => {
    const event = { id: "flare", level: "SEP", dose: 3 };
    const a = createState({ packed: FULL_PACK });
    const b = createState({ packed: FULL_PACK });
    applyAlertResult(a, event, { option: "shelter", quality: 1 });
    applyAlertResult(b, event, { option: "work" });
    expect(a.today.eventDose).toBeCloseTo(3 * C.SHELTER_FACTOR);
    expect(b.today.eventDose).toBeCloseTo(3 * C.OUTSIDE_FACTOR);
    expect(a.today.pause).toBe(true);
  });
});

describe("daily rules", () => {
  it("ship stocks drain when nothing is built, and the crew is evacuated, not killed", () => {
    let state = createState({ packed: FULL_PACK, totalDays: 10 });
    while (!state.outcome) state = advanceDay(state, {}).state;
    expect(state.outcome.kind).toBe("evacuated");
    expect(state.outcome.cause).toBe("air"); // clean air fails first
    expect(state.day - 1).toBe(5);
    expect(state.oxygen).toBeGreaterThan(0);
    expect(causeChain(state).join(" ")).toMatch(/ISS/);
    expect(retryHints(state).length).toBeGreaterThan(0);
  });

  it("an oxygen generator without water makes nothing", () => {
    const state = createState({ packed: FULL_PACK });
    state.buildings.oxygen.status = "done";
    state.water = 0;
    state.power = 8;
    const next = advanceDay(state, { alloc: { life: 2 } }).state;
    expect(next.oxygen).toBe(C.START.oxygen - 1);
  });

  it("greenhouse food arrives two days after planting", () => {
    let state = createState({ packed: FULL_PACK, totalDays: 10 });
    state.buildings.greenhouse.status = "done";
    state.power = 8;
    const startFood = state.food;
    state = advanceDay(state, { alloc: { greenhouse: 2 } }).state; // day 1 planted
    expect(state.food).toBe(startFood - 1);
    state = advanceDay(state, { alloc: { greenhouse: 0 } }).state; // day 2
    expect(state.food).toBe(startFood - 2);
    state = advanceDay(state, { alloc: { greenhouse: 0 } }).state; // day 3: arrives
    expect(state.food).toBeCloseTo(startFood - 3 + C.OUT.food);
  });

  it("sliders can never spend more than the power budget", () => {
    const state = createState({ packed: FULL_PACK });
    for (const id of CORE) state.buildings[id].status = "done";
    const alloc = clampAlloc(state, { life: 99, greenhouse: 99, shield: 99, science: 99 });
    const total = Object.values(alloc).reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(powerBudget(state));
  });

  it("the guide line names the most urgent thing", () => {
    const state = createState({ packed: FULL_PACK });
    expect(guideLine(state).text).toMatch(/solar array/i);
    state.air = 1;
    expect(guideLine(state).focus).toBe("air");
    state.effects.leak = true;
    expect(guideLine(state).text).toMatch(/broken/i);
  });

  it("forecast: a full pack lasts, a pack without water does not", () => {
    const good = forecast(FULL_PACK, 10);
    expect([good.oxygen, good.air, good.water, good.food]).toEqual([null, null, null, null]);
    expect(good.roverDay).not.toBeNull();
    const bad = forecast({ ...FULL_PACK, water: 0 }, 10);
    expect(bad.water).not.toBeNull();
    expect(forecast({ ...FULL_PACK, water: 0 }, 14).oxygen).not.toBeNull();
    expect(forecast({ ...FULL_PACK, solar: 0 }, 10).power).not.toBeNull();
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

describe("balance: calm is easy, storm is hard", () => {
  it("the helper plan reaches the rover on the calm and busy dates", () => {
    for (const dateId of ["calm", "busy"]) {
      for (const totalDays of [7, 10]) {
        const state = playBase({ dateId, totalDays });
        expect(state.outcome, `${dateId}/${totalDays}: ${JSON.stringify(state.outcome)}`).toBeNull();
        expect(state.buildings.rover.status).toBe("done");
      }
    }
  });

  it("the storm can be won by mixing shelter and work, but it takes longer", () => {
    const calm = playBase({ dateId: "calm", totalDays: 10 });
    const storm = playBase({ dateId: "storm", totalDays: 10, shelter: "wsswwsssss" });
    expect(storm.outcome).toBeNull();
    expect(storm.doseMSv).toBeLessThan(storm.doseLimit);
    expect(storm.buildings.rover.doneDay).toBeGreaterThan(calm.buildings.rover.doneDay);
  });

  it("always sheltering in the storm ends in evacuation: shelter has a real cost", () => {
    const state = playBase({ dateId: "storm", totalDays: 10, shelter: true });
    expect(state.outcome?.kind).toBe("evacuated");
  });

  it("never sheltering in the storm costs far more dose", () => {
    const safe = playBase({ dateId: "storm", totalDays: 10, shelter: true, stopDay: 3 });
    const reckless = playBase({ dateId: "storm", totalDays: 10, shelter: false, stopDay: 3 });
    expect(reckless.doseMSv).toBeGreaterThan(safe.doseMSv * 2);
  });

  it("survives a full weather deck on the calm date", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const state = playBase({ dateId: "calm", totalDays: 10, deck: DECK_CARDS, seed });
      expect(state.outcome?.kind, `seed ${seed}: ${JSON.stringify(state.outcome)}`).not.toBe("evacuated");
    }
  });
});

describe("scoring", () => {
  it("scores a full success above a partial, and gives an evacuation no stars", () => {
    const win = playBase({ dateId: "calm", totalDays: 7 });
    win.photosTaken = 5;
    win.photos = [1, 2, 3, 4, 5].map((n) => ({ name: `c${n}`, stars: 3 }));
    win.outcome = { kind: "success", cause: null };
    const partial = structuredClone(win);
    partial.photosTaken = 2;
    partial.photos = partial.photos.slice(0, 2);
    partial.outcome = { kind: "partial", cause: "returned" };
    expect(outcomeKind(win)).toBe("success");
    expect(outcomeKind(partial)).toBe("partial");
    expect(finalScore(win).total).toBeGreaterThan(finalScore(partial).total);
    expect(starGoals(win).stars).toBeGreaterThanOrEqual(1);

    const lost = structuredClone(win);
    lost.outcome = { kind: "evacuated", cause: "timer" };
    expect(starGoals(lost).stars).toBe(0);
  });

  it("framing accuracy maps to 1-3 stars", () => {
    expect([framingStars(0.1), framingStars(0.6), framingStars(0.95)]).toEqual([1, 2, 3]);
  });
});
