// Mission scenarios. To add one, add an object to SCENARIOS: no other code
// needs to change. Pure data: no Phaser here, so the tests can check it.
//
// The four missions are also the difficulty ladder (stars), so there is no
// separate difficulty picker.
//
// Shape of a scenario:
// {
//   id:        unique string
//   title:     short name on the card (2-3 words)
//   icon:      an icon id from src/ui/icons.js
//   story:     one line for the card, 12 words or fewer
//   stars:     1-3, how hard it is
//   donki:     which cached DONKI file to read ("calm", "busy", "storm", "recent")
//   deck:      the extra hazard cards that can happen (ids from DECK_CARDS)
//   days:      mission length; the lunar night is the last `nightDays` days
//   nightDays: how long the lunar night lasts
//   maxEvents: most alerts in the whole mission
//   budget:    points to pack the ship with
//   info:      the info card id for the card's "i" button
//   tip:       the best move for this mission, shown in the debrief (12 words max)
// }

export const SCENARIOS = [
  {
    id: "calm-2019",
    title: "Calm Sun",
    icon: "moon",
    story: "December 2019: the Sun at its quietest.",
    stars: 1,
    donki: "calm",
    deck: ["meteor", "dust"],
    days: 8,
    nightDays: 2,
    maxEvents: 2,
    budget: 110,
    info: "mission.calm",
    tip: "A calm Sun: build fast and keep every slot busy.",
  },
  {
    id: "busy-2021",
    title: "Busy Sun",
    icon: "sun",
    story: "July 2021: a big flare wakes the Sun.",
    stars: 2,
    donki: "busy",
    deck: ["meteor", "dust", "comms"],
    days: 8,
    nightDays: 2,
    maxEvents: 3,
    budget: 100,
    info: "mission.busy",
    tip: "Hide from flares, then build hard on quiet days.",
  },
  {
    id: "recent",
    title: "This Month",
    icon: "calendar",
    story: "The newest space weather we saved.",
    stars: 2,
    donki: "recent",
    deck: ["meteor", "dust", "plant"],
    days: 8,
    nightDays: 2,
    maxEvents: 3,
    budget: 100,
    info: "mission.recent",
    tip: "Real, recent space weather: check the Sun and plan ahead.",
  },
  {
    id: "gannon-2024",
    title: "Solar Storm!",
    icon: "dose",
    story: "May 2024: the biggest storm in 20 years.",
    stars: 3,
    donki: "storm",
    deck: ["meteor", "temp"],
    days: 9,
    nightDays: 3,
    maxEvents: 4,
    budget: 100,
    info: "mission.storm",
    tip: "Shelter from big storms and charge up for the long night.",
  },
];

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}

/** Turn a scenario into the mission settings the game runs on. */
export function missionFromScenario(scenario) {
  return {
    scenarioId: scenario.id,
    dateId: scenario.donki,
    totalDays: scenario.days,
    nightDays: scenario.nightDays,
    maxEvents: scenario.maxEvents,
    budget: scenario.budget,
    deck: [...scenario.deck],
  };
}
