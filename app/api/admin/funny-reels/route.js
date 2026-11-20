import { admin, sameOrigin } from '../../../../lib/auth.mjs';
import { assertWritable, body, handle, HttpError } from '../../../../lib/db.mjs';
import { controlSnapshot } from '../../../../lib/control-room.mjs';
import {sourceFresh} from '../../../../lib/master-dashboard.mjs';
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
      configured: configured && sourceFresh(snapshot, 'n8n') && Boolean(snapshot?.automations?.funny_reels),
      actions_available: false,
      action_message: 'Read-only monitoring. Authenticated media intake and durable actions are not connected.',
      stats,
      jobs: combinedAuto.jobs,
      streams: combinedAuto.streams,
      clips: combinedAuto.clips,
      highlights,
      published,
      workflows,
      executions: recentExecutions,
      accounts: CONNECTED_ACCOUNTS,
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
    await admin(); sameOrigin(request); assertWritable();
    let submission;
    try { submission = validateVideoSubmission(await body(request, 4096)); }
    catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(422, error.message); }
    if (!submission.rightsConfirmed) throw new HttpError(422, 'Confirm permission to use the source before submitting it.');
    throw new HttpError(503, 'Authenticated media intake and durable job dispatch are not connected. No video was queued.');
  });
}

export async function PATCH(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 2048);
    if (!data.job_id || !['approve', 'retry', 'archive'].includes(data.action)) throw new HttpError(422, 'Invalid job update action.');
    throw new HttpError(503, 'Media job updates are not connected. No job was changed.');
  });
}
