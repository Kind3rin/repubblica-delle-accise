export type Sfx =
  | "collect"
  | "upgrade"
  | "train"
  | "raid"
  | "deploy"
  | "win"
  | "lose"
  | "daily"
  | "alert"
  | "tap";

let ctx: AudioContext | null = null;
let muted = false;
let loaded = false;

function ensureMute() {
  if (loaded) return;
  loaded = true;
  try {
    muted = localStorage.getItem("rda-mute-v1") === "1";
  } catch {
    muted = false;
  }
}

export function isMuted() {
  ensureMute();
  return muted;
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  ensureMute();
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) ctx = new AC({ latencyHint: "interactive" });
  if (ctx.state === "suspended") void ctx.resume();
}

export function toggleMute() {
  ensureMute();
  muted = !muted;
  try {
    localStorage.setItem("rda-mute-v1", muted ? "1" : "0");
  } catch {
    /* private */
  }
  if (!muted) unlockAudio();
  return muted;
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

export function playSfx(kind: Sfx) {
  ensureMute();
  if (muted) return;
  unlockAudio();
  if (!ctx) return;
  const jitter = 1 + (Math.random() - 0.5) * 0.06;
  switch (kind) {
    case "collect":
      beep(523 * jitter, 0.08, "triangle", 0.07);
      beep(659 * jitter, 0.09, "triangle", 0.06, 0.07);
      beep(784 * jitter, 0.12, "triangle", 0.07, 0.14);
      break;
    case "upgrade":
      beep(196, 0.12, "square", 0.04);
      beep(262, 0.16, "triangle", 0.06, 0.1);
      break;
    case "train":
      beep(880, 0.07, "square", 0.035);
      beep(990, 0.09, "square", 0.03, 0.08);
      break;
    case "raid":
      beep(174, 0.22, "sawtooth", 0.05);
      beep(220, 0.28, "sawtooth", 0.045, 0.12);
      break;
    case "deploy":
      beep(310 * jitter, 0.06, "square", 0.035);
      break;
    case "win":
      beep(523, 0.1, "triangle", 0.07);
      beep(659, 0.1, "triangle", 0.07, 0.1);
      beep(784, 0.12, "triangle", 0.08, 0.2);
      beep(1046, 0.22, "triangle", 0.07, 0.32);
      break;
    case "lose":
      beep(392, 0.16, "triangle", 0.05);
      beep(311, 0.2, "triangle", 0.045, 0.12);
      beep(247, 0.28, "triangle", 0.04, 0.26);
      break;
    case "daily":
      beep(698, 0.1, "triangle", 0.07);
      beep(880, 0.16, "triangle", 0.07, 0.09);
      break;
    case "alert":
      beep(520, 0.09, "square", 0.04);
      beep(420, 0.12, "square", 0.04, 0.12);
      break;
    case "tap":
      beep(640 * jitter, 0.04, "triangle", 0.03);
      break;
  }
}
