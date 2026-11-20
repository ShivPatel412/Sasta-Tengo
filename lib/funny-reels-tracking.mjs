export const REEL_STEPS = [
  ['INTAKE', 'Save request', 'Your video link and permission are recorded.'],
  ['DOWNLOADING', 'Download video', 'The worker fetches the source video.'],
  ['ANALYZING', 'Find moments', 'Gemini reviews segments and selects highlights.'],
  ['RENDERING', 'Create clips', 'The worker cuts vertical clips and prepares covers.'],
  ['UPLOADING', 'Upload privately', 'Clips are sent to Instagram and YouTube.'],
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
  if (['QUEUED', 'INTAKE', 'WAITING'].includes(state)) return { label: 'Waiting to start', tone: 'paused', detail: 'The request is saved. Processing has not been confirmed.', next: 'Check the video worker in Automation. Saving a request does not start it.', progress, updated };
  if (['DONE', 'DISPATCHED', 'DISPATCHED_TO_INSTAGRAM_AND_YOUTUBE'].includes(state)) return { label: 'Handoff complete', tone: 'neutral', detail: 'The worker finished its handoff. This does not confirm public posts.', next: 'Check Published posts for separate Instagram and YouTube receipts.', progress, updated };
  if (state === 'PUBLISHED') return { label: 'Reported published', tone: 'neutral', detail: 'The job reports completion; check each platform link.', next: 'Open Published posts to verify the publication receipts.', progress, updated };
  if (stale) return { label: 'Update overdue', tone: 'paused', detail: 'No worker update has been reported for at least 15 minutes, or its update time is missing.', next: 'Check the linked run. Do not resubmit until its outcome is known.', progress, updated };
  const step = REEL_STEPS.find(([key]) => key === stage || key === state);
  return { label: step?.[1] || (state === 'PROCESSING' ? 'Processing video' : 'Status not reported'), tone: 'neutral', detail: step?.[2] || 'Only the last reported worker state is available.', next: 'Updates appear here as the collector receives worker records.', progress, updated };
}

export function safeReelLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
