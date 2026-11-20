import { admin, sameOrigin } from '../../../../lib/auth.mjs';
import { assertWritable, body, handle, HttpError } from '../../../../lib/db.mjs';
import { controlSnapshot } from '../../../../lib/control-room.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await admin();
    let snapshot = null;
    try { snapshot = await controlSnapshot(); } catch {}
    const auto = snapshot?.automations?.funny_reels || {};
    return Response.json({
      ok: true,
      jobs: auto.jobs || [],
      streams: auto.streams || [],
      clips: auto.clips || [],
      drive_folder_id: '1lPgEW-_OXeFgstKjr24GlHlBNDpIBi3U',
      drive_url: 'https://drive.google.com/drive/folders/1lPgEW-_OXeFgstKjr24GlHlBNDpIBi3U'
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function POST(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 4096);
    const url = String(data.youtube_url || '').trim();
    const match = url.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:[^#]*?&)?v=([a-zA-Z0-9_-]{11})(?:[&#]|$)|(?:live|shorts)\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$))/i) ||
                  url.match(/^https:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/i);
    if (!match) throw new HttpError(422, 'Enter a valid YouTube watch or live stream URL.');
    const videoId = match[1] || match[2];
    const isLive = Boolean(data.is_livestream || url.includes('/live/'));
    const maxClips = Math.min(5, Math.max(1, Number.parseInt(data.max_clips || 3, 10) || 3));
    const segmentSeconds = Math.min(900, Math.max(300, Number.parseInt(data.segment_seconds || (isLive ? 900 : 600), 10) || 600));
    const rightsConfirmed = Boolean(data.rights_confirmed);
    const jobId = `${videoId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newJob = {
      job_id: jobId,
      video_id: videoId,
      source_url: `https://www.youtube.com/watch?v=${videoId}`,
      mode: isLive ? 'livestream' : 'vod',
      state: rightsConfirmed ? 'QUEUED' : 'AWAITING_PERMISSION',
      stage: 'INTAKE',
      progress_percent: 0,
      rights_confirmed: rightsConfirmed,
      delay_minutes: isLive ? 15 : 0,
      max_clips: maxClips,
      segment_seconds: segmentSeconds,
      drive_folder_id: '1lPgEW-_OXeFgstKjr24GlHlBNDpIBi3U',
      requested_at: new Date().toISOString(),
      manual_publish_only: true
    };

    // Forward to n8n webhook if available
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
      message: isLive ? 'Livestream tracked. Processing will run with 15-minute buffer.' : 'Video queued for AI clip extraction.'
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function PATCH(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 2048);
    const { job_id, action } = data;
    if (!job_id || !['approve', 'retry', 'archive'].includes(action)) {
      throw new HttpError(422, 'Invalid job update action.');
    }
    return Response.json({
      ok: true,
      job_id,
      action,
      state: action === 'approve' ? 'APPROVED' : action === 'retry' ? 'QUEUED' : 'ARCHIVED',
      updated_at: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
