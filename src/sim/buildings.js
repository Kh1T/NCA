// Blueprints, kits and build rules. Pure data and functions: no Phaser here.
// Rebalance the game by changing the numbers in this file and in rules.js.

/** The five core buildings. All must be built to win. */
export const CORE = ["solar", "oxygen", "air", "greenhouse", "shield"];

/** Everything the win needs: the core plus the rover. */
export const REQUIRED = [...CORE, "rover"];

export const MAX_ACTIVE_BUILDS = 3;

export const BUDGETS = { easy: 110, normal: 100, hard: 95 };

/**
 * kind 'building' is built on site. kind 'kit' works from day 1.
 * power = power units a finished building needs per day to run at full output.
 */
export const ITEMS = {
  solar: {
    id: "solar", name: "Solar array", short: "SOLAR", kind: "building", core: true,
    cost: 10, max: 1, buildDays: 1, power: 0,
    makes: "Power", needs: "Sunlight",
    tradeoff: "Makes nothing at night or under dust.",
  },
  oxygen: {
    id: "oxygen", name: "Oxygen maker", short: "OXYGEN", kind: "building", core: true,
    cost: 15, max: 1, buildDays: 2, power: 2,
    makes: "Oxygen", needs: "Power + water",
    tradeoff: "Uses power and a little water.",
  },
  air: {
    id: "air", name: "Air cleaner", short: "AIR", kind: "building", core: true,
    cost: 10, max: 1, buildDays: 1, power: 1,
    makes: "Clean air", needs: "Power",
    tradeoff: "Stops working without power.",
  },
  greenhouse: {
    id: "greenhouse", name: "Greenhouse", short: "FOOD", kind: "building", core: true,
    cost: 14, max: 1, buildDays: 2, power: 2,
    makes: "Food", needs: "Power + water + time",
    tradeoff: "Food planted today arrives 2 days later.",
  },
  shield: {
    id: "shield", name: "Shield wall", short: "SHIELD", kind: "building", core: true,
    cost: 12, max: 1, buildDays: 1, power: 0,
    makes: "Radiation shielding", needs: "Build time",
    tradeoff: "Takes a build slot, makes no supplies.",
  },
  rover: {
    id: "rover", name: "Rover", short: "ROVER", kind: "building", core: false, required: true,
    cost: 12, max: 1, buildDays: 2, power: 0,
    makes: "Photo trips", needs: "Build time",
    tradeoff: "Trips take power and some radiation.",
  },
  battery: {
    id: "battery", name: "Battery pack", short: "BATTERY", kind: "kit", core: false,
    cost: 8, max: 3,
    makes: "Stores 8 more power", needs: "Nothing",
    tradeoff: "Stores power. Does not make any.",
  },
  spares: {
    id: "spares", name: "Spare parts", short: "SPARES", kind: "kit", core: false,
    cost: 4, max: 3,
    makes: "One instant repair", needs: "Nothing",
    tradeoff: "Wasted points if nothing breaks.",
  },
  foodpack: {
    id: "foodpack", name: "Food crate", short: "FOOD CRATE", kind: "kit", core: false,
    cost: 6, max: 3,
    makes: "2 more days of food", needs: "Nothing",
    tradeoff: "Never fails, but it runs out.",
  },
};

export const ITEM_ORDER = ["solar", "oxygen", "air", "greenhouse", "shield", "rover", "battery", "spares", "foodpack"];

/** Order the checklist suggests building in. */
export const BUILD_ORDER = ["solar", "air", "oxygen", "rover", "greenhouse", "shield"];

export function packCost(packed) {
  return Object.entries(packed).reduce((sum, [id, count]) => sum + (ITEMS[id]?.cost ?? 0) * count, 0);
}

/** The safe pack the STARTER PACK card fills in, then extras while points last. */
export function starterPlan(budget) {
  const packed = {};
  for (const id of REQUIRED) packed[id] = 1;
  for (const id of ["battery", "spares", "foodpack", "spares"]) {
    const next = { ...packed, [id]: (packed[id] ?? 0) + 1 };
    if (next[id] <= ITEMS[id].max && packCost(next) <= budget) packed[id] = next[id];
  }
  return packed;
}

/** Warnings, never blocks: the player may still fly with a risky pack. */
export function packWarnings(packed) {
  const has = (id) => (packed[id] ?? 0) > 0;
  const warnings = [];
  if (!has("solar")) warnings.push("No solar array: almost no power!");
  if (!has("air")) warnings.push("No air cleaner: clean air runs out fast.");
  if (!has("oxygen")) warnings.push("No oxygen maker: oxygen runs out.");
  if (!has("greenhouse")) warnings.push("No greenhouse: only packed food.");
  if (!has("shield")) warnings.push("No shield wall: more radiation.");
  if (!has("rover")) warnings.push("No rover: no photos, no win.");
  if (!has("battery")) warnings.push("No battery pack: the night will be hard.");
  return warnings;
}

export function activeBuilds(state) {
  return state.buildQueue.filter((id) => state.buildings[id]?.status === "building");
}

export function coreDone(state) {
  return CORE.every((id) => state.buildings[id]?.status === "done");
}

export function allBuilt(state) {
  return REQUIRED.every((id) => state.buildings[id]?.status === "done");
}

/** @returns {{ok: boolean, reason?: string}} */
export function canStartBuild(state, id) {
  const building = state.buildings[id];
  if (!building || !building.packed) return { ok: false, reason: "No blueprint packed." };
  if (building.status === "done") return { ok: false, reason: "Already built." };
  if (building.status === "building") return { ok: false, reason: "Already building." };
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
