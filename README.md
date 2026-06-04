# Six Degrees of Circles

A daily puzzle game built on the [Circles](https://aboutcircles.com) trust graph.

Each day, two real people in the Circles network are chosen. Your job: connect
them through a chain of trust, hopping from one person to someone they trust,
then to someone *that* person trusts, and so on — reaching the target in as few
hops as possible. The Circles pathfinder knows the shortest route (the "par");
you race to match or beat it.

It's Wordle for a web of trust.

## Why this is a Circles app, not a generic game

The whole game runs on two Circles primitives and nothing else:

- **The trust graph** — who accepts whose personal currency. We read a person's
  trusted connections with `getAggregatedTrustRelations`.
- **Pathfinding** — Circles can route value through chains of trust. We use
  `pathfinder.findPath` to compute the optimal connecting path (the par score).

Both are **read-only**: no wallet, no signing, no transaction. A judge opens the
URL and plays immediately. The official Circles tools include a Sankey diagram
that *shows* you a trust path; this app *hides* it and turns discovering it into
a game.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL. It runs out of the box in **demo mode** with a
built-in sample network of ~24 people — fully playable with no setup or
network access.

## Switch to live Circles data

Demo mode needs no blockchain packages at all. When you're ready for real data:

1. Install the Circles SDK (let npm pick the current version — don't pin):

   ```bash
   npm install @aboutcircles/sdk-rpc@latest
   ```

2. Open `src/circles.js` and set:

   ```js
   export const USE_LIVE = true;
   ```

That's the only code change. The app then reads the real trust graph and runs
real pathfinding against the public Circles RPC (`https://rpc.aboutcircles.com/`),
still entirely read-only. All live calls are isolated in `liveNeighborsOf` and
`liveOptimalPath` in that one file.

> If the SDK's RPC client class or method names differ slightly from what's in
> `circles.js` (the SDK is young and evolving), check the current shape at
> https://docs.aboutcircles.com/circles-sdk/pathfinder and adjust those two
> functions — they're the only place the SDK is touched.

> Note: live mode needs a curated list of starting/target avatars so the daily
> puzzle always has a fun 2–4 hop solution. Generate one offline by sampling
> address pairs, running `findPath`, and keeping those whose optimal path is
> 2–4 hops — then have the daily picker choose from that vetted list. The demo
> graph already guarantees this; see the verification in the project notes.

## Build for deployment

```bash
npm run build
```

Outputs a static site in `dist/` — deploy to Vercel, Netlify, GitHub Pages, or
any static host to get the public URL the submission requires.

## Project layout

- `src/circles.js` — data layer. Real SDK calls + mock graph, one switch.
- `src/puzzle.js` — date-seeded daily puzzle picker with solvability check.
- `src/GraphView.jsx` — the radial trust-graph visualization.
- `src/App.jsx` — game loop, scoring, share card.
- `src/styles.css` — all styling.

## Submitting to circles/garage

1. Deploy to get a public URL.
2. Builder profile: https://garage.aboutcircles.com/signup
3. Register the app (name, pitch, URL, repo, this README):
   https://garage.aboutcircles.com/register

You can iterate and resubmit before each Sunday deadline.

Built with the [Circles SDK](https://docs.aboutcircles.com).
