'use client';
import { useEffect, useState } from 'react';
import { adminApi as api } from '../../../lib/dashboard-client.mjs';
import { jobTracking, REEL_STEPS, safeReelLink } from '../../../lib/funny-reels-tracking.mjs';
import { ReelSubmission, ReelTimeline } from './reel-job-panels';
import { RefreshCw, ExternalLink } from './dashboard-icons';
import './control-room-neon.css';
import './funny-reels-tracking.css';

const TABS = [['overview', 'Start here'], ['jobs', 'Track videos'], ['clips', 'Clips'], ['published', 'Published posts'], ['automation', 'Automation']];
const HELP = {
  'MEDIA-API': 'Saves one request, acknowledges its ID, and starts the linked video worker.',
  'FUNNY-02': 'Downloads an authorized video, uses Gemini to select moments, creates clips, and hands them to the next step.',
  'REELS-04': 'Creates a cover and prepares each selected clip for platform upload.',
  'REELS-02': 'Uploads a clip to Instagram. An upload is not yet a public Reel.',
  'REELS-03': 'Checks Instagram uploads and publishes eligible clips. A successful check may find nothing to publish.',
  'YT-01': 'Uploads a Short privately and records its release intent.',
  'YT-02': 'Checks YouTube processing and releases eligible Shorts. A successful check may find nothing to publish.'
};
function time(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(date) + ' IST' : 'Not reported';
}
function Link({ href, children }) {
  const safe = safeReelLink(href);
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{children} <ExternalLink size={14} aria-hidden="true" /></a> : null;
}
function Status({ tone = 'neutral', children }) { return <span className={`neon-badge ${tone}`}>{children}</span>; }

export default function FunnyReelsStudio({ refresh, readOnly }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [pendingJob, setPendingJob] = useState(null);
  useEffect(() => {
    let active = true, inFlight = false;
    async function load() {
      if (inFlight) return;
      inFlight = true;
      try { const result = await api('funny-reels'); if (active) { setData(result); setError(''); } }
      catch (err) { if (active) setError(err.message); }
      finally { inFlight = false; if (active) { setLoading(false); setNow(Date.now()); } }
    }
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh, request]);
  const fresh = source => !error && data?.source_status?.[source] === true && now - Date.parse(data?.source_updated_at?.[source === 'jobs' ? 'automations' : 'n8n'] || data?.updated_at) < 120000;
  const jobsFresh = fresh('jobs'), workflowsFresh = fresh('workflows');
  const jobs = [...(pendingJob && !data?.jobs?.some(job => job.job_id === pendingJob.job_id) ? [pendingJob] : []), ...(data?.jobs || []), ...(data?.streams || [])].sort((a, b) => (Date.parse(b.requested_at || b.createdAt) || 0) - (Date.parse(a.requested_at || a.createdAt) || 0));
  const visibleJobs = jobs.filter(job => [job.job_id, job.video_id, job.source_url].some(value => String(value || '').toLowerCase().includes(search.toLowerCase())));
  const currentJob = visibleJobs.find(job => (job.job_id || job.stream_id || job.video_id) === selected) || visibleJobs[0];
  const current = currentJob && jobTracking(currentJob, now);
  const workflows = data?.workflows || [], stats = data?.stats || {};
  function checkAgain() { setLoading(true); setRequest(value => value + 1); }
  function submitted(job) { setPendingJob(job); setSelected(job.job_id); setTab('overview'); checkAgain(); }
  return <div className="funny-tracker">
    <section className="neon-panel">
      <div className="neon-header"><div className="neon-title-group"><span className="mini-label">FUNNY REELS STUDIO</span><h2>Your video, from link to public post</h2><p>See what has happened, what is waiting, and what needs your attention.</p></div><button className="neon-button secondary" onClick={checkAgain} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> {loading ? 'Checking…' : 'Check for updates'}</button></div>
      <div className="reel-connection" role="status"><Status tone={jobsFresh && workflowsFresh ? 'live' : 'paused'}>{loading && !data ? 'Checking connection' : jobsFresh && workflowsFresh ? 'Recent status available' : 'Status needs checking'}</Status><span>Last collected: {time(data?.updated_at)} · Checks every 10 seconds while visible.</span></div>
      {error && <p role="alert" className="reel-error">Could not refresh: {error}. Previously loaded records may be out of date. <button onClick={checkAgain}>Try again</button></p>}
      <div className="reel-callout"><strong>{data?.actions_available ? 'Connected: generate clips and publish automatically' : 'Checking the video worker connection'}</strong><p>{data?.action_message || 'Loading the latest worker status…'}</p><p>Instagram: @{data?.accounts?.instagram?.verified_username || 'checking'} · YouTube: {data?.accounts?.youtube?.channel || 'checking'} · Always tag @sastatengo</p></div>
      <nav aria-label="Reel studio views" className="reel-tabs">{TABS.map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>)}</nav>
    </section>
    {tab === 'overview' && <>
      <div className="reel-workspace"><ReelSubmission ready={data?.actions_available === true && jobsFresh && workflowsFresh} readOnly={readOnly} onSubmitted={submitted} /><ReelTimeline job={currentJob} time={time} now={now} fresh={jobsFresh} /></div>
      <section className="neon-panel"><h3>How this works</h3><p>You provide a video you have permission to use. The worker finds moments and creates clips. Instagram and YouTube process and publish them separately.</p><ol className="reel-steps">{REEL_STEPS.map(([key, label, description]) => <li key={key}><strong>{label}</strong><p>{description}</p></li>)}</ol><p className="reel-muted">The pipeline beside the form shows your actual job. Expand its activity list to see recorded milestones.</p></section>
      <div className="reel-metrics">{[['Saved requests', jobs.length], ['Need attention', jobs.filter(job => ['error', 'paused'].includes(jobTracking(job, now).tone)).length], ['Instagram posts', stats.instagram_published ?? 0], ['Public YouTube Shorts', stats.youtube_published ?? 0]].map(([label, count]) => <div className="neon-panel" key={label}><span>{label}</span><strong>{data ? count : '—'}</strong><small>{jobsFresh ? 'In collected records' : 'Unverified / last collected records'}</small></div>)}</div>
      <section className="neon-panel"><h3>Your next step</h3><p>{jobs.length ? 'Open Track videos, choose a request, and read its last reported step and next action.' : 'Submit your first video using the form above. Its worker milestones and platform results will appear beside it.'}</p><div className="reel-actions"><button className="neon-button primary" onClick={() => setTab(jobs.length ? 'jobs' : 'overview')}>{jobs.length ? 'Track my videos' : 'Create a video job'}</button><button className="neon-button secondary" onClick={() => setTab('published')}>View published posts</button></div><p className="reel-muted">Counts cover recent records only. A successful run may be an empty publisher check; it does not prove a new post exists.</p></section>
    </>}
    {tab === 'jobs' && <section className="neon-panel"><h3>Track your videos</h3><p>Choose a video for its last reported step. Progress appears only when supplied by the worker.</p><label>Find a video <input className="neon-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Video link or request ID" /></label>{!jobsFresh && <p className="reel-warning">These records may be out of date. They do not confirm what is running now.</p>}
      {!visibleJobs.length ? <p>No requests match this view. An empty list does not confirm the worker is idle.</p> : <div className="reel-job-layout"><div className="reel-job-list">{visibleJobs.map((job, index) => { const key = job.job_id || job.stream_id || job.video_id; const tracking = jobTracking(job, now); return <button key={key || index} className={currentJob === job ? 'selected' : ''} aria-pressed={currentJob === job} onClick={() => setSelected(key)}><strong>{job.video_id || 'Video request'}</strong><Status tone={tracking.tone}>{tracking.label}</Status><small>Submitted {time(job.requested_at || job.createdAt)}</small></button>; })}</div>
      {current && <article className="reel-job-detail"><h4>{currentJob.video_id || 'Video request'}</h4><Status tone={current.tone}>{current.label}</Status><p>{current.detail}</p><strong>What to do next</strong><p>{current.next}</p>{current.progress !== null ? <label>Processing milestones: {current.progress}%<progress max="100" value={current.progress} /></label> : <p className="reel-muted">Progress percentage has not been reported.</p>}<dl><dt>Last job update</dt><dd>{time(current.updated)}</dd><dt>Segments reviewed</dt><dd>{currentJob.segments_processed ?? 'Not reported'} / {currentJob.segments_total || 'Not reported'}</dd><dt>Clips selected</dt><dd>{currentJob.clips_selected ?? 'Not reported'}</dd><dt>Request ID</dt><dd>{currentJob.job_id || 'Not reported'}</dd></dl><div className="reel-actions"><Link href={currentJob.source_url}>Open source video</Link>{/^\d+$/.test(String(currentJob.execution_id || '')) && <Link href={`https://n8n.shivpatel.in/execution/${currentJob.execution_id}`}>Open this worker run</Link>}</div><details><summary>Reported details</summary><p>State: {currentJob.state || 'Not reported'} · Step: {currentJob.stage || 'Not reported'} · Worker: {currentJob.worker_status || 'Not reported'}</p><p>A missing execution link means the worker has not attached its run ID to this request.</p></details></article>}</div>}
    </section>}
    {tab === 'jobs' && currentJob && <ReelTimeline job={currentJob} time={time} now={now} fresh={jobsFresh} />}
    {tab === 'clips' && <section className="neon-panel"><h3>Collected clips</h3><p>A reported file alone does not verify AI selection, captions, video quality, or publication.</p><div className="reel-card-grid">{(data?.highlights || []).map((clip, index) => <article className="reel-job-detail" key={clip.id || index}><h4>{clip.title}</h4><p>{clip.video_id || 'Source not reported'}</p>{safeReelLink(clip.preview_url) ? <video controls playsInline preload="none" poster={safeReelLink(clip.cover_url) || undefined} src={safeReelLink(clip.preview_url)} /> : <p className="reel-muted">Video preview is not connected for this file.</p>}<p>{clip.selection_reason || 'AI selection reason not reported.'}</p><details><summary>Caption and hashtags</summary><p>{clip.instagram_caption || 'Not reported yet'}</p></details></article>)}</div>{!data?.highlights?.length && <p>No clip files have been reported. Check the video worker under Automation.</p>}</section>}
    {tab === 'published' && <section className="neon-panel"><h3>Published posts</h3><p>Instagram and YouTube are tracked separately. Private YouTube uploads are not public posts.</p>{!jobsFresh && <p className="reel-warning">Records may be out of date. Open the platform link to check.</p>}<div className="reel-card-grid">{(data?.published || []).map((post, index) => <article className="reel-job-detail" key={post.id || index}><h4>{post.title}</h4><p>Instagram: {post.instagram_status === 'PUBLISHED' ? 'publication receipt recorded' : 'no matched publication receipt'}</p><Link href={post.instagram_permalink}>View Instagram Reel</Link><p>YouTube: {post.youtube_status === 'PUBLISHED' ? 'public release recorded' : post.youtube_status === 'PRIVATE_UPLOADED' ? 'uploaded privately' : 'no matched public release'}</p><Link href={post.youtube_url}>Open YouTube video</Link><p><Link href={post.original_source_url}>Original video</Link></p></article>)}</div>{!data?.published?.length && <p>No confirmed publication receipts appear in collected records.</p>}</section>}
    {tab === 'automation' && <>
      <section className="neon-panel"><h3>Your automatic publishing setup</h3><p>The dashboard saves your request and starts the video worker. The worker records download, analysis, selection, rendering, cover creation, and upload milestones under that same request.</p><p>Instagram publishes after Meta confirms processing. YouTube uploads privately, waits for completed processing, applies the cover, then becomes public. Publication checks run every two minutes.</p><p>A failed or uncertain platform operation needs inspection before retrying. Other clips may already be public.</p></section>
      <section className="neon-panel"><h3>What each automation does</h3><p>{workflowsFresh ? 'Latest collected workflow status.' : 'Workflow status is missing or out of date. Check n8n before relying on it.'} “Called by another step” is normal for a sub-workflow; it does not need a schedule.</p><div className="reel-card-grid">{workflows.map(workflow => <article key={workflow.id} className="reel-job-detail"><h4>{workflow.code} · {workflow.code === 'FUNNY-02' ? 'Video worker' : workflow.code === 'MEDIA-API' ? 'Save and list requests' : workflow.role}</h4><Status tone={workflow.status === 'ACTIVE' && workflowsFresh ? 'live' : 'neutral'}>{workflow.status_label || 'Status not reported'}{!workflowsFresh ? ' · last reported' : ''}</Status><p>{HELP[workflow.code]}</p><p className="reel-muted">Last run: {time(workflow.last_execution)}<br />Result: {workflow.last_status === 'idle' ? 'No recent run reported' : workflow.last_status}</p><Link href={workflow.n8n_url}>Inspect in n8n</Link></article>)}</div></section>
      <section className="neon-panel"><h3>Recent runs</h3><p>Runs are collected separately from video requests. A successful scheduled check may process zero videos.</p>{!data?.executions?.length ? <p>No recent runs reported.</p> : <div className="reel-run-list">{data.executions.slice(0, 20).map(run => <div key={run.id}><strong>{workflows.find(workflow => workflow.id === run.workflow_id)?.code || 'Automation'} · {run.status || 'Not reported'}</strong><span>{time(run.started_at)}</span><Link href={run.n8n_url}>Inspect run #{run.id}</Link></div>)}</div>}</section>
      <section className="neon-panel"><h3>Verified publishing destinations</h3><p>Instagram: @{data?.accounts?.instagram?.verified_username || 'Not reported'}. The upload workflow checks this exact account again before creating a Reel.</p><p>YouTube: {data?.accounts?.youtube?.channel || 'Not reported'} ({data?.accounts?.youtube?.handle || 'handle not reported'}).</p><p>Every Reel includes an @sastatengo caption mention and user tag. Every Short credits @sastatengo in its description. Sources receive verified creator credit.</p></section>
    </>}
  </div>;
}
