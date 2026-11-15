// "Max ~12 words per on-screen message": every player-facing line that comes
// from the rules engine or the content files is checked here. The Science
// Sources pages (for teachers and parents) and the glossary are exempt from
// the 12-word rule; glossary definitions get a looser 20-word limit.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GLOSSARY, glossaryEntry } from "../../data/glossary.js";
import { INFO } from "../../data/info.js";
import { CORE, ITEMS, packWarnings, startBuild } from "../buildings.js";
import { ALERTS, alertsForToday, applyAlertResult, buildSchedule, onAlertStart } from "../events.js";
import { advanceDay, autoBuild, autoPlan, guideLine } from "../rules.js";
import { causeChain, retryHints } from "../scoring.js";
import { createState } from "../state.js";

const MAX = 12;
const words = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;
const FULL = { solar: 1, water: 1, oxygen: 1, air: 1, greenhouse: 1, shield: 1, rover: 1, spares: 1 };
const donki = (id) => JSON.parse(fs.readFileSync(path.resolve("public/data/donki", `${id}.json`), "utf8"));

function expectShort(lines, max = MAX) {
  const long = [...new Set(lines)].filter((line) => line && words(line) > max);
  expect(long, `Too long (over ${max} words):\n${long.join("\n")}`).toEqual([]);
}

describe("on-screen text stays short", () => {
  it("info cards: 1-3 lines, each 12 words or fewer", () => {
    for (const [id, entry] of Object.entries(INFO)) {
      expect(entry.lines.length, id).toBeGreaterThan(0);
      expect(entry.lines.length, id).toBeLessThanOrEqual(3);
      expectShort([entry.title, ...entry.lines]);
    }
  });

  it("alerts: titles, lines, choices and every result", () => {
    const lines = [];
    for (const def of Object.values(ALERTS)) {
      lines.push(def.title, def.explain, ...def.options.map((o) => o.label));
      for (const option of def.options) {
        for (const quality of [0, 0.4, 1]) {
          for (const level of ["M", "X", "SEP"]) {
            const state = createState({ packed: FULL });
            for (const id of CORE) state.buildings[id].status = "done";
            const event = { id: def.id, level, dose: 1, targetId: "solar", guessedRight: quality > 0.5 };
            lines.push(applyAlertResult(state, event, { option: option.id, quality, refill: 0.5 }).note);
          }
        }
      }
    }
    expectShort(lines);
  });

  it("buildings, warnings and the guide line", () => {
    const lines = Object.values(ITEMS).map((item) => item.tradeoff);
    for (const packed of [{}, { oxygen: 1 }, { rover: 1 }, FULL]) lines.push(...packWarnings(packed));
    const state = createState({ packed: FULL });
    lines.push(guideLine(state).text);
    startBuild(state, "solar");
    lines.push(guideLine(state).text);
    state.air = 1;
    lines.push(guideLine(state).text);
    state.buildings.air.status = "done";
    lines.push(guideLine(state).text);
    state.buildings.solar.status = "done";
    state.buildings.solar.health = 50;
    lines.push(guideLine(state).text);
    expectShort(lines);
  });

  it("day reports, notices and the debrief", () => {
    const lines = [];
    for (const dateId of ["busy", "storm"]) {
      const file = donki(dateId);
      const schedule = buildSchedule({ donki: file, missionDate: file.startDate, totalDays: 9, weatherDeck: ["night", "leak", "dust", "temp", "plant", "comms", "meteor"], seed: 5 });
      let state = createState({ packed: FULL, missionDate: file.startDate, totalDays: 9, seed: 5, schedule });
      while (!state.outcome && state.day <= 9) {
        autoBuild(state);
        const today = alertsForToday(state);
        lines.push(...today.notices.map((n) => n.text));
        for (const event of today.alerts) {
          onAlertStart(state, event);
          applyAlertResult(state, event, { option: ALERTS[event.id].options[1]?.id ?? ALERTS[event.id].options[0].id, quality: 0.5 });
        }
        const result = advanceDay(state, autoPlan(state));
        lines.push(...result.report.notes);
        state = result.state;
      }
      lines.push(...causeChain(state), ...retryHints(state));
    }
    for (const cause of ["air", "oxygen", "water", "food", "dose", "timer"]) {
      const state = createState({ packed: FULL });
      state.outcome = { kind: "evacuated", cause };
      state.log.push({ day: 3, type: "evacuated" });
      lines.push(...causeChain(state), ...retryHints(state));
    }
    expectShort(lines);
  });

  it("glossary: every entry is short, and every link from an info card exists", () => {
    expectShort(GLOSSARY.map((entry) => entry.def), 20);
    for (const [id, entry] of Object.entries(INFO)) {
      if (entry.glossary) expect(glossaryEntry(entry.glossary), `${id} -> ${entry.glossary}`).not.toBeNull();
    }
  });

  it("glossary covers all 67 NASA Space Place topics, with unique ids", () => {
    expect(GLOSSARY.filter((entry) => entry.source === "spaceplace")).toHaveLength(67);
    expect(new Set(GLOSSARY.map((entry) => entry.id)).size).toBe(GLOSSARY.length);
  });
});
