import { z } from 'zod';
import { query, HttpError } from './db.mjs';
import { validateVideoSubmission } from './funny-reels.mjs';
import { sourceFresh } from './master-dashboard.mjs';

export const reelSubmission = z.object({
  request_id: z.uuid(), youtube_url: z.string().max(500),
  max_clips: z.number().int().min(1).max(10), rights_confirmed: z.literal(true)
}).strict();
export function reelConnection(env = process.env) {
  const url = env.REELS_N8N_WEBHOOK_URL, key = env.REELS_N8N_WEBHOOK_AUTH;
  if (!url || !key || key.length < 32 || /[\r\n]/.test(key)) return null;
  if (url !== 'https://n8n.shivpatel.in/webhook/shiv-os-media-jobs-v1') return null;
  return { url, key };
}
export function reelWorkerReady(snapshot, env = process.env) {
  return Boolean(reelConnection(env) && sourceFresh(snapshot, 'n8n') && sourceFresh(snapshot, 'automations') &&
    snapshot?.automations?.funny_reels?.accounts?.instagram?.verified_username === 'sastatengo.clips' &&
    ['OAlcoDTP5kNRFgrp', '0DlqKnBRQPvkwknF'].every(id => snapshot?.n8n?.workflows?.some(row => row.id === id && row.active === true)));
}
export async function submitReelJob(owner, input, { env = process.env, run = query, send = fetch } = {}) {
  const parsed = reelSubmission.parse(input);
  let source;
  try { source = validateVideoSubmission(parsed); }
  catch (error) { throw new HttpError(422, error.message); }
  const target = reelConnection(env);
  if (!target) throw new HttpError(503, 'The video worker connection is unavailable. Nothing was submitted.');
  const id = parsed.request_id;
  const result = await run("INSERT IGNORE INTO next_workflow_runs (request_id,owner_id,workflow_id,state,created_at) VALUES (?,?,?,'dispatching',UTC_TIMESTAMP())", [id, owner, 'OAlcoDTP5kNRFgrp']);
  if (!result.affectedRows) {
    const [previous] = await run('SELECT workflow_id,state FROM next_workflow_runs WHERE request_id=? AND owner_id=?', [id, owner]);
    if (previous?.workflow_id !== 'OAlcoDTP5kNRFgrp') throw new HttpError(409, 'This request ID is already in use.');
    return { job_id: id, state: previous.state, duplicate: true };
  }
  let state = 'uncertain';
  try {
    const response = await send(target.url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', Authorization: target.key, 'Idempotency-Key': id },
      body: JSON.stringify({ job_id: id, youtube_url: source.sourceUrl, max_clips: parsed.max_clips, rights_confirmed: true, auto_publish: true }) });
    if (response.ok) {
      const receipt = await response.json();
      if (receipt.accepted === true && receipt.job_id === id) state = 'accepted';
    } else if ([400, 401, 403, 404, 405, 422].includes(response.status)) state = 'rejected';
    await response.body?.cancel().catch(() => {});
  } catch { /* A lost receipt may still mean processing started. Preserve the ID and never redispatch it. */ }
  await run('UPDATE next_workflow_runs SET state=? WHERE request_id=? AND owner_id=?', [state, id, owner]);
  return { job_id: id, state, duplicate: false };
}
