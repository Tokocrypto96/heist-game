// Seeded random numbers (mulberry32): the same seed always deals the same game,
// so screenshots and replays are reproducible.
export function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from a seeded generator. */
export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick one element of an array from a seeded generator. */
export function randomPick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
