import { describe, expect, it } from "vitest";
import { BADGES, newlyEarned } from "../../data/badges.js";
import { REQUIRED } from "../buildings.js";
import { createState } from "../state.js";

const FULL = { solar: 1, oxygen: 1, air: 1, greenhouse: 1, shield: 1, rover: 1 };
const words = (text) => text.trim().split(/\s+/).length;

/** A finished, winning mission with everything that badges look for. */
function winningState(extra = {}) {
  const state = createState({ packed: FULL });
  for (const id of REQUIRED) state.buildings[id].status = "done";
  state.log.push({ day: 1, type: "build-done", id: "solar" });
  state.stats.shelters = 2;
  state.stats.foodGrown = 3;
  state.photosTaken = 5;
  state.photos = [{ name: "A", stars: 3 }];
  state.science = 25;
  state.doseMSv = 3;
  state.decisions = [{ good: true }];
  state.outcome = { kind: "success", cause: null };
  return Object.assign(state, extra);
}

describe("badges", () => {
  it("have unique ids and short titles and how-to lines", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const badge of BADGES) {
      expect(words(badge.title)).toBeLessThanOrEqual(3);
      expect(words(badge.how)).toBeLessThanOrEqual(12);
    }
  });

  it("a fresh mission earns nothing", () => {
    expect(newlyEarned(createState({ packed: FULL }), "day")).toEqual([]);
  });

  it("every badge can be earned by some winning mission", () => {
    const earned = new Set();
    for (const scenarioId of ["calm-2019", "busy-2021", "gannon-2024", "recent"]) {
      for (const badge of newlyEarned(winningState({ scenarioId }), "end")) earned.add(badge.id);
    }
    expect([...earned].sort()).toEqual(BADGES.map((b) => b.id).sort());
  });

  it("end-of-mission badges wait for the end, and evacuations win nothing at the end", () => {
    const state = winningState({ scenarioId: "busy-2021" });
    const duringDay = newlyEarned(state, "day").map((b) => b.id);
    expect(duringDay).not.toContain("busy-sun");
    expect(duringDay).toContain("first-build");
    state.outcome = { kind: "evacuated", cause: "air" };
    const atEnd = newlyEarned(state, "end").map((b) => b.id);
    expect(atEnd).not.toContain("busy-sun");
    expect(atEnd).not.toContain("smart-chief");
  });

  it("skips badges that are already unlocked", () => {
    const state = winningState();
    expect(newlyEarned(state, "day", { "first-build": "2026-11-15" }).map((b) => b.id)).not.toContain("first-build");
  });
});
