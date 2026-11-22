// Midnight Vault Heist — configuration: field size, tuning and the three rooms.
// Every level is a small floor plan: walls, loot, patrolling guards, sweeping
// cameras, one vault and one exit. Coordinates are in world pixels.
export const FIELD = { width: 960, height: 600 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 11,
  speed: 165,
  vaultSeconds: 2.5,
  smokeSeconds: 4,
  empSeconds: 8,
};

export const TOOLS = {
  smoke: { key: '1', cost: 150, name: 'Smoke bomb', blurb: 'Hide in smoke for 4s' },
  emp: { key: '2', cost: 200, name: 'EMP burst', blurb: 'Blind cameras for 8s' },
  lockpick: { key: '3', cost: 100, name: 'Lockpick', blurb: 'Open the vault at once' },
};

export const ALARM = {
  guardPerSecond: 55,
  cameraPerSecond: 40,
  decayPerSecond: 14,
  caughtAt: 100,
};

export const LOOT_KIND = { GOLD: 'gold', GEM: 'gem', ART: 'art' };
export const LOOT_VALUE = { gold: 100, gem: 250, art: 400 };

// Guard vision: how far they see and how wide the cone is (half-angle in radians).
export const GUARD_VIEW = { range: 170, halfAngle: 0.52 };
export const CAMERA_VIEW = { range: 190, halfAngle: 0.3 };

function wall(x, y, w, h) { return { x, y, w, h }; }
function loot(x, y, kind) { return { x, y, kind, value: LOOT_VALUE[kind], taken: false }; }
function guard(x, y, path, speed) { return { x, y, path, speed, leg: 0, dir: 1, angle: 0 }; }
function camera(x, y, from, to, speed) { return { x, y, from, to, speed, angle: from }; }

export const LEVELS = [
  {
    name: 'Gallery of Glass',
    par: 90,
    timeLimit: 120,
    needLoot: 2,
    spawn: { x: 60, y: 540 },
    exit: { x: 880, y: 40, w: 56, h: 56 },
    vault: { x: 470, y: 60, w: 64, h: 48 },
    walls: [
      wall(0, 0, 960, 16), wall(0, 584, 960, 16), wall(0, 0, 16, 600), wall(944, 0, 16, 600),
      wall(200, 120, 16, 240), wall(200, 120, 260, 16), wall(560, 120, 16, 200),
      wall(340, 380, 220, 16), wall(700, 300, 16, 180), wall(700, 300, 180, 16),
    ],
    loot: [
      loot(120, 90, 'gold'), loot(880, 520, 'gold'), loot(430, 300, 'gem'),
      loot(800, 200, 'art'), loot(280, 500, 'gold'),
    ],
    guards: [
      guard(320, 220, [{ x: 320, y: 220 }, { x: 320, y: 480 }, { x: 640, y: 480 }, { x: 640, y: 220 }], 62),
      guard(820, 420, [{ x: 820, y: 420 }, { x: 820, y: 120 }], 78),
    ],
    cameras: [camera(480, 16, -0.4, 1.9, 0.55), camera(944, 480, 2.4, 3.9, 0.4)],
  },
  {
    name: 'Vault Hall',
    par: 110,
    timeLimit: 150,
    needLoot: 3,
    spawn: { x: 60, y: 60 },
    exit: { x: 880, y: 520, w: 56, h: 56 },
    vault: { x: 448, y: 276, w: 64, h: 48 },
    walls: [
      wall(0, 0, 960, 16), wall(0, 584, 960, 16), wall(0, 0, 16, 600), wall(944, 0, 16, 600),
      wall(180, 0, 16, 180), wall(180, 180, 200, 16), wall(560, 120, 16, 260),
      wall(300, 420, 16, 164), wall(300, 420, 260, 16), wall(720, 180, 16, 200),
      wall(720, 180, 160, 16),
    ],
    loot: [
      loot(90, 300, 'gold'), loot(880, 90, 'gem'), loot(660, 500, 'gold'),
      loot(240, 520, 'art'), loot(480, 90, 'gold'), loot(840, 320, 'gem'),
    ],
    guards: [
      guard(400, 260, [{ x: 400, y: 260 }, { x: 400, y: 520 }, { x: 660, y: 520 }, { x: 660, y: 260 }], 70),
      guard(120, 480, [{ x: 120, y: 480 }, { x: 120, y: 220 }], 85),
      guard(860, 240, [{ x: 860, y: 240 }, { x: 620, y: 240 }], 66),
    ],
    cameras: [camera(480, 584, 4.2, 5.4, 0.5), camera(16, 300, -1.2, 0.6, 0.45), camera(944, 90, 2.2, 3.6, 0.6)],
  },
  {
    name: 'Penthouse Safe',
    par: 130,
    timeLimit: 180,
    needLoot: 4,
    spawn: { x: 480, y: 540 },
    exit: { x: 60, y: 40, w: 56, h: 56 },
    vault: { x: 448, y: 60, w: 64, h: 48 },
    walls: [
      wall(0, 0, 960, 16), wall(0, 584, 960, 16), wall(0, 0, 16, 600), wall(944, 0, 16, 600),
      wall(160, 140, 16, 200), wall(160, 140, 240, 16), wall(560, 140, 16, 200),
      wall(560, 140, 240, 16), wall(320, 380, 320, 16), wall(480, 380, 16, 120),
    ],
    loot: [
      loot(90, 300, 'art'), loot(870, 300, 'art'), loot(240, 500, 'gold'),
      loot(720, 500, 'gem'), loot(480, 220, 'gem'), loot(90, 90, 'gold'), loot(870, 90, 'gold'),
    ],
    guards: [
      guard(240, 240, [{ x: 240, y: 240 }, { x: 240, y: 480 }, { x: 720, y: 480 }, { x: 720, y: 240 }], 78),
      guard(480, 120, [{ x: 480, y: 120 }, { x: 880, y: 120 }], 92),
      guard(90, 480, [{ x: 90, y: 480 }, { x: 400, y: 480 }], 72),
    ],
    cameras: [camera(480, 16, -0.6, 2.2, 0.6), camera(16, 480, -1.0, 0.8, 0.5), camera(944, 480, 2.3, 4.0, 0.55)],
  },
];
