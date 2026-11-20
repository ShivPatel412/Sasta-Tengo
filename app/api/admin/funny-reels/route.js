import { admin, sameOrigin } from '../../../../lib/auth.mjs';
import { assertWritable, body, handle, HttpError } from '../../../../lib/db.mjs';
import { controlSnapshot } from '../../../../lib/control-room.mjs';
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
      configured,
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
      updated_at: snapshot?.updated_at || new Date().toISOString()
    };

    return Response.json(responsePayload, {
      headers: { 'Cache-Control': 'no-store' }
    });
  });
}

export async function POST(request) {
  return handle(async () => {
    await admin();
    sameOrigin(request);
    assertWritable();

    const data = await body(request, 4096);
    let validated;
    try {
      validated = validateVideoSubmission(data);
    } catch (err) {
      throw new HttpError(422, err.message);
    }

    const { videoId, sourceUrl, isLive, maxClips, segmentSeconds, rightsConfirmed, streamerHandle } = validated;
    const jobId = `${videoId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newJob = {
      job_id: jobId,
      video_id: videoId,
      source_url: sourceUrl,
      mode: isLive ? 'livestream' : 'vod',
      state: rightsConfirmed ? 'QUEUED' : 'AWAITING_PERMISSION',
      stage: 'INTAKE',
      progress_percent: 0,
      rights_confirmed: rightsConfirmed,
      delay_minutes: isLive ? 15 : 0,
      max_clips: maxClips,
      segment_seconds: segmentSeconds,
      streamer_handle: streamerHandle,
      drive_folder_id: '1lPgEW-_OXeFgstKjr24GlHlBNDpIBi3U',
      requested_at: new Date().toISOString(),
      manual_publish_only: true
    };

    // Forward to n8n webhook dispatcher safely without blocking
    try {
      const webhookUrl = isLive
        ? 'https://n8n.shivpatel.in/webhook/shiv-os-funny-live-intake-v1'
        : 'https://n8n.shivpatel.in/webhook/shiv-os-media-jobs-v1';
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
        signal: AbortSignal.timeout(3000)
      }).catch(() => {});
    } catch {}

    return Response.json({
      ok: true,
      job: newJob,
      message: !rightsConfirmed
        ? 'Job recorded. Awaiting creator rights confirmation before processing.'
        : isLive
        ? 'Livestream tracked. Processing will run with 15-minute buffer.'
        : 'Video queued for AI clip extraction.'
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function PATCH(request) {
  return handle(async () => {
    await admin();
    sameOrigin(request);
    assertWritable();

    const data = await body(request, 2048);
    const { job_id, action } = data;
    if (!job_id || !['approve', 'retry', 'archive'].includes(action)) {
      throw new HttpError(422, 'Invalid job update action.');
    }

    return Response.json({
      ok: true,
      job_id,
      action,
      state: action === 'approve' ? 'QUEUED' : action === 'retry' ? 'QUEUED' : 'ARCHIVED',
      updated_at: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
