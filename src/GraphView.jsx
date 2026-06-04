import React, { useMemo } from 'react';
import { profileOf } from './circles.js';

/*
 * GraphView renders the current node at the center of a ring of its trusted
 * connections. Tapping a connection makes it the new center (a hop). The
 * target, if it's among the current node's neighbors, glows.
 *
 * This is deliberately a focused "ego network" view rather than the whole
 * graph: it keeps each decision legible and makes the hop-by-hop journey feel
 * like exploration. (A full force-directed map of thousands of nodes would be
 * a soup; that's the trap the official Sankey tool falls into for a *game*.)
 */
export default function GraphView({ path, target, options, temp = null, onChoose, status }) {
  const current = path[path.length - 1];
  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const ringR = 132;

  const nodes = useMemo(() => {
    const n = options.length || 1;
    return options.map((addr, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        addr,
        x: cx + ringR * Math.cos(angle),
        y: cy + ringR * Math.sin(angle),
        isTarget: addr === target,
        visited: path.includes(addr),
      };
    });
  }, [options, path, target, cx, cy]);

  const currentP = profileOf(current);
  const playing = status === 'playing';

  return (
    <div className="graph-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="graph" role="img">
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--target)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--target)" stopOpacity="0.15" />
          </radialGradient>
        </defs>

        {/* center glow */}
        <circle cx={cx} cy={cy} r={ringR * 0.9} fill="url(#centerGlow)" />

        {/* spokes */}
        {nodes.map((nd) => (
          <line
            key={'l' + nd.addr}
            x1={cx}
            y1={cy}
            x2={nd.x}
            y2={nd.y}
            className={`spoke ${nd.isTarget ? 'spoke-target' : ''}`}
          />
        ))}

        {/* neighbor nodes */}
        {nodes.map((nd, i) => {
          const p = profileOf(nd.addr);
          return (
            <g
              key={nd.addr}
              className={`node ${playing ? 'tappable' : ''} ${
                nd.isTarget ? 'node-target' : ''
              } ${nd.visited ? 'node-visited' : ''}`}
              transform={`translate(${nd.x},${nd.y})`}
              onClick={() => playing && onChoose(nd.addr)}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {nd.isTarget && <circle r="30" fill="url(#targetGlow)" />}
              <circle r="22" className="node-disc" />
              <text className="node-emoji" textAnchor="middle" dy="7">
                {p.emoji}
              </text>
              <text className="node-label" textAnchor="middle" y="38">
                {p.name}
              </text>
            </g>
          );
        })}

        {/* center node (current position) */}
        <g transform={`translate(${cx},${cy})`} className="node center-node">
          <circle r="30" className="center-disc" />
          <text className="center-emoji" textAnchor="middle" dy="9">
            {currentP.emoji}
          </text>
          <text className="center-label" textAnchor="middle" y="48">
            {currentP.name}
          </text>
        </g>
      </svg>

      {playing && (
        <>
          <div className="thermo">
            <div className="thermo-track">
              <div
                className="thermo-fill"
                style={{ width: `${Math.round((temp ?? 0) * 100)}%` }}
              />
            </div>
            <div className="thermo-labels">
              <span>cold</span>
              <span className="thermo-read">
                {temp == null
                  ? '—'
                  : temp >= 1
                  ? 'there!'
                  : temp >= 0.75
                  ? 'burning up'
                  : temp >= 0.5
                  ? 'getting warmer'
                  : temp >= 0.25
                  ? 'cool'
                  : 'freezing'}
              </span>
              <span>hot</span>
            </div>
          </div>
          <p className="hint">
            tap who <strong>{currentP.name}</strong> trusts — watch the
            temperature
          </p>
        </>
      )}
    </div>
  );
}
