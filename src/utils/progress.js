// Small things the game remembers between visits: which tutorials and the
// story were already shown, which badges are unlocked, and sound settings.
// Every read and write is wrapped, so a blocked or private browser still works
// (the game just forgets between visits).

const KEY = "outpost-progress";
let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    cache = {};
  }
  cache.seen ??= {};
  cache.badges ??= {};
  cache.settings ??= {};
  return cache;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked: remembered for this visit only.
  }
}

/** Has the player already seen tutorial / story `id`? */
export function seen(id) {
  return Boolean(load().seen[id]);
}

export function markSeen(id) {
  load().seen[id] = true;
  save();
}

/** Show every tutorial and the story again. */
export function resetSeen() {
  load().seen = {};
  save();
}

export function unlockedBadges() {
  return { ...load().badges };
}

/** Unlock a badge. Returns true if it is new. */
export function unlockBadge(id) {
  const data = load();
  if (data.badges[id]) return false;
  data.badges[id] = new Date().toISOString().slice(0, 10);
  save();
  return true;
}

export function getSetting(name, fallback) {
  const value = load().settings[name];
  return value === undefined ? fallback : value;
}

export function setSetting(name, value) {
  load().settings[name] = value;
  save();
}

/** For tests: forget the cached copy. */
export function _resetCache() {
  cache = null;
}
