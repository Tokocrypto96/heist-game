// Tiny WebAudio synth: every sound is generated in code, no audio files.
// Created lazily on the first user gesture so browsers allow it.
let ctx = null;
let muted = false;

function ensureContext() {
  if (ctx === null) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureContext();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, duration, type, volume, when = 0) {
  if (muted) return;
  const ac = ensureContext();
  if (ac === null) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = ac.currentTime + when;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playPickup() {
  tone(880, 0.12, 'sine', 0.18);
  tone(1318, 0.14, 'sine', 0.14, 0.07);
}

export function playVault() {
  tone(523, 0.12, 'triangle', 0.2);
  tone(659, 0.12, 'triangle', 0.2, 0.1);
  tone(784, 0.22, 'triangle', 0.22, 0.2);
}

export function playAlarmTick() {
  tone(220, 0.09, 'square', 0.07);
}

export function playCaught() {
  tone(392, 0.2, 'sawtooth', 0.16);
  tone(311, 0.2, 'sawtooth', 0.16, 0.18);
  tone(233, 0.4, 'sawtooth', 0.18, 0.36);
}

export function playEscape() {
  tone(523, 0.14, 'triangle', 0.2);
  tone(659, 0.14, 'triangle', 0.2, 0.12);
  tone(784, 0.14, 'triangle', 0.2, 0.24);
  tone(1046, 0.3, 'triangle', 0.22, 0.36);
}

export function playTool() {
  tone(330, 0.1, 'sine', 0.15);
  tone(220, 0.16, 'sine', 0.12, 0.08);
}
