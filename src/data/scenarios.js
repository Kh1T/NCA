// Mission scenarios. To add one, add an object to SCENARIOS: no other code
// needs to change. Pure data: no Phaser here, so the tests can check it.
//
// Shape of a scenario:
// {
//   id:       unique string
//   mode:     "real" (a real date from NASA records) or "custom"
//   title:    short name on the card (2-3 words)
//   icon:     an icon id from src/ui/icons.js
//   story:    one line for the card, 12 words or fewer
//   donki:    which cached DONKI file to read ("calm", "busy", "storm", "recent", "archive")
//   deck:     the extra hazard cards that can happen (ids from DECK_CARDS)
//   goals:    [{ icon, text }] shown on the briefing; "{days}" is filled in
//   difficulty: { easy, medium, hard } each { days, maxEvents, budget }
//               maxEvents = most alerts in the whole mission (null = every real event)
//   facts:    glossary ids worth reading for this mission
// }

export const DIFFICULTY_IDS = ["easy", "medium", "hard"];

/**
 * The same three levels for every real scenario. Harder = more alerts, fewer
 * points to pack with, and fewer days to build everything before the launch
 * window closes. (Checked by the balance tests: each level can be won.)
 */
export const STANDARD_DIFFICULTY = {
  easy: { days: 10, maxEvents: 2, budget: 120 },
  medium: { days: 9, maxEvents: 4, budget: 100 },
  hard: { days: 8, maxEvents: 6, budget: 90 },
};

const BASE_GOALS = [
  { icon: "calendar", text: "Survive {days} days" },
  { icon: "build", text: "Build 6 buildings" },
  { icon: "camera", text: "Photograph 5 craters" },
];

export const SCENARIOS = [
  {
    id: "calm-2019",
    mode: "real",
    title: "Calm Sun",
    icon: "moon",
    story: "December 2019: the Sun at its quietest.",
    donki: "calm",
    deck: ["meteor", "dust", "leak"],
    goals: BASE_GOALS,
    difficulty: STANDARD_DIFFICULTY,
    facts: ["space-weather", "sun"],
  },
  {
    id: "busy-2021",
    mode: "real",
    title: "Busy Sun",
    icon: "sun",
    story: "July 2021: a big flare wakes the Sun.",
    donki: "busy",
    deck: ["meteor", "dust", "comms"],
    goals: BASE_GOALS,
    difficulty: STANDARD_DIFFICULTY,
    facts: ["solar-flare", "space-weather"],
  },
  {
    id: "gannon-2024",
    mode: "real",
    title: "Solar Storm!",
    icon: "dose",
    story: "May 2024: the biggest storm in 20 years.",
    donki: "storm",
    deck: ["meteor", "temp", "comms"],
    goals: BASE_GOALS,
    difficulty: STANDARD_DIFFICULTY,
    facts: ["solar-flare", "aurora-borealis", "particle"],
  },
  {
    id: "recent",
    mode: "real",
    title: "This Month",
    icon: "calendar",
    story: "The newest space weather we saved.",
    donki: "recent",
    deck: ["meteor", "dust", "plant"],
    goals: BASE_GOALS,
    difficulty: STANDARD_DIFFICULTY,
    facts: ["space-weather"],
  },
];

/** The Custom mode: the player picks the hazards, days, events and Sun. */
export const CUSTOM = {
  id: "custom",
  mode: "custom",
  title: "Custom",
  icon: "build",
  story: "You choose the dangers.",
  goals: BASE_GOALS,
  suns: [
    { donki: "calm", title: "CALM SUN", icon: "moon" },
    { donki: "busy", title: "BUSY SUN", icon: "sun" },
    { donki: "storm", title: "STORM", icon: "dose" },
    { donki: "archive", title: "RANDOM", icon: "question" },
  ],
  days: [5, 7, 10],
  events: [2, 4, 6],
  budget: 100,
};

export function scenarioById(id) {
  if (id === CUSTOM.id) return CUSTOM;
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

/** Goals with {days} filled in. */
export function goalsFor(scenario, days) {
  return (scenario.goals ?? BASE_GOALS).map((goal) => ({ ...goal, text: goal.text.replace("{days}", String(days)) }));
}

/**
 * Turn a scenario choice into the mission settings the game runs on.
 * custom: { donki, days, events, deck } chosen by the player.
 */
export function missionFromScenario(scenario, difficulty = "medium", custom = {}) {
  if (scenario.mode === "custom") {
    return {
      scenarioId: CUSTOM.id,
      mode: "custom",
      difficulty: "custom",
      dateId: custom.donki ?? "busy",
      totalDays: custom.days ?? 7,
      maxEvents: custom.events ?? 4,
      budget: CUSTOM.budget,
      deck: custom.deck ?? ["meteor", "dust", "leak"],
    };
  }
  const level = scenario.difficulty[difficulty] ?? scenario.difficulty.medium;
  return {
    scenarioId: scenario.id,
    mode: "real",
    difficulty,
    dateId: scenario.donki,
    totalDays: level.days,
    maxEvents: level.maxEvents,
    budget: level.budget,
    deck: [...scenario.deck],
  };
}
