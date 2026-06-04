import React, { useEffect, useState, useCallback } from 'react';
import { neighborsOf, optimalPath, distanceToTarget, profileOf, USE_LIVE } from './circles.js';
import { getDailyPuzzle, getPracticePuzzle, todayKey } from './puzzle.js';
import GraphView from './GraphView.jsx';

const STORAGE_KEY = 'six-degrees-state';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}
function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [mode, setMode] = useState('daily'); // 'daily' | 'practice'
  const [puzzle, setPuzzle] = useState(null);
  const [path, setPath] = useState([]); // chain of addresses chosen so far
  const [options, setOptions] = useState([]); // neighbors of current node
  const [temp, setTemp] = useState(null); // 0..1 closeness to target
  const [status, setStatus] = useState('loading'); // loading|playing|won|lost
  const [error, setError] = useState(null);
  const [persisted, setPersisted] = useState(loadState());
  const [showHelp, setShowHelp] = useState(false);

  // Show the how-to-play overlay automatically on a player's first visit.
  useEffect(() => {
    try {
      if (!localStorage.getItem('six-degrees-seen-intro')) {
        setShowHelp(true);
        localStorage.setItem('six-degrees-seen-intro', '1');
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Loads a puzzle for the given mode and starts (or restores) play.
  const loadPuzzle = useCallback(
    async (which) => {
      setStatus('loading');
      try {
        const p =
          which === 'practice'
            ? await getPracticePuzzle()
            : await getDailyPuzzle();
        setPuzzle(p);

        // Only the daily puzzle is scored & locked to one attempt.
        if (which === 'daily') {
          const saved = persisted[p.key];
          if (saved && (saved.status === 'won' || saved.status === 'lost')) {
            setPath(saved.path);
            setStatus(saved.status);
            return;
          }
        }
        setPath([p.start]);
        const n = await neighborsOf(p.start);
        setOptions(n);
        setStatus('playing');
      } catch (e) {
        setError(String(e));
      }
    },
    [persisted]
  );

  // Load the daily puzzle on mount.
  useEffect(() => {
    loadPuzzle('daily');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = useCallback(
    (which) => {
      setMode(which);
      loadPuzzle(which);
    },
    [loadPuzzle]
  );

  const current = path[path.length - 1];
  const hopsUsed = path.length - 1;
  // Generous hop budget: par plus a little slack, so it's beatable but scored.
  const budget = puzzle ? puzzle.par + 2 : 0;

  // Temperature: how close the CURRENT node is to the target, as a 0..1 value
  // driving the bar under the board. We compare current distance against the
  // puzzle's starting distance (puzzle.par). Reaching the target = 1 (hot);
  // being as far as the start = a low baseline; going FARTHER than the start
  // pushes it below that, toward freezing. The signal is on your *position*,
  // not on the nodes — so the board gives nothing away and every choice is a
  // real decision.
  useEffect(() => {
    let cancelled = false;
    if (status !== 'playing' || !puzzle) {
      setTemp(null);
      return;
    }
    if (current === puzzle.target) {
      setTemp(1);
      return;
    }
    (async () => {
      const d = await distanceToTarget(current, puzzle.target);
      if (cancelled) return;
      if (d == null) {
        setTemp(0); // unreachable from here — freezing
        return;
      }
      const start = puzzle.par || 1;
      // closeness: 1 when d=0 (target), ~0.15 baseline when d=start,
      // lower when d>start. Clamped to [0,1].
      const raw = 1 - d / (start + 1);
      setTemp(Math.max(0, Math.min(1, raw)));
    })();
    return () => {
      cancelled = true;
    };
  }, [current, puzzle, status]);

  const choose = useCallback(
    async (addr) => {
      if (status !== 'playing' || !puzzle) return;
      const nextPath = [...path, addr];
      setPath(nextPath);
      const isDaily = mode === 'daily';

      if (addr === puzzle.target) {
        setStatus('won');
        if (isDaily) {
          const result = {
            status: 'won',
            path: nextPath,
            hops: nextPath.length - 1,
            par: puzzle.par,
          };
          const np = { ...persisted, [puzzle.key]: result };
          setPersisted(np);
          saveState(np);
        }
        return;
      }

      const newHops = nextPath.length - 1;
      if (newHops >= budget) {
        setStatus('lost');
        if (isDaily) {
          const result = { status: 'lost', path: nextPath, par: puzzle.par };
          const np = { ...persisted, [puzzle.key]: result };
          setPersisted(np);
          saveState(np);
        }
        return;
      }

      const n = await neighborsOf(addr);
      setOptions(n);
    },
    [status, puzzle, path, persisted, budget, mode]
  );

  const undo = useCallback(async () => {
    if (status !== 'playing' || path.length <= 1) return;
    const trimmed = path.slice(0, -1);
    setPath(trimmed);
    const n = await neighborsOf(trimmed[trimmed.length - 1]);
    setOptions(n);
  }, [status, path]);

  if (error) {
    return (
      <div className="shell">
        <div className="card error">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <p className="muted">
            If you're in live mode, check that the Circles RPC is reachable from
            your browser.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'loading' || !puzzle) {
    return (
      <div className="shell">
        <div className="card">
          <p className="muted">Finding today's circle…</p>
        </div>
      </div>
    );
  }

  const startP = profileOf(puzzle.start);
  const targetP = profileOf(puzzle.target);

  return (
    <div className="shell">
      <header className="masthead">
        <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="How to play">
          ?
        </button>
        <div className="kicker">{USE_LIVE ? 'live · gnosis chain' : 'demo · sample network'}</div>
        <h1>
          Six Degrees<span className="of">of</span>Circles
        </h1>
        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'daily' ? 'active' : ''}`}
            onClick={() => mode !== 'daily' && switchMode('daily')}
          >
            daily
          </button>
          <button
            className={`mode-tab ${mode === 'practice' ? 'active' : ''}`}
            onClick={() => mode !== 'practice' && switchMode('practice')}
          >
            practice
          </button>
        </div>
        <div className="dateline">
          {mode === 'daily' ? `${todayKey()} · one scored attempt` : 'unlimited · just for fun'}
        </div>
      </header>

      <div className="goal">
        <div className="goal-node">
          <span className="goal-emoji">{startP.emoji}</span>
          <span className="goal-name">{startP.name}</span>
          <span className="goal-tag">start</span>
        </div>
        <div className="goal-arrow">
          <span className="par-pill">par {puzzle.par}</span>
        </div>
        <div className="goal-node">
          <span className="goal-emoji">{targetP.emoji}</span>
          <span className="goal-name">{targetP.name}</span>
          <span className="goal-tag target">target</span>
        </div>
      </div>

      <GraphView
        path={path}
        target={puzzle.target}
        options={options}
        temp={temp}
        onChoose={choose}
        status={status}
      />

      <div className="hud">
        <div className="counter">
          hops <strong>{hopsUsed}</strong> / {budget}
        </div>
        {status === 'playing' && path.length > 1 && (
          <button className="ghost" onClick={undo}>
            ← undo
          </button>
        )}
      </div>

      {status === 'playing' && (
        <div className="trail">
          {path.map((a, i) => {
            const p = profileOf(a);
            return (
              <span key={a + i} className="trail-step">
                {p.emoji} {p.name}
                {i < path.length - 1 && <span className="trail-link">→</span>}
              </span>
            );
          })}
        </div>
      )}

      {(status === 'won' || status === 'lost') && (
        <Result
          status={status}
          puzzle={puzzle}
          path={path}
          mode={mode}
          onNext={() => switchMode('practice')}
        />
      )}

      <footer className="foot">
        Built on <a href="https://aboutcircles.com">Circles</a> · trust-graph
        pathfinding via the Circles SDK
      </footer>

      {showHelp && <HowToPlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}

function HowToPlay({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 className="modal-title">How to play</h2>

        <p className="modal-lead">
          Circles is a web of <em>trust</em>: every person accepts the personal
          currency of people they trust. Your job is to connect two people
          through that web.
        </p>

        <ol className="howto-steps">
          <li>
            <span className="step-n">1</span>
            <div>
              You start on one person (the <strong>start</strong>) and must reach
              another (the <strong>target</strong>, glowing mint).
            </div>
          </li>
          <li>
            <span className="step-n">2</span>
            <div>
              Each turn you see who the current person trusts. <strong>Tap one</strong>{' '}
              to hop to them — then see who <em>they</em> trust, and so on.
            </div>
          </li>
          <li>
            <span className="step-n">3</span>
            <div>
              The <strong>temperature bar</strong> heats up as you get closer to
              the target and cools when you stray. It's your only guide — the
              people all look the same.
            </div>
          </li>
          <li>
            <span className="step-n">4</span>
            <div>
              Reach the target in as few hops as you can. <strong>Par</strong> is
              the shortest possible — match or beat it.
            </div>
          </li>
        </ol>

        <div className="modal-modes">
          <div className="mode-card">
            <div className="mode-card-name">daily</div>
            <p>
              One puzzle a day, the same for everyone, <strong>one scored
              attempt</strong>. Share your result and compare.
            </p>
          </div>
          <div className="mode-card">
            <div className="mode-card-name">practice</div>
            <p>
              Endless random puzzles, <strong>unlimited tries</strong>, no score.
              Warm up here.
            </p>
          </div>
        </div>

        <button className="modal-cta" onClick={onClose}>
          got it — let's play
        </button>
      </div>
    </div>
  );
}

function Result({ status, puzzle, path, mode, onNext }) {
  const [optimal, setOptimal] = useState(null);
  const [copied, setCopied] = useState(false);
  const hops = path.length - 1;
  const isPractice = mode === 'practice';

  useEffect(() => {
    let cancelled = false;
    optimalPath(puzzle.start, puzzle.target).then((o) => {
      if (!cancelled) setOptimal(o);
    });
    return () => {
      cancelled = true;
    };
  }, [puzzle]);

  const won = status === 'won';
  const beatPar = won && hops <= puzzle.par;

  const share = () => {
    const grid =
      won
        ? '🟩'.repeat(puzzle.par) + (hops > puzzle.par ? '⬜'.repeat(hops - puzzle.par) : '')
        : '🟥'.repeat(hops);
    const text = `Six Degrees of Circles · ${puzzle.key}
${won ? `solved in ${hops}` : 'missed'} (par ${puzzle.par})
${grid}
play the trust graph`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`card result ${won ? 'win' : 'lose'}`}>
      <h2>
        {won ? (beatPar ? 'On par! 🎯' : 'Connected ✓') : 'Out of hops'}
      </h2>
      <p className="result-line">
        {won
          ? `You linked them in ${hops} hop${hops === 1 ? '' : 's'} (par ${puzzle.par}).`
          : `No path found within the budget. The optimal was ${puzzle.par}.`}
      </p>

      {optimal && (
        <div className="optimal">
          <div className="optimal-label">shortest trust path</div>
          <div className="optimal-chain">
            {optimal.map((a, i) => {
              const p = profileOf(a);
              return (
                <span key={a + i} className="opt-step">
                  {p.emoji} {p.name}
                  {i < optimal.length - 1 && <span className="opt-link">→</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {isPractice ? (
        <button className="share" onClick={onNext}>
          next puzzle ↻
        </button>
      ) : (
        <>
          <button className="share" onClick={share}>
            {copied ? 'copied!' : 'share result'}
          </button>
          <p className="muted come-back">come back tomorrow for a new circle</p>
        </>
      )}
    </div>
  );
}
