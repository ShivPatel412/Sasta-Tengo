'use client';
import { useState } from 'react';
import { adminApi as api, jsonRequest } from '../../../lib/dashboard-client.mjs';
import { reelRemaining, reelStepStates, safeReelLink } from '../../../lib/funny-reels-tracking.mjs';

export function ReelSubmission({ ready, readOnly, onSubmitted }) {
  const [url, setUrl] = useState(''), [count, setCount] = useState(3), [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [requestId, setRequestId] = useState(''), [uncertain, setUncertain] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (!ready || readOnly || busy || uncertain) return;
    setBusy(true); setError('');
    const id = requestId || crypto.randomUUID(); setRequestId(id);
    try {
      const receipt = await api('funny-reels', jsonRequest('POST', { request_id: id, youtube_url: url, max_clips: Number(count), rights_confirmed: rights }));
      if (receipt.state === 'rejected') { setError('The worker rejected this request. Check Automation before submitting again.'); setRequestId(''); return; }
      setUncertain(receipt.state !== 'accepted');
      onSubmitted({ job_id: id, source_url: url, max_clips: Number(count), state: receipt.state === 'accepted' ? 'QUEUED' : 'UNCERTAIN', stage: 'INTAKE', progress_percent: 0, requested_at: new Date().toISOString(), rights_confirmed: rights });
      if (receipt.state === 'accepted') { setUrl(''); setRequestId(''); setRights(false); }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <section className="neon-panel reel-submit"><h3>Create a new Reel job</h3><p>Paste a completed YouTube video or ended stream. Choose up to 10 clips; fewer may be produced if there are fewer strong moments.</p><form onSubmit={submit}>
    <label>YouTube video link<input type="url" required className="neon-input" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" disabled={busy || uncertain} /></label>
    <label>Maximum clips<select className="neon-input" value={count} onChange={event => setCount(Number(event.target.value))} disabled={busy || uncertain}>{Array.from({ length: 10 }, (_, index) => <option key={index+1} value={index+1}>{index+1} {index ? 'clips' : 'clip'}</option>)}</select></label>
    <label className="reel-consent"><input type="checkbox" required checked={rights} onChange={event => setRights(event.target.checked)} disabled={busy || uncertain} /> I own this video or have permission to edit and publish it.</label>
    <p className="reel-destination">Auto-publish: <strong>@sastatengo.clips</strong> + <strong>Sasta Tengo on YouTube</strong>.<br />Includes a generated cover, caption, hashtags, and an <strong>@sastatengo</strong> Reel tag and caption mention.</p>
    {error && <p role="alert" className="reel-error">{error}</p>}
    {uncertain && <p role="status" className="reel-warning">Acceptance is being checked. Your request ID is saved for this session; do not submit this video again until its outcome is known.</p>}
    <button className="neon-button primary" type="submit" disabled={!ready || readOnly || busy || !rights || uncertain}>{busy ? 'Sending to worker…' : uncertain ? 'Checking acceptance…' : 'Generate and auto-publish'}</button>
    {!ready && <p className="reel-warning">Submissions are paused while the worker connection is checked.</p>}
  </form></section>;
}

export function ReelTimeline({ job, time, now, fresh }) {
  const platforms = [['Instagram', job?.instagram_clips || []], ['YouTube', job?.youtube_clips || []]];
  const estimate = reelRemaining(job, now, fresh);
  return <section className="neon-panel reel-timeline"><h3>Processing pipeline</h3>{!job ? <p>Your video will appear here after you submit it. Each step is reported by the worker.</p> : <>
    <p><strong>{job.video_id || 'Your submitted video'}</strong> · up to {job.max_clips || '—'} clips</p>
    <div className="reel-estimate"><strong>{estimate.label}</strong>{estimate.finishEnd && <p>Estimated finish: {time(estimate.finishStart)} – {time(estimate.finishEnd)}</p>}<small>{estimate.detail}</small></div>
    <ol className="reel-step-list">{reelStepStates(job).map(step => <li key={step.key} className={step.status === 'Done' ? 'done' : step.status === 'Current step' ? 'current' : ''}><strong>{step.label}</strong><span>{step.status}</span></li>)}</ol>
    <p>Instagram: <strong>{job.instagram_published || 0}</strong> public · YouTube: <strong>{job.youtube_published || 0}</strong> public · {job.clips_selected || 0} clips selected</p>
    {job.error_message && <p className="reel-error" role="status">{job.error_message}</p>}
    <details><summary>Step-by-step activity ({job.events?.length || 0})</summary>{job.events?.length ? <ol>{job.events.map((event, index) => <li key={event.id || index}>{event.message} <small>{time(event.created_at || event.createdAt)}</small></li>)}</ol> : <p>Waiting for the first worker milestone.</p>}</details>
    <div className="reel-platform-results">{platforms.map(([platform, rows]) => <div key={platform}><h4>{platform} clips</h4>{!rows.length ? <p>Waiting for upload.</p> : rows.map(row => <p key={row.job_key}><strong>{row.title || row.job_key}</strong><br />{row.state || row.status}{row.error_message && <> · {row.error_message}</>}<br />{safeReelLink(row.permalink || row.youtube_url) && <a href={safeReelLink(row.permalink || row.youtube_url)} target="_blank" rel="noopener noreferrer">Open {platform} post</a>}</p>)}</div>)}</div>
  </>}</section>;
}
