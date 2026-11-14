// Tiny sound effects made with the Web Audio API. No audio files needed,
// so the game stays small and works offline.

let context = null;
let muted = false;

try {
  muted = localStorage.getItem("outpost-muted") === "1";
} catch {
  // Storage blocked: sound stays on.
}

const SOUNDS = {
  click: [{ f: 660, t: 0.05, type: "square" }],
  tick: [{ f: 440, t: 0.03, type: "square", v: 0.5 }],
  deny: [{ f: 160, t: 0.12, type: "square" }],
  build: [{ f: 330, t: 0.06, type: "square" }, { f: 494, t: 0.08, type: "square" }],
  done: [{ f: 523, t: 0.08 }, { f: 659, t: 0.08 }, { f: 784, t: 0.14 }],
  alert: [{ f: 880, t: 0.1, type: "sawtooth" }, { f: 660, t: 0.1, type: "sawtooth" }, { f: 880, t: 0.1, type: "sawtooth" }],
  good: [{ f: 587, t: 0.07 }, { f: 880, t: 0.14 }],
  bad: [{ f: 220, t: 0.12, type: "sawtooth" }, { f: 147, t: 0.2, type: "sawtooth" }],
  jump: [{ f: 300, t: 0.05, slide: 520, type: "square", v: 0.5 }],
  snap: [{ f: 1200, t: 0.03, type: "square" }, { f: 700, t: 0.05, type: "square" }],
  day: [{ f: 392, t: 0.1 }, { f: 523, t: 0.16 }],
  win: [{ f: 523, t: 0.1 }, { f: 659, t: 0.1 }, { f: 784, t: 0.1 }, { f: 1047, t: 0.25 }],
};

export function sfx(name) {
  if (muted) return;
  const notes = SOUNDS[name];
  if (!notes) return;
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === "suspended") context.resume();
    let at = context.currentTime;
    for (const note of notes) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = note.type ?? "triangle";
      osc.frequency.setValueAtTime(note.f, at);
      if (note.slide) osc.frequency.linearRampToValueAtTime(note.slide, at + note.t);
      const volume = 0.06 * (note.v ?? 1);
      gain.gain.setValueAtTime(volume, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.t);
      osc.connect(gain).connect(context.destination);
      osc.start(at);
      osc.stop(at + note.t + 0.02);
      at += note.t;
    }
  } catch {
    // No audio available (or not allowed yet): stay silent.
  }
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem("outpost-muted", muted ? "1" : "0");
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
  return muted;
}
