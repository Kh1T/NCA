// Sound effects, the rover engine and background music, all generated with
// the Web Audio API. No audio files: the game stays small, works offline,
// needs no licences, and starts instantly on phones.

import { getSetting, setSetting } from "../utils/progress.js";

let context = null;
let sfxBus = null;
let musicBus = null;
let noiseBuffer = null;

let muted = false;
let sfxVolume = 0.8;
let musicVolume = 0.3;
try {
  // Older saves kept only the mute switch under its own key.
  muted = getSetting("muted", localStorage.getItem("outpost-muted") === "1");
} catch {
  muted = getSetting("muted", false);
}
sfxVolume = getSetting("sfxVolume", 0.8);
musicVolume = getSetting("musicVolume", 0.3);

/** Create the audio graph on first use. Phones only allow this after a tap. */
function audio() {
  if (context) return context;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  context = new Ctx();
  sfxBus = context.createGain();
  musicBus = context.createGain();
  sfxBus.connect(context.destination);
  musicBus.connect(context.destination);
  applyVolumes();
  return context;
}

function applyVolumes() {
  if (!context) return;
  const now = context.currentTime;
  sfxBus.gain.setTargetAtTime(muted ? 0 : sfxVolume, now, 0.02);
  musicBus.gain.setTargetAtTime(muted ? 0 : musicVolume, now, 0.05);
}

// iOS and Android start audio only inside a user gesture: unlock on the first one.
function unlock() {
  try {
    const ctx = audio();
    if (ctx?.state === "suspended") ctx.resume();
    if (wantedMood && !music) startMusic(wantedMood);
  } catch {
    // No audio on this device.
  }
}
if (typeof document !== "undefined") {
  for (const type of ["pointerdown", "keydown", "touchend"]) document.addEventListener(type, unlock, { passive: true });
}

function noise() {
  if (noiseBuffer) return noiseBuffer;
  noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

// Each sound is a list of notes played one after another.
// f: frequency, t: length (s), type: wave, v: volume, slide: glide to frequency,
// noise: true for a hiss/thump (f is then a filter frequency), gap: silence after.
const SOUNDS = {
  click: [{ f: 660, t: 0.05, type: "square" }],
  hover: [{ f: 990, t: 0.02, type: "square", v: 0.25 }],
  tick: [{ f: 440, t: 0.03, type: "square", v: 0.5 }],
  deny: [{ f: 160, t: 0.12, type: "square" }],
  build: [{ f: 330, t: 0.06, type: "square" }, { f: 494, t: 0.08, type: "square" }],
  done: [{ f: 523, t: 0.08 }, { f: 659, t: 0.08 }, { f: 784, t: 0.14 }],
  achieve: [{ f: 523, t: 0.09, type: "square", v: 0.7 }, { f: 659, t: 0.09, type: "square", v: 0.7 }, { f: 784, t: 0.09, type: "square", v: 0.7 }, { f: 1047, t: 0.3, v: 1.1 }],
  gain: [{ f: 440, t: 0.06, slide: 880 }],
  loss: [{ f: 520, t: 0.12, slide: 220, type: "sawtooth", v: 0.6 }],
  warn: [{ f: 880, t: 0.08, type: "square", v: 0.6, gap: 0.06 }, { f: 880, t: 0.08, type: "square", v: 0.6 }],
  hint: [{ f: 784, t: 0.06, v: 0.6 }, { f: 1047, t: 0.1, v: 0.6 }],
  alert: [{ f: 880, t: 0.1, type: "sawtooth" }, { f: 660, t: 0.1, type: "sawtooth" }, { f: 880, t: 0.1, type: "sawtooth" }],
  "alert-flare": [{ f: 1200, t: 0.08, type: "sawtooth" }, { f: 900, t: 0.08, type: "sawtooth" }, { f: 1200, t: 0.08, type: "sawtooth" }, { f: 900, t: 0.16, type: "sawtooth" }],
  "alert-meteor": [{ f: 900, t: 0.25, noise: true, v: 1.4 }, { f: 120, t: 0.15, type: "square" }],
  "alert-leak": [{ f: 4000, t: 0.6, noise: true, v: 0.7 }],
  "alert-dust": [{ f: 1500, t: 0.35, noise: true, v: 0.6 }, { f: 1500, t: 0.35, noise: true, v: 0.4 }],
  "alert-night": [{ f: 330, t: 0.2, slide: 165 }, { f: 165, t: 0.3 }],
  "alert-temp": [{ f: 1568, t: 0.08, v: 0.5 }, { f: 1760, t: 0.08, v: 0.5 }, { f: 2093, t: 0.16, v: 0.5 }],
  "alert-plant": [{ f: 392, t: 0.12, slide: 330 }, { f: 294, t: 0.2 }],
  "alert-comms": [{ f: 1200, t: 0.05, type: "square", gap: 0.05 }, { f: 1200, t: 0.05, type: "square", gap: 0.05 }, { f: 1600, t: 0.1, type: "square" }],
  good: [{ f: 587, t: 0.07 }, { f: 880, t: 0.14 }],
  bad: [{ f: 220, t: 0.12, type: "sawtooth" }, { f: 147, t: 0.2, type: "sawtooth" }],
  jump: [{ f: 300, t: 0.05, slide: 520, type: "square", v: 0.5 }],
  snap: [{ f: 1200, t: 0.03, type: "square" }, { f: 700, t: 0.05, type: "square" }],
  day: [{ f: 392, t: 0.1 }, { f: 523, t: 0.16 }],
  win: [{ f: 523, t: 0.1 }, { f: 659, t: 0.1 }, { f: 784, t: 0.1 }, { f: 1047, t: 0.25 }],
  engine: [{ f: 300, t: 1.4, noise: true, v: 1.2 }],
  thud: [{ f: 140, t: 0.25, slide: 40, type: "sine", v: 2 }, { f: 400, t: 0.2, noise: true, v: 1 }],
};

/** Play one sound effect by name. Unknown names are ignored. */
export function sfx(name) {
  if (muted) return;
  const notes = SOUNDS[name];
  if (!notes) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    let at = ctx.currentTime;
    for (const note of notes) {
      const gain = ctx.createGain();
      const volume = 0.06 * (note.v ?? 1);
      gain.gain.setValueAtTime(volume, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.t);
      gain.connect(sfxBus);
      if (note.noise) {
        const src = ctx.createBufferSource();
        src.buffer = noise();
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(note.f, at);
        src.connect(filter).connect(gain);
        src.start(at);
        src.stop(at + note.t + 0.02);
      } else {
        const osc = ctx.createOscillator();
        osc.type = note.type ?? "triangle";
        osc.frequency.setValueAtTime(note.f, at);
        if (note.slide) osc.frequency.linearRampToValueAtTime(note.slide, at + note.t);
        osc.connect(gain);
        osc.start(at);
        osc.stop(at + note.t + 0.02);
      }
      at += note.t + (note.gap ?? 0);
    }
  } catch {
    // No audio available (or not allowed yet): stay silent.
  }
}

// ---------- Rover engine ----------

/**
 * A low hum whose pitch and loudness follow the rover's speed.
 * Returns { setSpeed(0..1), stop() }.
 */
export function startEngine() {
  const silent = { setSpeed() {}, stop() {} };
  try {
    const ctx = audio();
    if (!ctx) return silent;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 50;
    filter.type = "lowpass";
    filter.frequency.value = 300;
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(sfxBus);
    osc.start();
    return {
      setSpeed(speed) {
        const now = ctx.currentTime;
        osc.frequency.setTargetAtTime(48 + speed * 52, now, 0.08);
        // Below zero: the astronaut is outside, so the engine is silent.
        gain.gain.setTargetAtTime(speed > 0 ? 0.025 + speed * 0.03 : speed < 0 ? 0 : 0.008, now, 0.1);
      },
      stop() {
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        osc.stop(ctx.currentTime + 0.3);
      },
    };
  } catch {
    return silent;
  }
}

// ---------- Music ----------

// Tiny loops for a step sequencer: one note per eighth note, 0 = rest.
// Notes are MIDI numbers (60 = middle C). Quiet triangle lead, soft bass.
const MOODS = {
  menu: { bpm: 84, lead: [72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 69, 72, 0, 74, 0, 0], bass: [48, 48, 55, 55, 53, 53, 50, 50] },
  base: { bpm: 96, lead: [69, 0, 72, 0, 76, 74, 72, 0, 67, 0, 69, 0, 72, 0, 71, 0], bass: [45, 45, 43, 43, 41, 41, 43, 43] },
  photo: { bpm: 126, lead: [76, 79, 76, 74, 76, 0, 72, 74, 76, 79, 81, 79, 76, 74, 72, 0], bass: [52, 52, 50, 50, 48, 48, 50, 50] },
};

let music = null;
let wantedMood = null;

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function startMusic(mood) {
  const ctx = audio();
  const song = MOODS[mood];
  if (!ctx || !song || ctx.state !== "running") return;
  const step = 60 / song.bpm / 2;
  let index = 0;
  let next = ctx.currentTime + 0.1;
  const play = (freq, at, len, type, vol) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(gain).connect(musicBus);
    osc.start(at);
    osc.stop(at + len + 0.02);
  };
  // Look ahead a little and schedule notes on the audio clock, so timing
  // stays steady even if the game stutters.
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.25) {
      const lead = song.lead[index % song.lead.length];
      if (lead) play(midi(lead), next, step * 0.9, "triangle", 0.05);
      if (index % 2 === 0) play(midi(song.bass[(index / 2) % song.bass.length]), next, step * 1.8, "sine", 0.06);
      index += 1;
      next += step;
    }
  }, 60);
  music = { mood, timer };
}

/** Start the music for a mood ("menu", "base", "photo"). Same mood: keep playing. */
export function playMusic(mood) {
  wantedMood = mood;
  if (music?.mood === mood) return;
  stopMusic(false);
  try {
    startMusic(mood);
  } catch {
    // No audio: no music.
  }
}

export function stopMusic(forget = true) {
  if (music) clearInterval(music.timer);
  music = null;
  if (forget) wantedMood = null;
}

// ---------- Settings ----------

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  setSetting("muted", muted);
  applyVolumes();
  return muted;
}

export function getVolumes() {
  return { sfx: sfxVolume, music: musicVolume };
}

export function setVolume(kind, value) {
  const v = Math.max(0, Math.min(1, value));
  if (kind === "music") musicVolume = v;
  else sfxVolume = v;
  setSetting(kind === "music" ? "musicVolume" : "sfxVolume", v);
  applyVolumes();
}
