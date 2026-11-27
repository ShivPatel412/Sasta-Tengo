// Only display bounded execution metadata from the existing authenticated collector.
export function gamingV7(input, now = Date.now()) {
  if (input?.schema !== 'v7-production-progress-v1' || !Array.isArray(input.jobs)) return null;
  const timestamp = Date.parse(input.updated_utc);
  if (!Number.isFinite(timestamp) || timestamp > now + 30000) return null;
  const jobs = input.jobs.slice(0, 200).filter(row =>
    /^[a-f0-9]{64}$/.test(row?.id || '') && ['real', 'mock'].includes(row.mode)
  ).map(row => ({
    id: row.id, mode: row.mode,
    status: ['QUEUED', 'RUNNING', 'RETRY_PENDING', 'SUCCEEDED', 'EXHAUSTED', 'RECONCILIATION_REQUIRED'].includes(row.status) ? row.status : 'UNKNOWN',
    active: typeof row.active === 'boolean' ? row.active : null,
    attempts: Number.isInteger(row.attempts) && row.attempts >= 0 && row.attempts <= 3 ? row.attempts : null,
    expected_frames: Number.isInteger(row.expected_frames) && row.expected_frames > 0 && row.expected_frames <= 3600 ? row.expected_frames : null,
    completed_frames: Number.isInteger(row.completed_frames) && row.completed_frames >= 0 && row.completed_frames <= row.expected_frames ? row.completed_frames : null,
    error: row.error ? String(row.error).slice(0, 250) : null
  }));
  return {schema:'v7-production-progress-v1', updated_utc: input.updated_utc, fresh: now - timestamp < 120000,
    public_release_enabled: false, jobs,
    counts: Object.fromEntries(['real', 'mock'].map(mode => [mode, {
      total: jobs.filter(row => row.mode === mode).length,
      complete: jobs.filter(row => row.mode === mode && row.status === 'SUCCEEDED').length
    }]))};
}

