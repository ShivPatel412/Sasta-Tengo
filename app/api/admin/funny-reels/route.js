import { admin, sameOrigin } from '../../../../lib/auth.mjs';
import { assertWritable, body, handle, HttpError } from '../../../../lib/db.mjs';
import { sourceFresh } from '../../../../lib/master-dashboard.mjs';
import { controlSnapshot } from '../../../../lib/control-room.mjs';
import { reelWorkerReady, submitReelJob } from '../../../../lib/reel-dispatch.mjs';
import {
  calculateOverviewStats,
  formatWorkflowsList,
  formatPublishedReels,
  formatAIHighlights,
  validateVideoSubmission,
  CONNECTED_ACCOUNTS,
  FUNNY_WORKFLOWS
} from '../../../../lib/funny-reels.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return handle(async () => {
    await admin();
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'all';

    let snapshot = null;
    let configured = true;
    try {
      snapshot = await controlSnapshot();
    } catch {
      configured = false;
    }

    const auto = snapshot?.automations?.funny_reels || {};
    const ytAuto = snapshot?.automations?.youtube || {};
    const n8n = snapshot?.n8n || {};

    const combinedAuto = {
      jobs: auto.jobs || [],
      streams: auto.streams || [],
      clips: auto.clips || [],
      instagram_reels: auto.instagram_reels || [],
      youtube_uploads: ytAuto.uploads || []
    };

    const stats = calculateOverviewStats(combinedAuto);
    const workflows = formatWorkflowsList(n8n.workflows || [], n8n.executions || []);
    const published = formatPublishedReels(combinedAuto);
    const highlights = formatAIHighlights(combinedAuto);

    // Filter executions specifically for the Funny Reels workflows
    const wfIds = new Set(FUNNY_WORKFLOWS.map(w => w.id));
    const recentExecutions = (n8n.executions || [])
      .filter(e => wfIds.has(e.workflow_id || e.workflowId))
      .map(e => ({
        id: e.id,
        workflow_id: e.workflow_id || e.workflowId,
        workflow_name: e.name || workflows.find(w => w.id === (e.workflow_id || e.workflowId))?.name || 'Funny Reels Workflow',
        status: e.status,
        started_at: e.started_at || e.startedAt,
        stopped_at: e.stopped_at || e.stoppedAt,
        duration_ms: (e.started_at && e.stopped_at) ? new Date(e.stopped_at) - new Date(e.started_at) : null,
        n8n_url: `https://n8n.shivpatel.in/execution/${e.id}`
      }));

    const responsePayload = {
      ok: true,
      configured: configured && sourceFresh(snapshot, 'n8n') && sourceFresh(snapshot, 'automations'),
      actions_available: reelWorkerReady(snapshot),
      action_message: reelWorkerReady(snapshot) ? 'Ready: approved source videos will be processed and automatically published to both accounts.' : 'The worker connection needs checking. New submissions are paused until recent status and the clips account are available.',
      source_status: { workflows: sourceFresh(snapshot, 'n8n'), jobs: sourceFresh(snapshot, 'automations') },
      source_updated_at: snapshot?.source_updated_at || {},
      stats,
      jobs: combinedAuto.jobs,
      streams: combinedAuto.streams,
      clips: combinedAuto.clips,
      highlights,
      published,
      workflows,
      executions: recentExecutions,
      accounts: auto.accounts || CONNECTED_ACCOUNTS,
      drive_folder_id: '1lPgEW-_OXeFgstKjr24GlHlBNDpIBi3U',
      drive_url: 'https://drive.google.com/drive/folders/1lPgEW-_OXeFgstKjr24GlHlBNDpIBi3U',
      updated_at: snapshot?.updated_at || null
    };

    return Response.json(responsePayload, {
      headers: { 'Cache-Control': 'no-store' }
    });
  });
}

export async function POST(request) {
  return handle(async () => {
    const user = await admin(); sameOrigin(request); assertWritable();
    if (!reelWorkerReady(await controlSnapshot())) throw new HttpError(503, 'The video worker or verified clips account is unavailable. Nothing was submitted.');
    const receipt = await submitReelJob(user.id, await body(request, 4096));
    return Response.json({ ok: true, ...receipt }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function PATCH(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 2048);
    if (!data.job_id || !['approve', 'retry', 'archive'].includes(data.action)) throw new HttpError(422, 'Invalid job update action.');
    throw new HttpError(503, 'Job controls are not connected. No job was changed.');
  });
}
