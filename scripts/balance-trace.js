// Play one mission with a simple bot and print each day. For balancing.
// node scripts/balance-trace.js [scenarioId] [best|work|nocharge|shelter] [seed]
import fs from "node:fs";
import path from "node:path";
import { missionStartDate } from "../src/data/nasa.js";
import { SCENARIOS, missionFromScenario, scenarioById } from "../src/data/scenarios.js";
import { starterPlan } from "../src/sim/buildings.js";
import { ALERTS, alertsForToday, applyAlertResult, buildSchedule, onAlertStart } from "../src/sim/events.js";
import { PHOTO, advanceDay, autoBuild, dayCard, recordChoice } from "../src/sim/rules.js";
import { createState } from "../src/sim/state.js";

const [id = SCENARIOS[0].id, bot = "best", seedArg = "11"] = process.argv.slice(2);
const mission = missionFromScenario(scenarioById(id));
const file = JSON.parse(fs.readFileSync(path.resolve("public/data/donki", `${mission.dateId}.json`), "utf8"));
const seed = Number(seedArg);
const missionDate = missionStartDate(file, mission.dateId, mission.totalDays, 0.5);
const schedule = buildSchedule({ donki: file, missionDate, totalDays: mission.totalDays, weatherDeck: mission.deck, seed, maxEvents: mission.maxEvents });
let state = createState({ packed: starterPlan(mission.budget), weatherDeck: mission.deck, missionDate, totalDays: mission.totalDays, nightDays: mission.nightDays, seed, schedule });

while (!state.outcome) {
  autoBuild(state);
  const card = dayCard(state);
  let action = card.best;
  if (bot === "work") action = card.options.includes("work") ? "work" : card.options[0];
  if (bot === "nocharge" && (action === "charge" || action === "save")) action = card.options.find((o) => o !== "charge" && o !== "save");
  recordChoice(state, card, action);
  const alerts = alertsForToday(state).alerts;
  for (const event of alerts) {
    onAlertStart(state, event);
    const smartWork = bot === "smart" && event.level === "M";
    const option = event.id === "flare" ? (bot === "work" || smartWork ? "work" : "shelter") : ALERTS[event.id].options[0].id;
    applyAlertResult(state, event, { option, quality: 1, refill: 0.5 });
  }
  if (action === "trip") state.photosTaken = Math.min(PHOTO.TARGETS, state.photosTaken + 3);
  const day = state.day;
  const { state: next, report } = advanceDay(state, { action });
  state = next;
  const f = (n) => String(Math.round(n * 10) / 10).padStart(4);
  console.log(`D${day}${day >= state.nightStart ? "N" : " "} ${card.id.padEnd(6)} ${action.padEnd(6)} pw${f(state.power)}/${state.batteryCap} O${f(state.oxygen)} A${f(state.air)} W${f(state.water)} F${f(state.food)} dose${f(state.doseMSv)} built:${Object.keys(state.buildings).filter((b) => state.buildings[b].status === "done").length} ph${state.photosTaken} ${alerts.map((a) => a.id).join(",")} ${report.short ? "SHORT" : ""}`);
}
console.log("outcome", JSON.stringify(state.outcome));
