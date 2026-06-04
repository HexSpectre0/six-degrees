# Six Degrees of Circles

A daily puzzle game built on the [Circles](https://aboutcircles.com) web of trust.

Two people are chosen. Your job: connect them through a chain of trust —
hopping from one person to someone they trust, then to someone *that* person
trusts, and so on — reaching the target in as few hops as possible. A
temperature bar heats up as you close in and cools when you stray. The
pathfinder knows the shortest route (the "par"); you race to match or beat it.

It's Wordle for a web of trust.

**Play it:** https://six-degrees-pkg.vercel.app

## How it works

Pick **practice** for unlimited random puzzles, or **daily** for the one shared,
scored puzzle of the day (one attempt — come back tomorrow for a new one). A
short how-to appears on your first visit; the **?** button reopens it anytime.

There's no wallet and no signing — open the link and play.

## Why this is a Circles app, not a generic game

The game is built on two Circles primitives:

- **The trust graph** — who accepts whose personal currency. The game reads a
  person's trusted connections to know where you can hop next.
- **Pathfinding** — Circles can route value through chains of trust. The game
  uses the pathfinder to compute the optimal connecting path (the par score)
  and the live distance-to-target that drives the temperature bar.

Both are read-only. The official Circles tools include a Sankey diagram that
*shows* you a trust path; this app *hides* it and turns discovering it into a
game.

## Status

**v0.1** — runs on a built-in sample trust network of ~24 people, so it plays
instantly with zero setup. The Circles SDK integration is wired behind a flag
(`USE_LIVE` in `src/circles.js`): all live calls are isolated in two functions,
`liveNeighborsOf` and `liveOptimalPath`, ready to read the real trust graph and
run real pathfinding against the public Circles RPC. Connecting to live data and
an embedded-wallet build are the plan for the next cycle.

## Run locally

```
npm install
npm run dev
```

Open the printed local URL. Build a static bundle with `npm run build` (outputs
to `dist/`).

## Project layout

- `src/circles.js` — data layer. SDK integration + sample graph, one switch.
- `src/puzzle.js` — date-seeded daily puzzle picker with a solvability check.
- `src/GraphView.jsx` — the radial trust-graph visualization + temperature bar.
- `src/App.jsx` — game loop, daily/practice modes, scoring, how-to, share card.
- `src/styles.css` — all styling.

Built with the [Circles SDK](https://docs.aboutcircles.com).
