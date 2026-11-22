// Screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (breadth-first path to the nearest loot, then the exit, waiting out
// guard cones and camera beams), so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER, seenAt, stepWorld } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 8;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;
const DIRECTIONS = 8;

/** Where the autopilot wants to go: nearest loot, then the exit once ready. */
function pickTarget(world) {
  const p = world.player;
  const level = world.level;
  if (world.lootTaken < level.needLoot) {
    let best = null;
    let bestDist = Infinity;
    for (const item of level.loot) {
      if (item.taken) continue;
      const d = Math.hypot(item.x - p.x, item.y - p.y);
      if (d < bestDist) { bestDist = d; best = item; }
    }
    if (best !== null) return { x: best.x, y: best.y };
  }
  return { x: level.exit.x + level.exit.w / 2, y: level.exit.y + level.exit.h / 2 };
}

// Coarse grid for pathfinding (24 px cells): a cell is blocked when a wall covers
// its centre expanded by the thief's radius.
const CELL = 24;
const COLS = Math.ceil(FIELD.width / CELL);
const ROWS = Math.ceil(FIELD.height / CELL);

function cellBlocked(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  for (const w of world.level.walls) {
    if (x > w.x - 11 && x < w.x + w.w + 11 && y > w.y - 11 && y < w.y + w.h + 11) return true;
  }
  return false;
}

/**
 * Breadth-first path from the thief to (tx, ty) as a list of waypoints, or null
 * when no route exists. Deterministic: neighbours are tried in a fixed order.
 */
function findPath(world, tx, ty) {
  const startCol = Math.floor(world.player.x / CELL);
  const startRow = Math.floor(world.player.y / CELL);
  const goalCol = Math.floor(tx / CELL);
  const goalRow = Math.floor(ty / CELL);
  const key = (c, r) => r * COLS + c;
  const prev = new Map();
  const queue = [[startCol, startRow]];
  prev.set(key(startCol, startRow), null);
  const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === goalCol && r === goalRow) break;
    for (const [dc, dr] of neighbours) {
      const nc = c + dc;
      const nr = r + dr;
      if (cellBlocked(world, nc, nr)) continue;
      if (prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(goalCol, goalRow))) return null;
  const cells = [];
  let cur = [goalCol, goalRow];
  while (cur !== null) {
    cells.push(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  cells.reverse();
  return cells.map(([c, r]) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }));
}

/**
 * Best unit move for this tick: follow the BFS path to the target, but wait in
 * place when the next waypoint sits inside a guard cone or camera beam, and
 * step aside when the thief itself is being seen. `path` is the cached route,
 * refreshed by the caller when the target changes.
 */
function autopilot(world, path) {
  const p = world.player;
  const target = pickTarget(world);
  if (path === null || path.length === 0) return { x: 0, y: 0 };
  // Flee: if currently seen, step toward the least-seen of the 8 neighbours.
  if (seenAt(world, p.x, p.y) > 0.25) {
    let bestMove = { x: 0, y: 0 };
    let bestSeen = seenAt(world, p.x, p.y);
    for (let i = 0; i < DIRECTIONS; i += 1) {
      const angle = (i / DIRECTIONS) * Math.PI * 2;
      const nx = p.x + Math.cos(angle) * 30;
      const ny = p.y + Math.sin(angle) * 30;
      const s = seenAt(world, nx, ny);
      if (s < bestSeen) { bestSeen = s; bestMove = { x: Math.cos(angle), y: Math.sin(angle) }; }
    }
    return bestMove;
  }
  // Drop waypoints already reached.
  while (path.length > 0 && Math.hypot(path[0].x - p.x, path[0].y - p.y) < 14) path.shift();
  if (path.length === 0) return { x: 0, y: 0 };
  const next = path[0];
  // Wait out a cone sweeping across the next step.
  if (seenAt(world, next.x, next.y) > 0.35) return { x: 0, y: 0 };
  const dx = next.x - p.x;
  const dy = next.y - p.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { x: 0, y: 0 };
  return { x: dx / dist, y: dy / dist };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      stepWorld(world, STEP, { x: 0, y: 0 }, false);
    }
    return { screen: SCREEN_TITLE };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  let events = 0;
  let path = null;
  let pathTarget = '';
  for (let index = 0; index < limit / STEP; index += 1) {
    const target = pickTarget(world);
    const targetKey = `${target.x},${target.y},${world.lootTaken}`;
    if (path === null || path.length === 0 || targetKey !== pathTarget) {
      path = findPath(world, target.x, target.y);
      pathTarget = targetKey;
    }
    events = stepWorld(world, STEP, autopilot(world, path), false);
    if (events & EVENT_OVER) break;
  }
  return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY };
}
