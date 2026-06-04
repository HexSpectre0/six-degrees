/*
 * puzzle.js — picks the day's puzzle.
 *
 * Same date -> same puzzle for everyone (the Wordle trick), which is what
 * makes shared scores meaningful. We seed a small PRNG with today's date,
 * then pick a (start, target) pair whose optimal path lands in a fun range
 * of hops. In mock mode the graph is fixed so this is deterministic; in
 * live mode you'd pre-generate a vetted list offline and seed-pick from it.
 */

import { ALL_ADDRESSES, optimalPath } from './circles.js';

// Mulberry32: tiny, fast, deterministic PRNG.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(date = new Date()) {
  // YYYY-MM-DD in local time.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function seedFromKey(key) {
  let h = 0;
  for (const c of key) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return h >>> 0;
}

/**
 * Returns { start, target, par, optimal } for the given date.
 * par = number of hops in the optimal path (edges, not nodes).
 * Only accepts pairs whose optimal path is between MIN_HOPS and MAX_HOPS.
 */
export async function getDailyPuzzle(date = new Date()) {
  const key = todayKey(date);
  const rand = mulberry32(seedFromKey(key));
  const MIN_HOPS = 2;
  const MAX_HOPS = 4;

  // Try several seeded pairs until one is in the fun range.
  for (let attempt = 0; attempt < 200; attempt++) {
    const a = ALL_ADDRESSES[Math.floor(rand() * ALL_ADDRESSES.length)];
    const b = ALL_ADDRESSES[Math.floor(rand() * ALL_ADDRESSES.length)];
    if (a === b) continue;
    const optimal = await optimalPath(a, b);
    if (!optimal) continue;
    const par = optimal.length - 1;
    if (par >= MIN_HOPS && par <= MAX_HOPS) {
      return { key, start: a, target: b, par, optimal };
    }
  }
  // Fallback: first valid pair found (should never be reached with mock graph).
  const a = ALL_ADDRESSES[0];
  const b = ALL_ADDRESSES[ALL_ADDRESSES.length - 1];
  const optimal = await optimalPath(a, b);
  return { key, start: a, target: b, par: optimal ? optimal.length - 1 : 0, optimal };
}

/**
 * A random, unscored puzzle for practice mode. Same 2–4 hop range as the
 * daily, but not date-seeded — every call is a fresh challenge. No localStorage
 * lock, so players (and judges) can play as many as they like.
 */
export async function getPracticePuzzle() {
  const MIN_HOPS = 2;
  const MAX_HOPS = 4;
  for (let attempt = 0; attempt < 400; attempt++) {
    const a = ALL_ADDRESSES[Math.floor(Math.random() * ALL_ADDRESSES.length)];
    const b = ALL_ADDRESSES[Math.floor(Math.random() * ALL_ADDRESSES.length)];
    if (a === b) continue;
    const optimal = await optimalPath(a, b);
    if (!optimal) continue;
    const par = optimal.length - 1;
    if (par >= MIN_HOPS && par <= MAX_HOPS) {
      return { key: 'practice', start: a, target: b, par, optimal };
    }
  }
  // Extremely unlikely fallback.
  const a = ALL_ADDRESSES[0];
  const b = ALL_ADDRESSES[1];
  const optimal = await optimalPath(a, b);
  return { key: 'practice', start: a, target: b, par: optimal ? optimal.length - 1 : 0, optimal };
}
