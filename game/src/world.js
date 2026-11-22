// Midnight Vault Heist — world state and rules. A fresh world is built from a level
// definition and a seed; step() advances it one fixed tick. No rendering here.
import { ALARM, CAMERA_VIEW, FIELD, GUARD_VIEW, LEVELS, PLAYER, STEP } from './config.js';
import { makeRandom } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_VAULT = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_TIMEOUT = 16;
export const EVENT_ALARM = 32;
export const EVENT_OVER = EVENT_CAUGHT | EVENT_ESCAPED | EVENT_TIMEOUT;

export const SMOKE_RADIUS = 70;

function cloneLevel(level) {
  return {
    name: level.name,
    par: level.par,
    timeLimit: level.timeLimit,
    needLoot: level.needLoot,
    spawn: { ...level.spawn },
    exit: { ...level.exit },
    vault: { ...level.vault, open: false, progress: 0 },
    walls: level.walls.map((w) => ({ ...w })),
    loot: level.loot.map((l) => ({ ...l, taken: false })),
    guards: level.guards.map((g) => ({
      ...g,
      path: g.path.map((p) => ({ ...p })),
      angle: 0,
      alert: 0,
    })),
    cameras: level.cameras.map((c) => ({ ...c, angle: c.from, sweep: 1, disabled: 0 })),
  };
}

export function createWorld(levelIndex, seed) {
  const rng = makeRandom(seed);
  const world = {
    levelIndex,
    level: cloneLevel(LEVELS[levelIndex]),
    rng,
    player: {
      x: LEVELS[levelIndex].spawn.x,
      y: LEVELS[levelIndex].spawn.y,
      angle: -Math.PI / 2,
      target: null,
    },
    score: 0,
    lootTaken: 0,
    lootValue: 0,
    alarm: 0,
    timeLeft: LEVELS[levelIndex].timeLimit,
    elapsed: 0,
    over: false,
    won: false,
    caught: false,
    timeout: false,
    tools: { smoke: 1, emp: 1, lockpick: 1 },
    smoke: null, // { x, y, left }
    empLeft: 0,
    vaultBusy: false,
    message: '',
    messageLeft: 0,
  };
  return world;
}

function circleHitsWall(x, y, r, walls) {
  for (const w of walls) {
    const cx = Math.max(w.x, Math.min(x, w.x + w.w));
    const cy = Math.max(w.y, Math.min(y, w.y + w.h));
    if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
  }
  return false;
}

function moveCircle(world, x, y, dx, dy, r) {
  const walls = world.level.walls;
  const nx = x + dx;
  if (!circleHitsWall(nx, y, r, walls)) x = nx;
  const ny = y + dy;
  if (!circleHitsWall(x, ny, r, walls)) y = ny;
  return { x, y };
}

// True when the segment from (x1,y1) to (x2,y2) crosses any wall (blocks sight).
export function sightBlocked(world, x1, y1, x2, y2) {
  for (const w of world.level.walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function inSmoke(world, x, y) {
  return world.smoke !== null && Math.hypot(x - world.smoke.x, y - world.smoke.y) < SMOKE_RADIUS;
}

/**
 * How strongly the player WOULD be seen standing at (x, y) right now (0..1):
 * the strongest guard cone or camera beam that reaches the point. Used by the
 * screenshot autopilot to steer around danger.
 */
export function seenAt(world, x, y) {
  let seen = 0;
  for (const g of world.level.guards) {
    const dist = Math.hypot(x - g.x, y - g.y);
    if (dist > GUARD_VIEW.range) continue;
    if (Math.abs(angleDiff(angleTo(g.x, g.y, x, y), g.angle)) > GUARD_VIEW.halfAngle) continue;
    if (sightBlocked(world, g.x, g.y, x, y)) continue;
    if (inSmoke(world, x, y)) continue;
    seen = Math.max(seen, 1 - (dist / GUARD_VIEW.range) * 0.5);
  }
  for (const cam of world.level.cameras) {
    if (cam.disabled > 0) continue;
    const dist = Math.hypot(x - cam.x, y - cam.y);
    if (dist > CAMERA_VIEW.range) continue;
    if (Math.abs(angleDiff(angleTo(cam.x, cam.y, x, y), cam.angle)) > CAMERA_VIEW.halfAngle) continue;
    if (sightBlocked(world, cam.x, cam.y, x, y)) continue;
    if (inSmoke(world, x, y)) continue;
    seen = Math.max(seen, 1 - (dist / CAMERA_VIEW.range) * 0.5);
  }
  return seen;
}

// How strongly one watcher (guard or camera) sees the player right now, 0..1.
function seeStrength(world, wx, wy, facing, range, halfAngle) {
  const p = world.player;
  const dist = Math.hypot(p.x - wx, p.y - wy);
  if (dist > range) return 0;
  if (Math.abs(angleDiff(angleTo(wx, wy, p.x, p.y), facing)) > halfAngle) return 0;
  if (sightBlocked(world, wx, wy, p.x, p.y)) return 0;
  if (inSmoke(world, p.x, p.y)) return 0;
  return 1 - (dist / range) * 0.5;
}

function nearRect(x, y, r, rect, pad) {
  return x > rect.x - pad && x < rect.x + rect.w + pad && y > rect.y - pad && y < rect.y + rect.h + pad;
}

export function useTool(world, kind) {
  const p = world.player;
  if (kind === 'smoke' && world.tools.smoke > 0 && world.smoke === null) {
    world.tools.smoke -= 1;
    world.score = Math.max(0, world.score - 150);
    world.smoke = { x: p.x, y: p.y, left: PLAYER.smokeSeconds };
    return true;
  }
  if (kind === 'emp' && world.tools.emp > 0 && world.empLeft <= 0) {
    world.tools.emp -= 1;
    world.score = Math.max(0, world.score - 200);
    world.empLeft = PLAYER.empSeconds;
    for (const cam of world.level.cameras) cam.disabled = PLAYER.empSeconds;
    return true;
  }
  if (kind === 'lockpick' && world.tools.lockpick > 0 && !world.level.vault.open) {
    if (nearRect(p.x, p.y, PLAYER.radius, world.level.vault, 26)) {
      world.tools.lockpick -= 1;
      world.score = Math.max(0, world.score - 100);
      world.level.vault.open = true;
      world.level.vault.progress = 1;
      return true;
    }
  }
  return false;
}

function stepGuards(world, dt) {
  for (const g of world.level.guards) {
    const target = g.path[g.leg];
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const dist = Math.hypot(dx, dy);
    const step = g.speed * dt;
    if (dist <= step) {
      g.x = target.x;
      g.y = target.y;
      g.leg += g.dir;
      if (g.leg >= g.path.length || g.leg < 0) {
        g.dir *= -1;
        g.leg += g.dir * 2;
      }
    } else {
      g.x += (dx / dist) * step;
      g.y += (dy / dist) * step;
      g.angle = Math.atan2(dy, dx);
    }
  }
}

function stepCameras(world, dt) {
  for (const cam of world.level.cameras) {
    if (cam.disabled > 0) {
      cam.disabled -= dt;
      continue;
    }
    cam.angle += cam.speed * cam.sweep * dt;
    if (cam.angle > cam.to) { cam.angle = cam.to; cam.sweep = -1; }
    if (cam.angle < cam.from) { cam.angle = cam.from; cam.sweep = 1; }
  }
}

function stepAlarm(world, dt) {
  let seen = 0;
  for (const g of world.level.guards) {
    const s = seeStrength(world, g.x, g.y, g.angle, GUARD_VIEW.range, GUARD_VIEW.halfAngle);
    g.alert = s > 0 ? Math.max(g.alert, s) : Math.max(0, g.alert - dt * 0.8);
    seen = Math.max(seen, s * ALARM.guardPerSecond);
  }
  for (const cam of world.level.cameras) {
    if (cam.disabled > 0) continue;
    const s = seeStrength(world, cam.x, cam.y, cam.angle, CAMERA_VIEW.range, CAMERA_VIEW.halfAngle);
    seen = Math.max(seen, s * ALARM.cameraPerSecond);
  }
  const before = world.alarm;
  if (seen > 0) {
    world.alarm = Math.min(ALARM.caughtAt, world.alarm + seen * dt);
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM.decayPerSecond * dt);
  }
  return world.alarm >= ALARM.caughtAt && before < ALARM.caughtAt;
}

function stepLootAndVault(world, dt, cracking) {
  let events = EVENT_NONE;
  const p = world.player;
  for (const item of world.level.loot) {
    if (item.taken) continue;
    if (Math.hypot(p.x - item.x, p.y - item.y) < PLAYER.radius + 16) {
      item.taken = true;
      world.lootTaken += 1;
      world.lootValue += item.value;
      world.score += item.value;
      events |= EVENT_LOOT;
    }
  }
  const vault = world.level.vault;
  if (!vault.open && nearRect(p.x, p.y, PLAYER.radius, vault, 26)) {
    if (cracking) {
      vault.progress += dt / PLAYER.vaultSeconds;
      world.vaultBusy = true;
      if (vault.progress >= 1) {
        vault.open = true;
        vault.progress = 1;
        world.score += 500;
        world.lootValue += 500;
        world.lootTaken += 1;
        events |= EVENT_VAULT;
      }
    } else {
      world.vaultBusy = false;
    }
  } else {
    world.vaultBusy = false;
  }
  return events;
}

/** Advance the world one tick. `move` is a unit vector, `cracking` holds E near the vault. */
export function stepWorld(world, dt, move, cracking) {
  if (world.over) return EVENT_NONE;
  let events = EVENT_NONE;
  world.elapsed += dt;
  world.timeLeft -= dt;
  if (world.timeLeft <= 0) {
    world.timeLeft = 0;
    world.over = true;
    world.timeout = true;
    return EVENT_TIMEOUT;
  }

  const p = world.player;
  if (move.x !== 0 || move.y !== 0) {
    const next = moveCircle(world, p.x, p.y, move.x * PLAYER.speed * dt, move.y * PLAYER.speed * dt, PLAYER.radius);
    p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, next.x));
    p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, next.y));
    p.angle = Math.atan2(move.y, move.x);
    p.target = null;
  } else if (p.target) {
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      p.target = null;
    } else {
      const next = moveCircle(world, p.x, p.y, (dx / dist) * PLAYER.speed * dt, (dy / dist) * PLAYER.speed * dt, PLAYER.radius);
      p.x = next.x;
      p.y = next.y;
      p.angle = Math.atan2(dy, dx);
    }
  }

  stepGuards(world, dt);
  stepCameras(world, dt);
  if (world.smoke !== null) {
    world.smoke.left -= dt;
    if (world.smoke.left <= 0) world.smoke = null;
  }
  if (world.empLeft > 0) world.empLeft -= dt;

  events |= stepLootAndVault(world, dt, cracking);

  if (stepAlarm(world, dt)) {
    world.over = true;
    world.caught = true;
    return events | EVENT_CAUGHT;
  }

  const exit = world.level.exit;
  if (world.lootTaken >= world.level.needLoot && p.x > exit.x && p.x < exit.x + exit.w && p.y > exit.y && p.y < exit.y + exit.h) {
    world.over = true;
    world.won = true;
    const timeBonus = Math.round(world.timeLeft) * 5;
    world.score += timeBonus;
    return events | EVENT_ESCAPED;
  }

  if (world.messageLeft > 0) world.messageLeft -= dt;
  return events;
}

/** True when the player may leave through the exit right now. */
export function exitReady(world) {
  return world.lootTaken >= world.level.needLoot;
}
