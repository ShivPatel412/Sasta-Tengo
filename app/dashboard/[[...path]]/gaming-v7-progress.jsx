'use client';

import {gamingV7} from '../../../lib/gaming-v7.mjs';

const label = value => String(value || '').toLowerCase().replaceAll('_',' ');
const number = value => value === null || value === undefined ? 'Not reported' : value;
const stageNames = {production_qa_started:'Audiovisual QA in progress',production_qa_verified:'Audiovisual QA passed',
  encode:'Rendering',cut_verified:'Finalizing render',verified:'Render verified',reuse:'Verified checkpoint reused',start:'Starting render'};

export default function GamingV7Progress({snapshot}) {
  const data = gamingV7(snapshot);
  if (!data) return <section className="gaming-card"><h2>V7 production</h2><p>Waiting for the V7 worker status feed.</p></section>;
  const source = data.upstream;
  return <section className="gaming-card">
    <div className="gaming-row"><h2>V7 production</h2><span className="gaming-pill">{data.fresh ? 'Recent worker status' : 'Worker status stale'}</span></div>
    <dl className="gaming-facts">
      <div><dt>Analysis checkpoints</dt><dd>{number(source.analysis_complete)}/{number(source.analysis_total)}</dd></div>
      <div><dt>Timecoded audiovisual windows completed</dt><dd>{number(source.analysis_windows_complete)}</dd></div>
      <div><dt>Windows requiring review / invalid receipts</dt><dd>{number(source.analysis_windows_review_required)} / {number(source.analysis_windows_invalid)}</dd></div>
      <div><dt>Emotional analysis review</dt><dd>{label(source.emotional_analysis_status)}</dd></div>
      <div><dt>Quality reviews attempted</dt><dd>{number(source.reviews_attempted)}</dd></div>
      <div><dt>Successfully corrected reviews</dt><dd>{number(source.reviews_corrected)}</dd></div>
      <div><dt>Unresolved reviews</dt><dd>{number(source.reviews_unresolved)}</dd></div>
      <div><dt>Provisional context proposals</dt><dd>{number(source.context_proposals)}</dd></div>
      <div><dt>Approved export candidates</dt><dd>{source.approved_candidates === null ? 'Awaiting approval gate' : source.approved_candidates}</dd></div>
    </dl>
    <p>Candidate gate · {label(data.candidate_import.status || source.export_gate)}</p>
    {source.export_gate === 'WAITING_EXPORT' && <p role="status">Waiting for the approved real candidate export. Rendering remains gated.</p>}
    {data.candidate_import.status === 'READY_FOR_FRAMING' && <p role="status">Reviewed framing coverage is required before rendering.</p>}
    {source.reviews_invalid > 0 && <p role="status">{source.reviews_invalid} review receipts failed source or boundary validation.</p>}
    <p>Real reels ready {data.counts.real.complete}/{data.counts.real.total} · Isolated mock tests {data.counts.mock.complete}/{data.counts.mock.total}</p>
    <p>Fixed 70:30 · 1080 × 1920 · 60 FPS · Public release disabled</p>
    {data.jobs.length > 0 && <ul>{data.jobs.map(job => <li key={job.mode + job.id}>
      <strong>{job.mode === 'real' ? 'Real candidate' : 'Mock fixture'} {job.id.slice(0, 8)}</strong>
      <p>{label(job.status)} · Active {data.fresh && job.active !== null ? job.active ? 'yes' : 'no' : 'unconfirmed'} · Attempt {job.attempts ?? 'unknown'}/3</p>
      {job.stage && <p>{stageNames[job.stage]}</p>}
      <p>QA · {label(job.quality_status)}</p>
      {job.expected_frames && <label>Rendered frames {job.completed_frames ?? 0}/{job.expected_frames}
        <progress max={job.expected_frames} value={job.completed_frames ?? 0} />
      </label>}
      {job.error && <p role="status">{job.error}</p>}
    </li>)}</ul>}
    <h3>Private platform staging</h3>
    {['instagram','youtube'].map(platform => {
      const states = Object.entries(data.publishing.real[platform]);
      return <p key={platform}>{platform === 'instagram' ? 'Instagram' : 'YouTube'} · {states.length
        ? states.map(([status,total]) => label(status)+' '+total).join(' · ')
        : 'No real assets registered'}</p>;
    })}
  </section>;
}

