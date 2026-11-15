const scene = document.getElementById("scene");
const world = document.getElementById("world");
const astronaut = document.getElementById("astronaut");
const astronautLayer = document.getElementById("astronautLayer");
const groundLayer = document.getElementById("groundLayer");
const startOverlay = document.getElementById("startOverlay");
const startButton = document.getElementById("startButton");
const startPreview = document.getElementById("startPreview");
const conditionPanel = document.getElementById("conditionPanel");
const statusCard = document.getElementById("statusCard");
const statusLabel = document.getElementById("statusLabel");
const statusText = document.getElementById("statusText");
const distanceLabel = document.getElementById("distance");
const ridgeFar = document.getElementById("ridgeFar");
const ridgeNear = document.getElementById("ridgeNear");

const WORLD_WIDTH = 3600;
const START_X = 600;
const WALK_SPEED = 150;
const RUN_SPEED = 255;

const SHORT_LABELS = {
  normal: "Normal",
  radiation: "Radiation",
  "low-oxygen": "Low O2",
  dehydrated: "Dehydrated",
  hungry: "Hungry",
};

const FALLBACK_CONDITIONS = [
  { id: "normal", label: "Normal", effect: "Healthy crew member on a standard sol." },
  { id: "radiation", label: "Radiation poisoned", effect: "Green suit contamination, glowing particles, and a sick expression." },
  { id: "low-oxygen", label: "Low oxygen", effect: "Blue skin, visor fog, oxygen bubbles, and a gasping expression." },
  { id: "dehydrated", label: "Dehydrated", effect: "Pale tan suit, cracked lips, dry skin, and heat shimmer lines." },
  { id: "hungry", label: "Hungry", effect: "Thinner suit, sunken cheeks, an unhappy face, and a growling stomach." },
];

const ROCKS = [
  { x: 262, bottom: 7.5, width: 64, height: 27, opacity: 0.86 },
  { x: 510, bottom: 4.2, width: 31, height: 14, opacity: 0.72 },
  { x: 750, bottom: 12, width: 42, height: 18, opacity: 0.68 },
  { x: 862, bottom: 5.5, width: 24, height: 10, opacity: 0.8 },
  { x: 1080, bottom: 5.2, width: 34, height: 15, opacity: 0.82 },
  { x: 1320, bottom: 11, width: 52, height: 22, opacity: 0.66 },
  { x: 1490, bottom: 10.5, width: 72, height: 31, opacity: 0.74 },
  { x: 1920, bottom: 6, width: 45, height: 21, opacity: 0.9 },
  { x: 2290, bottom: 15, width: 28, height: 12, opacity: 0.58 },
  { x: 2790, bottom: 8.5, width: 56, height: 24, opacity: 0.78 },
  { x: 3180, bottom: 12, width: 39, height: 17, opacity: 0.64 },
  { x: 3420, bottom: 4.5, width: 31, height: 14, opacity: 0.82 },
];

const CRATERS = [
  { x: 470, bottom: 16, width: 155, height: 34, opacity: 0.5 },
  { x: 1260, bottom: 22, width: 210, height: 45, opacity: 0.42 },
  { x: 2110, bottom: 18, width: 176, height: 37, opacity: 0.55 },
  { x: 3130, bottom: 23, width: 240, height: 52, opacity: 0.4 },
];

const state = {
  started: false,
  x: START_X,
  walked: 0,
  facing: 1,
  moving: false,
  running: false,
  condition: "normal",
  keys: new Set(),
  camera: 0,
  lastTime: 0,
};

const autoplay = window.location.hash === "#play";

let conditions = FALLBACK_CONDITIONS;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildGroundDetails() {
  for (const rock of ROCKS) {
    const element = document.createElement("div");
    element.className = "rock";
    element.style.left = `${rock.x}px`;
    element.style.bottom = `${rock.bottom}%`;
    element.style.width = `${rock.width}px`;
    element.style.height = `${rock.height}px`;
    element.style.opacity = String(rock.opacity);
    groundLayer.append(element);
  }

  for (const crater of CRATERS) {
    const element = document.createElement("div");
    element.className = "crater";
    element.style.left = `${crater.x}px`;
    element.style.bottom = `${crater.bottom}%`;
    element.style.width = `${crater.width}px`;
    element.style.height = `${crater.height}px`;
    element.style.opacity = String(crater.opacity);
    groundLayer.append(element);
  }

  for (let index = 0; index < 34; index += 1) {
    const element = document.createElement("div");
    const size = 2 + ((index * 5) % 5);
    element.className = "pebble";
    element.style.left = `${120 + index * 101 + (index % 4) * 17}px`;
    element.style.bottom = `${2.4 + ((index * 7) % 13)}%`;
    element.style.width = `${size}px`;
    element.style.height = `${Math.max(2, size - 1)}px`;
    element.style.opacity = String(0.35 + ((index * 3) % 5) / 10);
    groundLayer.append(element);
  }
}

function shortLabel(condition) {
  return SHORT_LABELS[condition.id] ?? condition.label;
}

function buildConditionPills() {
  conditionPanel.innerHTML = "";
  for (const condition of conditions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "condition-pill";
    button.dataset.condition = condition.id;
    button.setAttribute("aria-pressed", "false");

    const dot = document.createElement("span");
    dot.className = "pill-dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = shortLabel(condition);

    button.append(dot, label);
    button.addEventListener("click", () => applyCondition(condition.id));
    conditionPanel.append(button);
  }
}

function applyCondition(id) {
  const condition = conditions.find((item) => item.id === id);
  if (!condition) return;

  state.condition = id;
  scene.dataset.condition = id;
  astronaut.style.backgroundImage = `url("./${id}/sheet.png")`;
  startPreview.style.backgroundImage = `url("./${id}/sheet.png")`;
  statusLabel.textContent = condition.label;
  statusText.textContent = condition.effect;

  for (const pill of conditionPanel.querySelectorAll(".condition-pill")) {
    pill.setAttribute("aria-pressed", String(pill.dataset.condition === id));
  }

  statusCard.classList.remove("flash");
  void statusCard.offsetWidth;
  statusCard.classList.add("flash");
}

async function loadConditionManifest() {
  try {
    const response = await fetch("manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Manifest unavailable");
    const manifest = await response.json();
    if (Array.isArray(manifest.conditions) && manifest.conditions.length > 0) {
      conditions = manifest.conditions
        .filter((condition) => condition && typeof condition.id === "string")
        .map((condition) => ({
          id: condition.id,
          label: condition.label ?? condition.id,
          effect: condition.effect ?? "",
        }));
    }
  } catch {
    conditions = FALLBACK_CONDITIONS;
  }

  buildConditionPills();
  applyCondition(state.condition);
}

function updateCamera(instant = false) {
  const viewport = scene.clientWidth;
  const maxCamera = Math.max(0, WORLD_WIDTH - viewport);
  const target = clamp(state.x - viewport / 2, 0, maxCamera);

  if (instant) state.camera = target;
  else state.camera += (target - state.camera) * 0.16;

  world.style.transform = `translate3d(${-state.camera}px, 0, 0)`;
  ridgeFar.style.transform = `translate3d(${-state.camera * 0.08}px, 0, 0)`;
  ridgeNear.style.transform = `translate3d(${-state.camera * 0.2}px, 0, 0)`;
  astronautLayer.style.left = `${state.x}px`;
}

function updateDistance() {
  const meters = Math.round(Math.abs(state.walked) / 10);
  distanceLabel.textContent = `${String(meters).padStart(4, "0")} M`;
}

function updateSprite() {
  astronaut.classList.toggle("walking", state.moving);
  astronaut.classList.toggle("running", state.moving && state.running);
  astronaut.style.transform = `scaleX(${state.facing})`;
}

function update(now) {
  window.requestAnimationFrame(update);
  if (!state.started) return;

  if (!state.lastTime) state.lastTime = now;
  const delta = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  const left = state.keys.has("arrowleft") || state.keys.has("a");
  const right = state.keys.has("arrowright") || state.keys.has("d");
  const direction = (right ? 1 : 0) - (left ? 1 : 0);

  state.running = direction !== 0 && state.keys.has("shift");
  const speed = state.running ? RUN_SPEED : WALK_SPEED;

  if (direction !== 0) {
    const nextX = state.x + direction * speed * delta;
    const clampedX = clamp(nextX, 120, WORLD_WIDTH - 120);
    state.walked += Math.abs(clampedX - state.x);
    state.x = clampedX;
    state.facing = direction;
  }

  state.moving = direction !== 0;
  updateSprite();
  updateCamera();
  updateDistance();
}

function startWalk() {
  if (state.started) return;
  state.started = true;
  state.lastTime = performance.now();
  document.body.classList.add("playing");
  startOverlay.classList.add("is-hidden");
  scene.focus({ preventScroll: true });
}

function isMovementKey(key) {
  return ["arrowleft", "arrowright", "a", "d", "shift"].includes(key);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (!state.started || !isMovementKey(key)) return;
  event.preventDefault();
  state.keys.add(key);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => state.keys.clear());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) state.keys.clear();
});

function bindHold(button, key) {
  if (!button) return;

  const press = (event) => {
    event.preventDefault();
    if (!state.started) startWalk();
    state.keys.add(key);
    button.setPointerCapture?.(event.pointerId);
  };
  const release = () => state.keys.delete(key);

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

startButton.addEventListener("click", startWalk);

bindHold(document.getElementById("touchLeft"), "arrowleft");
bindHold(document.getElementById("touchRight"), "arrowright");

window.addEventListener("resize", () => {
  state.x = clamp(state.x, 120, WORLD_WIDTH - 120);
  updateCamera(true);
});

buildGroundDetails();
buildConditionPills();
applyCondition("normal");
updateCamera(true);
updateDistance();
updateSprite();
loadConditionManifest();
if (autoplay) startOverlay.style.transition = "none";
else startButton.focus();
window.requestAnimationFrame(update);

if (autoplay) startWalk();
