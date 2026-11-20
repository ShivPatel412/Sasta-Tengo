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
