// Dev tool: prints a day-by-day trace of the helper plan on a date preset.
// Usage: node scripts/balance-trace.js [calm|busy|storm|recent] [days] [shelter|work] [deck:all|none] [seed]
import fs from "node:fs";
import { ALERTS, DECK_CARDS, alertsForToday, applyAlertResult, buildSchedule, onAlertStart } from "../src/sim/events.js";
import { advanceDay, autoBuild, autoPlan } from "../src/sim/rules.js";
import { createState } from "../src/sim/state.js";

const [dateId = "calm", days = "7", flareChoice = "smart", deckArg = "none", seedArg = "7"] = process.argv.slice(2);
const totalDays = Number(days);
const file = JSON.parse(fs.readFileSync(new URL(`../public/data/donki/${dateId}.json`, import.meta.url), "utf8"));
const deck = deckArg === "all" ? DECK_CARDS : [];
const packed = { solar: 1, water: 1, oxygen: 1, air: 1, greenhouse: 1, shield: 1, rover: 1 };
const schedule = buildSchedule({ donki: file, missionDate: file.startDate, totalDays, weatherDeck: deck, seed: Number(seedArg) });
let state = createState({ packed, weatherDeck: deck, missionDate: file.startDate, totalDays, seed: Number(seedArg), schedule });

console.log("day  pow  oxy  air  wat  food dose  sci  builds / events");
while (!state.outcome && state.day <= totalDays) {
  autoBuild(state);
  const events = [];
  for (const event of alertsForToday(state).alerts) {
    onAlertStart(state, event);
    const urgent = ["oxygen", "air", "water"].some((key) => state[key] < 2.2 && state.buildings[key].status !== "done");
    // A pattern like "wwssw" gives one choice per mission day (w = work, s = shelter).
    const byDay = /^[ws]+$/.test(flareChoice) ? (flareChoice[state.day - 1] === "w" ? "work" : "shelter") : null;
    const flare = byDay ?? (flareChoice === "smart" ? (urgent ? "work" : "shelter") : flareChoice);
    const option = event.id === "flare" ? flare : ALERTS[event.id].options[0].id;
    applyAlertResult(state, event, { option, quality: 1, refill: 0.5 });
    events.push(event.id === "flare" ? `flare:${event.level}:${option}` : event.id);
  }
  const { state: next, report } = advanceDay(state, autoPlan(state));
  const f = (n) => String(n.toFixed(1)).padStart(4);
  console.log(`${String(report.day).padStart(3)} ${f(next.power)} ${f(next.oxygen)} ${f(next.air)} ${f(next.water)} ${f(next.food)} ${f(next.doseMSv)} ${f(next.science)}  done:[${report.completed}] active:[${next.buildQueue}] ${events.join(",")} alloc:${JSON.stringify(report.alloc)} ${report.action}`);
  state = next;
  if (state.buildings.rover.status === "done") break;
}
console.log("outcome:", JSON.stringify(state.outcome), "rover:", state.buildings.rover.status, "day", state.buildings.rover.doneDay);
