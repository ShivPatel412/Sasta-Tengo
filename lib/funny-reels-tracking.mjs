export const REEL_STEPS = [
  ['INTAKE', 'Save request', 'Your video link and permission are recorded.'],
  ['DOWNLOADING', 'Download video', 'The worker fetches the source video.'],
  ['ANALYZING', 'Find moments', 'Gemini reviews segments and selects highlights.'],
  ['SELECTING', 'Select clips', 'Rank real moments and select up to your requested maximum.'],
  ['RENDERING', 'Create clips', 'Cut the selected moments into vertical videos.'],
  ['COVERS', 'Create covers', 'Generate a cover, hook text, caption and hashtags.'],
  ['INSTAGRAM_UPLOAD', 'Instagram upload', 'Upload to @sastatengo.clips with an @sastatengo tag.'],
  ['YOUTUBE_UPLOAD', 'YouTube upload', 'Upload privately, wait for processing, set the cover, then publish.'],
  ['PUBLISHED', 'Confirm publication', 'Each platform must return its own publication receipt.']
];

export function jobTracking(job = {}, now = Date.now()) {
  const state = String(job.state || job.status || '').toUpperCase();
  const stage = String(job.stage || '').toUpperCase();
  const error = job.error_message || job.last_error;
  const reportedProgress = job.progress_percent;
  const progress = reportedProgress !== null && reportedProgress !== undefined && reportedProgress !== '' && Number.isFinite(Number(reportedProgress))
    ? Math.min(100, Math.max(0, Number(reportedProgress))) : null;
  const updated = job.last_heartbeat_at || job.finished_at || job.updatedAt || job.updated_at || job.started_at || job.requested_at || job.createdAt;
  const stale = ['PROCESSING', 'DOWNLOADING', 'ANALYZING', 'RENDERING', 'UPLOADING'].includes(state) && (!Number.isFinite(Date.parse(updated)) || now - Date.parse(updated) > 15 * 60 * 1000);
  if (error || ['ERROR', 'FAILED'].includes(state)) return { label: 'Needs attention', tone: 'error', detail: error || 'The worker reported a failure.', next: 'Open the linked run to inspect the failed step before retrying.', progress, updated };
  if (state === 'AWAITING_PERMISSION') return { label: 'Permission needed', tone: 'paused', detail: 'Processing is waiting for permission to use the source.', next: 'Confirm source permission before starting a worker run.', progress, updated };
  if (state === 'UNCERTAIN') return { label: 'Checking acceptance', tone: 'paused', detail: 'The worker receipt was not confirmed. Your request ID has been preserved to prevent duplicate publishing.', next: 'Wait for tracking to refresh. Do not submit the same video again yet.', progress, updated };
  if (['QUEUED', 'INTAKE', 'WAITING'].includes(state)) return { label: 'Waiting to start', tone: 'paused', detail: 'The request is saved and the worker is being started.', next: 'Keep this page open for the download step. If nothing changes, inspect Automation.', progress, updated };
  if (['DONE', 'DISPATCHED', 'DISPATCHED_TO_INSTAGRAM_AND_YOUTUBE'].includes(state)) return { label: 'Handoff complete', tone: 'neutral', detail: 'The worker finished its handoff. This does not confirm public posts.', next: 'Check Published posts for separate Instagram and YouTube receipts.', progress, updated };
  if (state === 'PUBLISHED') return { label: 'Published on both platforms', tone: 'live', detail: 'Every selected clip has an Instagram receipt and a public YouTube receipt.', next: 'Open the platform links below to view your posts.', progress, updated };
  if (stale) return { label: 'Update overdue', tone: 'paused', detail: 'No worker update has been reported for at least 15 minutes, or its update time is missing.', next: 'Check the linked run. Do not resubmit until its outcome is known.', progress, updated };
  const step = REEL_STEPS.find(([key]) => key === stage || key === state);
  return { label: step?.[1] || (state === 'PROCESSING' ? 'Processing video' : 'Status not reported'), tone: 'neutral', detail: step?.[2] || 'Only the last reported worker state is available.', next: 'Updates appear here as the collector receives worker records.', progress, updated };
}

export function reelStepStates(job = {}) {
  const events = job.events || [];
  const reached = new Set(events.map(event => event.stage));
  reached.add(job.stage);
  const handedOff = ['DONE', 'DISPATCHED', 'PUBLISHED'].includes(job.state);
  const completed = new Set();
  if (job.job_id) completed.add('INTAKE');
  if (reached.has('DOWNLOADED') || reached.has('ANALYZING')) completed.add('DOWNLOADING');
  if (reached.has('SELECTING') || reached.has('RENDERING')) completed.add('ANALYZING');
  if (Number(job.clips_selected) > 0) completed.add('SELECTING');
  if (handedOff) for (const key of ['RENDERING', 'COVERS', 'INSTAGRAM_UPLOAD', 'YOUTUBE_UPLOAD']) completed.add(key);
  if (job.state === 'PUBLISHED') completed.add('PUBLISHED');
  return REEL_STEPS.map(([key, label, description]) => ({ key, label, description,
    status: completed.has(key) ? 'Done' : job.stage === key ? job.state === 'ERROR' ? 'Needs attention' : 'Current step' : reached.has(key) ? 'Started' : 'Not reached' }));
}

export function safeReelLink(value) {
  if (typeof value === 'string' && value.startsWith('/api/admin/reel-media?')) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function reelRemaining(job = {}, now = Date.now(), fresh = true) {
  const state = String(job.state || '').toUpperCase();
  if (state === 'PUBLISHED') return { label: 'Finished', detail: 'Every selected clip is public on both platforms.' };
  const tracking = jobTracking(job, now);
  if (!fresh || ['paused', 'error'].includes(tracking.tone)) return { label: 'Estimate paused', detail: fresh ? tracking.detail : 'Waiting for fresh worker records.' };
  const events = (job.events || []).map(event => ({ ...event, at: Date.parse(event.created_at || event.createdAt) }))
    .filter(event => Number.isFinite(event.at) && event.at <= now).sort((a, b) => a.at - b.at);
  const clips = Math.min(10, Math.max(1, Number(job.clips_selected || job.max_clips) || 3));
  const handedOff = ['DONE', 'DISPATCHED', 'DISPATCHED_TO_INSTAGRAM_AND_YOUTUBE'].includes(state);
  const rendering = events.filter(event => event.stage === 'RENDERING');
  const analyzing = events.filter(event => event.stage === 'ANALYZING');
  function pace(rows, unit) {
    const starts = new Map();
    for (const row of rows) {
      const match = String(row.message || '').match(new RegExp(unit + ' (\\d+)/(\\d+)'));
      if (match && !starts.has(Number(match[1]))) starts.set(Number(match[1]), row.at);
    }
    const points = [...starts].sort((a, b) => a[0] - b[0]);
    const first = points[0], last = points.at(-1);
    return { current: last?.[0] || 1, at: last?.[1] || rows.at(-1)?.at,
      seconds: points.length > 1 && last[1] > first[1] ? (last[1] - first[1]) / 1000 / (last[0] - first[0]) : null };
  }
  let worker = 0, measured = handedOff;
  if (!handedOff) {
    if (rendering.length) {
      const cycle = pace(rendering, 'clip');
      // shortcut: initial budgets are provisional; replace with history after enough real batches complete.
      worker = (clips - cycle.current + 1) * (cycle.seconds || 120) - (now - cycle.at) / 1000;
      measured = Boolean(cycle.seconds);
    } else if (Number(job.segments_total) > 0 && analyzing.length) {
      const segment = pace(analyzing, 'segment');
      const analysis = job.stage === 'SELECTING' ? 0 : (Number(job.segments_total) - segment.current + 1) * (segment.seconds || 90) - (now - segment.at) / 1000;
      worker = Math.max(0, analysis) + 60 + clips * 120;
    } else return { label: 'Calculating time remaining…', detail: 'The first estimate appears after the download, when the worker knows how much video to analyse.' };
  }
  if (worker < 0) return { label: 'Taking longer — recalculating…', detail: 'Waiting for the next completed clip. The job is not marked finished until both platforms confirm publication.' };
  const platformRemaining = [
    ['instagram_clips', 'instagram_published'], ['youtube_clips', 'youtube_published']
  ].map(([rows, count]) => {
    const remaining = Math.max(0, clips - (Number(job[count]) || 0));
    const receipts = (job[rows] || []).filter(row => (row.state || row.status) === 'PUBLISHED')
      .map(row => Date.parse(row.published_at)).filter(at => Number.isFinite(at) && at <= now).sort((a, b) => a - b);
    const gap = receipts.length > 1 ? (receipts.at(-1) - receipts[0]) / 1000 / (receipts.length - 1) : 0;
    const expected = Math.max(30, gap) * remaining;
    return { remaining, seconds: gap > 0 ? Math.max(0, expected - (now - receipts.at(-1)) / 1000) : null,
      deadline: gap > 0 ? receipts.at(-1) + expected * 1500 : null };
  });
  const pending = Math.max(...platformRemaining.map(platform => platform.remaining));
  const platformMeasured = platformRemaining.every(platform => !platform.remaining || platform.seconds !== null);
  const publication = Math.max(0, ...platformRemaining.map(platform => platform.seconds || platform.remaining * 30));
  const handoffAt = Date.parse(job.finished_at || job.finished_handoff_at) || events.at(-1)?.at;
  const waiting = handedOff && !platformMeasured && handoffAt ? Math.max(0, (now - handoffAt) / 1000) : 0;
  const platformLow = platformMeasured ? publication * .7 : pending ? 120 : 0;
  const platformHigh = platformMeasured ? publication * 1.5 : pending ? publication + 600 : 0;
  if (handedOff && (waiting > platformHigh || platformMeasured && platformRemaining.some(platform => platform.remaining && platform.deadline < now))) return { label: 'Taking longer — waiting for platforms', detail: 'Clips are ready. Instagram or YouTube has exceeded the estimated publishing window; their public receipts will confirm completion.' };
  const low = Math.max(60, worker * .7 + platformLow - waiting);
  const high = Math.max(low + 60, worker * 1.5 + platformHigh - waiting);
  const initial = !measured || !platformMeasured;
  return { label: `About ${Math.ceil(low / 60)}–${Math.ceil(high / 60)} min remaining`,
    finishStart: now + low * 1000, finishEnd: now + high * 1000,
    detail: `${initial ? 'Initial estimate; improves as clips and public posts finish.' : 'Updated from this job’s completed clips and publication pace.'} ${handedOff ? 'Clips are ready; waiting for public posts.' : 'Includes clip creation and publication.'} Instagram or YouTube processing can take longer.` };
}
