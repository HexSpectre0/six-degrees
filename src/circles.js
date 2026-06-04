/*
 * circles.js — the data layer for Six Degrees of Circles.
 *
 * Two modes, controlled by USE_LIVE below:
 *
 *   USE_LIVE = false  -> uses the built-in MOCK_GRAPH. The game is fully
 *                        playable offline with zero setup. Good for demos
 *                        and for working on the UI.
 *
 *   USE_LIVE = true   -> talks to the real Circles network over RPC.
 *                        Read-only: no wallet, no signing. A judge can open
 *                        the deployed URL and it just works.
 *
 * To go live: run `npm install` locally, flip USE_LIVE to true, and run
 * `npm run dev`. The two functions below (neighborsOf and optimalPath) are
 * already wired to the current @aboutcircles SDK. Everything the game needs
 * flows through just these two functions.
 */

export const USE_LIVE = false;

// Public Circles RPC endpoint (read-only). See:
// https://docs.aboutcircles.com/circles-sdk/pathfinder
const RPC_URL = 'https://rpc.aboutcircles.com/';

// One CRC, expressed in wei (18 decimals). We probe paths for a tiny,
// symbolic amount — the game cares about the *route*, not the value.
const PROBE_FLOW = 1000000000000000000n; // 1 CRC

// ---------------------------------------------------------------------------
// LIVE implementation
// ---------------------------------------------------------------------------

let _rpc = null;
async function getRpc() {
  if (_rpc) return _rpc;
  // The SDK package name is held in a variable and marked with Vite's
  // ignore hint so the bundler does NOT try to resolve it at build time.
  // It is only resolved at runtime, in live mode, after you've run:
  //   npm install @aboutcircles/sdk-rpc@latest
  // In demo mode this function is never called, so nothing breaks.
  const pkg = '@aboutcircles/sdk-rpc';
  const { CirclesRpc } = await import(/* @vite-ignore */ pkg);
  _rpc = new CirclesRpc(RPC_URL);
  return _rpc;
}

/**
 * Live: return the addresses a given avatar trusts (its neighbors in the
 * trust graph). Uses getAggregatedTrustRelations, which groups mutual
 * relations together — cleaner than raw trust events for a contact-style view.
 */
async function liveNeighborsOf(address) {
  const rpc = await getRpc();
  // The SDK exposes data queries under rpc.circles (convenience namespace).
  // getAggregatedTrustRelations returns rows describing each relation.
  const relations = await rpc.circles.getAggregatedTrustRelations(address);
  // Keep anyone this avatar trusts (outgoing or mutual): those are the
  // people whose tokens can flow onward, i.e. valid next hops.
  return relations
    .filter((r) => r.relation === 'trusts' || r.relation === 'mutuallyTrusts')
    .map((r) => r.objectAvatar.toLowerCase());
}

/**
 * Live: ask the pathfinder for the optimal trust path from A to B.
 * Returns an ordered list of addresses [A, ..., B], or null if no path.
 * See FindPathParams in the pathfinder docs.
 */
async function liveOptimalPath(from, to) {
  const rpc = await getRpc();
  const result = await rpc.pathfinder.findPath({
    from,
    to,
    targetFlow: PROBE_FLOW,
    useWrappedBalances: true,
    maxTransfers: 6,
  });
  if (!result || !result.transfers || result.transfers.length === 0) return null;
  // transfers is an ordered list of legs: [{ from, to, tokenOwner, value }].
  // Stitch the leg endpoints into a single ordered chain of addresses.
  const chain = [result.transfers[0].from.toLowerCase()];
  for (const leg of result.transfers) {
    const next = leg.to.toLowerCase();
    if (next !== chain[chain.length - 1]) chain.push(next);
  }
  return chain;
}

// ---------------------------------------------------------------------------
// MOCK implementation — a small, hand-built trust graph so the game is
// playable with no network. ~24 "people" with names, arranged so several
// fun 2–4 hop puzzles exist between them.
// ---------------------------------------------------------------------------

const MOCK_PEOPLE = {
  '0xaa': { name: 'Mira', emoji: '🦊' },
  '0xab': { name: 'Tomas', emoji: '🐢' },
  '0xac': { name: 'Yuki', emoji: '🦉' },
  '0xad': { name: 'Beatriz', emoji: '🦋' },
  '0xae': { name: 'Kofi', emoji: '🐘' },
  '0xaf': { name: 'Lena', emoji: '🦌' },
  '0xb0': { name: 'Idris', emoji: '🦁' },
  '0xb1': { name: 'Sora', emoji: '🐬' },
  '0xb2': { name: 'Petra', emoji: '🦔' },
  '0xb3': { name: 'Diego', emoji: '🐝' },
  '0xb4': { name: 'Nour', emoji: '🦚' },
  '0xb5': { name: 'Anya', emoji: '🦝' },
  '0xb6': { name: 'Felix', emoji: '🦅' },
  '0xb7': { name: 'Greta', emoji: '🐙' },
  '0xb8': { name: 'Hassan', emoji: '🦬' },
  '0xb9': { name: 'Ines', emoji: '🐧' },
  '0xba': { name: 'Jonas', emoji: '🦩' },
  '0xbb': { name: 'Wren', emoji: '🐓' },
  '0xbc': { name: 'Oksana', emoji: '🦢' },
  '0xbd': { name: 'Pavel', emoji: '🦦' },
  '0xbe': { name: 'Rumi', emoji: '🦥' },
  '0xbf': { name: 'Selma', emoji: '🐳' },
  '0xc0': { name: 'Theo', emoji: '🦨' },
  '0xc1': { name: 'Vera', emoji: '🦡' },
};

// Undirected-ish adjacency. Trust is directional in Circles, but for the
// mock we keep edges symmetric to make the puzzle intuitive.
const MOCK_EDGES = {
  '0xaa': ['0xab', '0xac', '0xb1'],
  '0xab': ['0xaa', '0xad', '0xae'],
  '0xac': ['0xaa', '0xaf', '0xb2'],
  '0xad': ['0xab', '0xb0', '0xb3'],
  '0xae': ['0xab', '0xb4', '0xb5'],
  '0xaf': ['0xac', '0xb6', '0xb7'],
  '0xb0': ['0xad', '0xb8', '0xb9'],
  '0xb1': ['0xaa', '0xba', '0xbb'],
  '0xb2': ['0xac', '0xbc', '0xbd'],
  '0xb3': ['0xad', '0xbe', '0xb4'],
  '0xb4': ['0xae', '0xb3', '0xbf'],
  '0xb5': ['0xae', '0xc0', '0xb6'],
  '0xb6': ['0xaf', '0xb5', '0xc1'],
  '0xb7': ['0xaf', '0xbc', '0xc0'],
  '0xb8': ['0xb0', '0xbe', '0xba'],
  '0xb9': ['0xb0', '0xbf', '0xc1'],
  '0xba': ['0xb1', '0xb8', '0xbd'],
  '0xbb': ['0xb1', '0xbc', '0xbe'],
  '0xbc': ['0xb2', '0xb7', '0xbb'],
  '0xbd': ['0xb2', '0xba', '0xc0'],
  '0xbe': ['0xb3', '0xb8', '0xbb'],
  '0xbf': ['0xb4', '0xb9', '0xc1'],
  '0xc0': ['0xb5', '0xb7', '0xbd'],
  '0xc1': ['0xb6', '0xb9', '0xbf'],
};

function mockNeighborsOf(address) {
  return (MOCK_EDGES[address] || []).slice();
}

// Breadth-first search for the shortest path in the mock graph.
function mockOptimalPath(from, to) {
  if (from === to) return [from];
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    for (const next of mockNeighborsOf(last)) {
      if (seen.has(next)) continue;
      const extended = [...path, next];
      if (next === to) return extended;
      seen.add(next);
      queue.push(extended);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API — the game imports only these.
// ---------------------------------------------------------------------------

export function profileOf(address) {
  if (MOCK_PEOPLE[address]) return MOCK_PEOPLE[address];
  // Live mode: we don't have names baked in. Show a short address + a
  // deterministic emoji so nodes stay visually distinct.
  const animals = ['🦊','🐢','🦉','🦋','🐘','🦌','🦁','🐬','🦔','🐝','🦚','🦝','🦅','🐙'];
  let h = 0;
  for (const c of address) h = (h * 31 + c.charCodeAt(0)) % animals.length;
  return { name: `${address.slice(0, 6)}…${address.slice(-4)}`, emoji: animals[h] };
}

export async function neighborsOf(address) {
  return USE_LIVE ? liveNeighborsOf(address) : mockNeighborsOf(address);
}

export async function optimalPath(from, to) {
  return USE_LIVE ? liveOptimalPath(from, to) : mockOptimalPath(from, to);
}

/**
 * Shortest number of hops from `from` to `to`, or null if unreachable.
 * Used for the warmer/cooler hinting: we compare each neighbor's distance to
 * the target against the current node's distance. Reuses optimalPath, so it
 * works identically in mock and live mode.
 */
export async function distanceToTarget(from, to) {
  if (from === to) return 0;
  const p = await optimalPath(from, to);
  return p ? p.length - 1 : null;
}

// All known addresses — used by the daily puzzle picker (mock mode only).
export const ALL_ADDRESSES = Object.keys(MOCK_PEOPLE);
