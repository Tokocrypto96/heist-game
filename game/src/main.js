// Midnight Vault Heist — entry point: game loop, screens, keyboard/mouse wiring
// and the ?shot= start/play/end screenshot mode.
import { FIELD, LEVELS, STEP } from './config.js';
import { createInput, keyDirection, wasPressed } from './input.js';
import { createWorld, stepWorld, useTool, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_LOOT, EVENT_TIMEOUT, EVENT_VAULT } from './world.js';
import { drawWorld, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { playAlarmTick, playCaught, playEscape, playPickup, playTool, playVault, toggleMute, unlockAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : 1;
const shotName = params.get('shot');
const shotMode = shotName === 'start' || shotName === 'play' || shotName === 'end';

const input = createInput(canvas);
let world = createWorld(0, seed);
let screen = SCREEN_TITLE;
let bestScore = 0;
let lastAlarmTick = 0;

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function showMessage(text, seconds) {
  world.message = text;
  world.messageLeft = seconds;
}

function startLevel(index) {
  world = createWorld(index, seed + index);
  screen = SCREEN_PLAY;
  announce(`Level ${index + 1}: ${LEVELS[index].name}. Grab the loot and reach the exit.`);
}

function handleEvents(events) {
  if (events & EVENT_LOOT) {
    playPickup();
    showMessage('Loot grabbed!', 1.2);
  }
  if (events & EVENT_VAULT) {
    playVault();
    showMessage('Vault cracked! +500', 2);
  }
  if (events & EVENT_ESCAPED) {
    playEscape();
    bestScore = Math.max(bestScore, world.score);
    screen = SCREEN_OVER;
    announce(`Escaped! Score ${world.score}.`);
  }
  if (events & EVENT_CAUGHT) {
    playCaught();
    screen = SCREEN_OVER;
    announce('Busted! The alarm hit 100 percent.');
  }
  if (events & EVENT_TIMEOUT) {
    playCaught();
    screen = SCREEN_OVER;
    announce('Out of time.');
  }
}

function tick(dt) {
  if (screen !== SCREEN_PLAY) return;
  const dir = keyDirection(input);
  if (input.click) {
    world.player.target = { x: input.click.x, y: input.click.y };
    input.click = null;
  }
  if (wasPressed(input, 'Digit1') && useTool(world, 'smoke')) { playTool(); showMessage('Smoke bomb! Hidden for 4s', 1.5); }
  if (wasPressed(input, 'Digit2') && useTool(world, 'emp')) { playTool(); showMessage('EMP! Cameras blind for 8s', 1.5); }
  if (wasPressed(input, 'Digit3') && useTool(world, 'lockpick')) { playTool(); showMessage('Lockpick! Vault open', 1.5); }
  const cracking = input.keys.has('KeyE');
  const events = stepWorld(world, dt, dir, cracking);
  if (world.alarm > 50 && world.elapsed - lastAlarmTick > 0.6) {
    lastAlarmTick = world.elapsed;
    playAlarmTick();
  }
  handleEvents(events);
}

function onKey() {
  unlockAudio();
  if (wasPressed(input, 'Enter')) {
    if (screen === SCREEN_TITLE) startLevel(0);
    else if (screen === SCREEN_OVER && world.won && world.levelIndex + 1 < LEVELS.length) startLevel(world.levelIndex + 1);
    else if (screen === SCREEN_OVER) startLevel(world.levelIndex);
  }
  if (wasPressed(input, 'KeyR') && screen === SCREEN_OVER) startLevel(world.levelIndex);
  if (wasPressed(input, 'KeyM')) toggleMute();
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  onKey();
  accumulator += elapsed;
  while (accumulator >= STEP) {
    tick(STEP);
    accumulator -= STEP;
  }
  drawWorld(ctx, world, screen);
  requestAnimationFrame(frame);
}

if (shotMode) {
  // Screenshot mode: stage the scene once and draw it, no loop needed.
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  bestScore = world.score;
  drawWorld(ctx, world, screen);
  document.title = `Midnight Vault Heist — ${shotName}`;
} else {
  announce('Midnight Vault Heist. Press Enter to start.');
  requestAnimationFrame(frame);
}
