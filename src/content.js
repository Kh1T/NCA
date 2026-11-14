export const HOW_TO_PLAY = [
  {
    title: "One plan per sol",
    text: "Each sol is one Mars day. Read the challenge, then pick a single plan from the cards. A real crew cannot do everything at once, so committing one plan locks the others out for that sol.",
  },
  {
    title: "Costs are paid at the end of the sol",
    text: "Plan costs appear immediately on the card, but supplies are only deducted in the shift debrief. That way you can see the full result of your choice before the next sol begins.",
  },
  {
    title: "The habitat spends supplies every sol",
    text: "Each sol the crew uses 1 crew-day of air, water, and meals, plus 2 power units to keep the habitat running. Solar charging happens after that, so an empty battery is refilled the next daylight period.",
  },
  {
    title: "Storm shelter layers absorb radiation",
    text: "Shield layers are built with water and power. During a radiation sol, more layers means a smaller drop in crew health. Waiting for an answer from Earth is the slowest option, because a reply takes about 21 minutes each way.",
  },
  {
    title: "Gardens and research need patience",
    text: "A garden takes 2 grow shifts before it can be harvested into meals. Sending research to Earth costs power but earns research points, which are your score, not a currency you can spend.",
  },
  {
    title: "The mission ends two ways",
    text: "Finish all six sols and you get a handover report. If crew health reaches zero, the mission pauses and the report shows which reserve ran out first.",
  },
];

export const GLOSSARY = [
  {
    term: "Sol",
    definition: "A Mars day, about 24 hours and 39 minutes. This mission lasts six sols.",
    tag: "TIME",
  },
  {
    term: "Crew-day",
    definition: "The amount one explorer uses in a sol. Four crew means four crew-days of air, water, and meals are used every sol.",
    tag: "RESERVE",
  },
  {
    term: "Power unit",
    definition: "A simplified battery measure. Solar panels and the habitat battery add power units; systems spend them.",
    tag: "RESERVE",
  },
  {
    term: "Storm shelter layer",
    definition: "A packed layer of shielding, often water containers, that reduces radiation exposure during a solar particle event.",
    tag: "SAFETY",
  },
  {
    term: "Solar particle event",
    definition: "A burst of energetic particles from the Sun. On Mars it can arrive with only minutes of warning, so crews act locally.",
    tag: "HAZARD",
  },
  {
    term: "Global dust storm",
    definition: "A dust storm that wraps the planet and blocks sunlight. Dust dims solar panels, which is why this game tracks a dust sol.",
    tag: "HAZARD",
  },
  {
    term: "One-way light time",
    definition: "How long a radio message takes to travel between Mars and Earth, roughly 4 to 24 minutes. A round trip doubles it.",
    tag: "COMMS",
  },
  {
    term: "Water recovery loop",
    definition: "Recycling used water back into the tank. Real station systems recover most of their water, so less needs launch from Earth.",
    tag: "SYSTEM",
  },
  {
    term: "Grow shift",
    definition: "One sol of light and water for the garden. Two grow shifts are needed before a harvest adds meals.",
    tag: "SYSTEM",
  },
  {
    term: "Crew morale",
    definition: "How rested and confident the team feels. Rest and fresh food lift it; hunger and alarms lower it.",
    tag: "CREW",
  },
  {
    term: "Research points",
    definition: "Science value sent home in a data package. It measures what your crew learned, and cannot be spent on supplies.",
    tag: "CREW",
  },
  {
    term: "Jezero Crater",
    definition: "A real Mars landing site that an ancient river delta once filled with sediment and water.",
    tag: "PLACE",
  },
];
