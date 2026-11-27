// Only display bounded receipt metadata from the existing authenticated collector.
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const upstreamKeys = ['analysis_total','analysis_complete','reviews_flagged','reviews_attempted','reviews_corrected',
  'reviews_unresolved','reviews_invalid','context_proposals','approved_candidates',
  'analysis_windows_complete','analysis_windows_review_required','analysis_windows_invalid'];
const platformStates = ['DRAFT','STAGING','PROCESSING','STAGED','RECONCILIATION_REQUIRED','EXHAUSTED'];

export function gamingV7(input, now = Date.now()) {
  if (input?.schema !== 'v7-production-progress-v1' || !Array.isArray(input.jobs)) return null;
  const timestamp = Date.parse(input.updated_utc);
  if (!Number.isFinite(timestamp) || timestamp > now + 30000) return null;
  const jobs = input.jobs.slice(0, 200).filter(row =>
    /^[a-f0-9]{64}$/.test(row?.id || '') && ['real', 'mock'].includes(row.mode)
  ).map(row => ({
    id: row.id, mode: row.mode,
    status: ['QUEUED','RUNNING','RETRY_PENDING','SUCCEEDED','EXHAUSTED','RECONCILIATION_REQUIRED','CANCELLED'].includes(row.status) ? row.status : 'UNKNOWN',
    active: typeof row.active === 'boolean' ? row.active : null,
    attempts: Number.isInteger(row.attempts) && row.attempts >= 0 && row.attempts <= 3 ? row.attempts : null,
    expected_frames: Number.isInteger(row.expected_frames) && row.expected_frames > 0 && row.expected_frames <= 3600 ? row.expected_frames : null,
    completed_frames: Number.isInteger(row.completed_frames) && row.completed_frames >= 0 && row.completed_frames <= row.expected_frames ? row.completed_frames : null,
    stage: ['start','encode','cut_verified','verified','reuse','production_qa_started','production_qa_verified'].includes(row.stage) ? row.stage : null,
    quality_status: ['PASS','FAIL','FAILED','RUNNING','NOT_REPORTED'].includes(row.quality_status) ? row.quality_status : 'NOT_REPORTED',
    error: row.error ? String(row.error).slice(0, 250) : null
  }));
  const upstream = Object.fromEntries(upstreamKeys.map(key => [key, count(input.upstream?.[key])]));
  upstream.emotional_analysis_status = ['ANALYSIS_PENDING','REVIEW_REQUIRED','REVIEWS_COMPLETE'].includes(input.upstream?.emotional_analysis_status) ? input.upstream.emotional_analysis_status : 'UNAVAILABLE';
  upstream.export_gate = ['WAITING_EXPORT','EXPORTED','INVALID_EXPORT'].includes(input.upstream?.export_gate) ? input.upstream.export_gate : 'UNAVAILABLE';
  upstream.context_snapshot_utc = Number.isFinite(Date.parse(input.upstream?.context_snapshot_utc)) ? input.upstream.context_snapshot_utc : null;
  const publishing = Object.fromEntries(['real','mock'].map(mode => [mode, Object.fromEntries(
    ['instagram','youtube'].map(platform => [platform, Object.fromEntries(platformStates.flatMap(status => {
      const value = count(input.publishing?.[mode]?.[platform]?.[status]);
      return value === null ? [] : [[status,value]];
    }))])
  )]));
  const importStatus = ['WAITING_EXPORT','READY_FOR_FRAMING','QUEUED','COMPLETE_EMPTY','BLOCKED'].includes(input.candidate_import?.status) ? input.candidate_import.status : null;
  return {schema:'v7-production-progress-v1', updated_utc: input.updated_utc, fresh: now - timestamp < 120000,
    public_release_enabled: false, jobs, upstream, publishing, candidate_import:{status:importStatus},
    counts: Object.fromEntries(['real', 'mock'].map(mode => [mode, {
      total: count(input.counts?.[mode]?.total) ?? jobs.filter(row => row.mode === mode).length,
      complete: count(input.counts?.[mode]?.complete) !== null &&
        input.counts[mode].complete <= (count(input.counts?.[mode]?.total) ?? jobs.filter(row => row.mode === mode).length)
        ? input.counts[mode].complete : jobs.filter(row => row.mode === mode && row.status === 'SUCCEEDED').length
    }]))};
}

