'use client';

import {gamingV7} from '../../../lib/gaming-v7.mjs';

export default function GamingV7Progress({snapshot}) {
  const data = gamingV7(snapshot);
  if (!data) return <section className="gaming-card"><h2>V7 production</h2><p>Waiting for the V7 worker status feed.</p></section>;
  return <section className="gaming-card">
    <div className="gaming-row"><h2>V7 production</h2><span className="gaming-pill">{data.fresh ? 'Recent worker status' : 'Worker status stale'}</span></div>
    <p>Real reels ready {data.counts.real.complete}/{data.counts.real.total} · Isolated mock tests {data.counts.mock.complete}/{data.counts.mock.total}</p>
    <p>Fixed 70:30 · 1080 × 1920 · 60 FPS · Public release disabled</p>
    {data.jobs.length > 0 && <ul>{data.jobs.map(job => <li key={job.mode + job.id}>
      <strong>{job.mode === 'real' ? 'Real candidate' : 'Mock fixture'} {job.id.slice(0, 8)}</strong>
      <p>{job.status.toLowerCase().replaceAll('_', ' ')} · Active {data.fresh && job.active !== null ? job.active ? 'yes' : 'no' : 'unconfirmed'} · Attempt {job.attempts ?? 'unknown'}/3</p>
      {job.expected_frames && <label>Rendered frames {job.completed_frames ?? 0}/{job.expected_frames}
        <progress max={job.expected_frames} value={job.completed_frames ?? 0} />
      </label>}
      {job.error && <p role="status">{job.error}</p>}
    </li>)}</ul>}
  </section>;
}

