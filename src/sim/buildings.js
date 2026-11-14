// Blueprints, kits and build rules. Pure data and functions: no Phaser here.
// Rebalance the game by changing the numbers in this file and in rules.js.

/** The six core buildings, one per resource. All must be packed to finish. */
export const CORE = ["solar", "water", "oxygen", "air", "greenhouse", "shield"];

export const MAX_ACTIVE_BUILDS = 3;

export const BUDGETS = { easy: 120, normal: 100, hard: 90 };

/**
 * kind 'building' is built on site in Phase 1 or 2. kind 'kit' works from day 1.
 * power = power units a finished building needs per day to run at full output.
 */
export const ITEMS = {
  solar: {
    id: "solar", name: "Solar array", short: "SOLAR", kind: "building", core: true,
    cost: 10, max: 1, buildDays: 1, power: 0,
    makes: "Power", needs: "Sunlight",
    tradeoff: "Useless in the long shadow or under dust.",
    learn: { label: "NASA Moon Trek", url: "https://trek.nasa.gov/moon/" },
  },
  water: {
    id: "water", name: "Water extractor", short: "WATER", kind: "building", core: true,
    cost: 12, max: 1, buildDays: 1, power: 2,
    makes: "Water", needs: "Power",
    tradeoff: "Slow, but everything else depends on it.",
    learn: { label: "NASA Moon Trek", url: "https://trek.nasa.gov/moon/" },
  },
  oxygen: {
    id: "oxygen", name: "Oxygen generator", short: "OXYGEN", kind: "building", core: true,
    cost: 15, max: 1, buildDays: 2, power: 2,
    makes: "Oxygen", needs: "Power + water",
    tradeoff: "Eats power and water. No water, no oxygen.",
    learn: { label: "NASA Artemis", url: "https://www.nasa.gov/humans-in-space/artemis/" },
  },
  air: {
    id: "air", name: "Air recycler", short: "AIR", kind: "building", core: true,
    cost: 10, max: 1, buildDays: 1, power: 1,
    makes: "Clean air", needs: "Power",
    tradeoff: "Fails quietly if it gets too little power.",
    learn: { label: "NASA ISS", url: "https://www.nasa.gov/international-space-station/" },
  },
  greenhouse: {
    id: "greenhouse", name: "Greenhouse", short: "FOOD", kind: "building", core: true,
    cost: 14, max: 1, buildDays: 2, power: 2,
    makes: "Food", needs: "Power + water + time",
    tradeoff: "Food planted today arrives 2 days later.",
    learn: { label: "CSA food production", url: "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/" },
  },
  shield: {
    id: "shield", name: "Shield wall", short: "SHIELD", kind: "building", core: true,
    cost: 12, max: 1, buildDays: 2, power: 0,
    makes: "Radiation shielding", needs: "Build time",
    tradeoff: "Points and days you cannot spend on food.",
    learn: { label: "NASA radiation brief", url: "https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf" },
  },
  rover: {
    id: "rover", name: "Rover + camera", short: "ROVER", kind: "building", core: false, required: true,
    cost: 12, max: 1, buildDays: 2, power: 0,
    makes: "The photo mission", needs: "All six buildings first",
    tradeoff: "You take extra radiation outside.",
    learn: { label: "NASA Image Library", url: "https://images.nasa.gov/" },
  },
  antenna: {
    id: "antenna", name: "Big antenna", short: "ANTENNA", kind: "building", core: false,
    cost: 8, max: 1, buildDays: 1, power: 0,
    makes: "Double science, faster Earth calls", needs: "Science power",
    tradeoff: "Only helps if you spend power on science.",
    learn: null,
  },
  battery: {
    id: "battery", name: "Battery pack", short: "BATTERY", kind: "kit", core: false,
    cost: 8, max: 3,
    makes: "Stores 8 more power", needs: "Nothing",
    tradeoff: "Stores power. Does not make any.",
    learn: null,
  },
  spares: {
    id: "spares", name: "Spare parts kit", short: "SPARES", kind: "kit", core: false,
    cost: 4, max: 3,
    makes: "One instant repair", needs: "Nothing",
    tradeoff: "Wasted points if nothing breaks.",
    learn: null,
  },
  foodpack: {
    id: "foodpack", name: "Food crate", short: "FOOD CRATE", kind: "kit", core: false,
    cost: 6, max: 3,
    makes: "2 more days of food", needs: "Nothing",
    tradeoff: "Never fails, but it runs out.",
    learn: null,
  },
};

export const ITEM_ORDER = [
  "solar", "water", "oxygen", "air", "greenhouse", "shield", "rover", "antenna", "battery", "spares", "foodpack",
];

/** Order the helper robot suggests building in. */
export const BUILD_ORDER = ["solar", "water", "air", "oxygen", "greenhouse", "shield", "antenna", "rover"];

export function packCost(packed) {
  return Object.entries(packed).reduce((sum, [id, count]) => sum + (ITEMS[id]?.cost ?? 0) * count, 0);
}

/** The safe pack the Starter plan button fills in, then extras while points last. */
export function starterPlan(budget) {
  const packed = {};
  for (const id of [...CORE, "rover"]) packed[id] = 1;
  for (const id of ["battery", "spares", "foodpack", "antenna", "spares", "battery"]) {
    const next = { ...packed, [id]: (packed[id] ?? 0) + 1 };
    if (next[id] <= ITEMS[id].max && packCost(next) <= budget) packed[id] = next[id];
  }
  return packed;
}

/** Warnings, never blocks: the player may still fly with a risky pack. */
export function packWarnings(packed) {
  const has = (id) => (packed[id] ?? 0) > 0;
  const warnings = [];
  if (!has("solar")) warnings.push("No solar array: only the ship's small power supply.");
  if (!has("water")) warnings.push("No water extractor: water runs out around Day 5.");
  if (!has("oxygen")) warnings.push("No oxygen generator: oxygen runs out around Day 6.");
  if (has("oxygen") && !has("water")) warnings.push("Oxygen generator without water makes nothing.");
  if (!has("air")) warnings.push("No air recycler: clean air runs out around Day 5.");
  if (!has("greenhouse")) warnings.push("No greenhouse: only packed food.");
  if (!has("shield")) warnings.push("No shield wall: more radiation outside.");
  if (!has("rover")) warnings.push("No rover: you cannot reach the craters.");
  if (CORE.some((id) => !has(id)) && has("rover")) warnings.push("The rover unlocks only after all six buildings.");
  return warnings;
}

export function activeBuilds(state) {
  return state.buildQueue.filter((id) => state.buildings[id]?.status === "building");
}

export function coreDone(state) {
  return CORE.every((id) => state.buildings[id]?.status === "done");
}

/** @returns {{ok: boolean, reason?: string}} */
export function canStartBuild(state, id) {
  const building = state.buildings[id];
  if (!building || !building.packed) return { ok: false, reason: "No blueprint packed for this." };
  if (building.status === "done") return { ok: false, reason: "Already built." };
  if (building.status === "building") return { ok: false, reason: "Already being built." };
  if (id === "rover" && !coreDone(state)) return { ok: false, reason: "Finish all six buildings first." };
  if (activeBuilds(state).length >= MAX_ACTIVE_BUILDS) return { ok: false, reason: "Only 3 builds at once." };
  return { ok: true };
}

/** Mutates state. Returns the same {ok, reason} as canStartBuild. */
export function startBuild(state, id) {
  const check = canStartBuild(state, id);
  if (!check.ok) return check;
  const building = state.buildings[id];
  building.status = "building";
  building.daysLeft = ITEMS[id].buildDays;
  building.startedDay = state.day;
  state.buildQueue.push(id);
  state.log.push({ day: state.day, type: "build-start", id });
  return check;
}

/** Stop a build and free its slot. Progress is lost: that is the cost. */
export function cancelBuild(state, id) {
  const building = state.buildings[id];
  if (!building || building.status !== "building") return false;
  building.status = "idle";
  building.daysLeft = ITEMS[id].buildDays;
  state.buildQueue = state.buildQueue.filter((queued) => queued !== id);
  state.log.push({ day: state.day, type: "build-cancel", id });
  return true;
}
