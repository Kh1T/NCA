// Loaders for the cached NASA files in public/data. The game never calls NASA
// while it runs: everything here was saved by scripts/fetch-nasa.js.

export const DATE_PRESETS = [
  { id: "calm", label: "CALM SUN", blurb: "A quiet week at solar minimum." },
  { id: "busy", label: "BUSY SUN", blurb: "A moderately active week." },
  { id: "storm", label: "SOLAR STORM!", blurb: "The May 2024 'Gannon' storm." },
  { id: "archive", label: "RANDOM DATE", blurb: "A random real week from 2023." },
  { id: "recent", label: "THIS MONTH", blurb: "The newest saved space weather." },
];

export const MISSION_LENGTHS = [
  { days: 5, label: "5 DAYS", blurb: "Short: a race to build" },
  { days: 7, label: "7 DAYS", blurb: "Standard" },
  { days: 10, label: "10 DAYS", blurb: "Long: more weather, more dose" },
];

const DAY_MS = 86_400_000;

export function addDays(dateString, days) {
  return new Date(Date.parse(`${dateString}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Queue every cached data file. Call from a scene's preload(). */
export function preloadNasa(scene) {
  for (const preset of DATE_PRESETS) scene.load.json(`donki-${preset.id}`, `data/donki/${preset.id}.json`);
  scene.load.json("credits", "data/credits.json");
  scene.load.json("craters", "data/craters.json");
  scene.load.json("osdr-facts", "data/osdr-facts.json");
}

/** Crater photos are listed in craters.json, so they load in a second pass. */
export function preloadCraterImages(scene) {
  for (const crater of getCraters(scene)) scene.load.image(`crater-${crater.nasaId}`, crater.file);
}

export function getDonki(scene, id) {
  return scene.cache.json.get(`donki-${id}`) ?? { id, events: {}, startDate: "2019-12-01", endDate: "2019-12-11", fetchedAt: null };
}

export function getCredits(scene) {
  return scene.cache.json.get("credits") ?? {};
}

export function getCraters(scene) {
  return scene.cache.json.get("craters") ?? [];
}

export function getFacts(scene) {
  return scene.cache.json.get("osdr-facts")?.facts ?? [];
}

/** "cached on 14 Nov 2026" for a data file. Cached data is never called live. */
export function cachedOnText(file) {
  if (!file?.fetchedAt) return "cached copy";
  const date = new Date(file.fetchedAt);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `cached on ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function niceDate(dateString) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [year, month, day] = dateString.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

/**
 * The first mission day for a preset.
 * - archive: a random day in the cached year (roll = 0..1 picks it)
 * - recent: the newest days in the cache
 * - others: the curated start date
 */
export function missionStartDate(file, dateId, totalDays, roll = 0) {
  if (dateId === "archive") {
    const span = Math.round((Date.parse(file.endDate) - Date.parse(file.startDate)) / DAY_MS) - totalDays;
    return addDays(file.startDate, Math.floor(roll * Math.max(1, span)));
  }
  if (dateId === "recent") return addDays(file.endDate, -totalDays);
  return file.startDate;
}
