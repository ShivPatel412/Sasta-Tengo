/**
 * SHIV OS — Funny Reels AI Engine Utilities
 * Channeling Ponytail: clean standard-library helpers, no external bloat, strictly real data.
 */

export const FUNNY_WORKFLOWS = [
  { id: '0DlqKnBRQPvkwknF', code: 'FUNNY-02', name: 'AI video processing', role: 'Gemini scene analysis & 60fps rendering', trigger: 'Webhook / Manual' },
  { id: 'OAlcoDTP5kNRFgrp', code: 'MEDIA-API', name: 'Dashboard jobs API', role: 'Dashboard intake & job persistence', trigger: 'Webhook' },
  { id: 'E9mNbyn7ZetDGfH6', code: 'REELS-04', name: '60fps rendering & distribution', role: 'Free cover generation & platform package', trigger: 'Sub-workflow' },
  { id: '86Kj8o1974krkKlR', code: 'REELS-02', name: 'Instagram upload', role: 'Meta Resumable Reel container upload', trigger: 'Sub-workflow' },
  { id: 'uFAzLSFG7vb8GLXl', code: 'REELS-03', name: 'Instagram publisher', role: 'Active polling & verified publishing', trigger: 'Schedule (every 30s)' },
  { id: 'tJ14ZUpQV8diY5gP', code: 'YT-01', name: 'YouTube uploader', role: 'Private YouTube Shorts upload', trigger: 'Sub-workflow' },
  { id: 'L3yhy79MTMjELUqZ', code: 'YT-02', name: 'YouTube publisher & recovery', role: 'Public release & upload verification', trigger: 'Schedule (every 30s)' }
];

export const CONNECTED_ACCOUNTS = {
  instagram: {
    account_id: '17841467420993171',
    verified_username: 'sastatengo.clips',
    caption_branding: '@sastatengo',
    auto_publish: null,
    status: 'NOT_VERIFIED'
  },
  youtube: {
    channel: 'Sasta Tengo',
    channel_id: 'UCjixoELED6wc8keo98Txa8w',
    handle: '@its.tango69',
    auto_publish: null,
    status: 'NOT_VERIFIED'
  }
};

export function validateVideoSubmission(data) {
  const url = String(data?.youtube_url || '').trim();
  const match = url.match(/^https:\/\/(?:www\.|m\.)?youtube\.com\/(?:watch\?(?:[^#]*?&)?v=([a-zA-Z0-9_-]{11})(?:[&#]|$)|(?:live|shorts)\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$))/i) ||
                url.match(/^https:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/i);
  if (!match) {
    throw new Error('Enter a valid YouTube watch or live stream URL.');
  }
  const videoId = match[1] || match[2];
  const isLive = Boolean(data.is_livestream || url.includes('/live/'));
  const maxClips = Math.min(10, Math.max(1, Number.parseInt(data.max_clips || 3, 10) || 3));
  const segmentSeconds = Math.min(900, Math.max(300, Number.parseInt(data.segment_seconds || (isLive ? 900 : 600), 10) || 600));
  const rightsConfirmed = Boolean(data.rights_confirmed);
  const streamerHandle = String(data.streamer_handle || '').trim().replace(/^@/, '');

  return {
    videoId,
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    isLive,
    maxClips,
    segmentSeconds,
    rightsConfirmed,
    streamerHandle: streamerHandle ? `@${streamerHandle}` : ''
  };
}

export function calculateOverviewStats(auto = {}) {
  const jobs = auto.jobs || [];
  const streams = auto.streams || [];
  const clips = auto.clips || [];
  const igReels = auto.instagram_reels || [];
  const ytUploads = auto.youtube_uploads || [];

  const totalSubmitted = jobs.length + streams.length;
  const awaitingProcessing = jobs.filter(j => ['QUEUED', 'AWAITING_PERMISSION', 'INTAKE'].includes(j.state)).length;
  const currentlyProcessing = jobs.filter(j => ['PROCESSING', 'ANALYZING', 'RENDERING', 'UPLOADING'].includes(j.state)).length;
  const analyzedByGemini = jobs.filter(j => Boolean(j.clips_selected && j.clips_selected > 0) || ['DONE', 'PUBLISHED', 'ANALYZED'].includes(j.state)).length;

  const clipsSelected = jobs.reduce((sum, j) => sum + (Number(j.clips_selected) || 0), 0) || clips.length;
  const clipsRendered = clips.length;

  const igPublished = igReels.filter(r => r.state === 'PUBLISHED' && r.instagram_media_id && r.permalink).length;
  const ytPublished = ytUploads.filter(y => y.privacy_status === 'public' && y.youtube_video_id).length;
  const pendingUploads = ytUploads.filter(y => y.privacy_status === 'private' || y.status === 'PRIVATE_UPLOADED').length +
                         igReels.filter(r => r.state !== 'PUBLISHED' && !r.error_message).length;
  const failedUploads = jobs.filter(j => j.state === 'ERROR' || Boolean(j.error_message)).length +
                        igReels.filter(r => Boolean(r.error_message)).length +
                        ytUploads.filter(y => Boolean(y.error_message)).length;

  // Real publication success rate
  const completedJobs = jobs.filter(j => ['DONE', 'PUBLISHED'].includes(j.state)).length;
  const failedJobs = jobs.filter(j => j.state === 'ERROR' || Boolean(j.error_message)).length;
  const totalDecided = completedJobs + failedJobs;
  const successRate = totalDecided > 0 ? `${((completedJobs / totalDecided) * 100).toFixed(0)}%` : 'Not available';

  // Average processing time calculation
  const times = jobs
    .filter(j => j.started_at && j.finished_at)
    .map(j => (new Date(j.finished_at).getTime() - new Date(j.started_at).getTime()) / 1000)
    .filter(sec => sec > 0 && sec < 86400);

  const avgProcessingTime = times.length > 0
    ? `${(times.reduce((a, b) => a + b, 0) / times.length / 60).toFixed(1)} mins`
    : 'Not available';

  return {
    total_submitted: totalSubmitted,
    awaiting_processing: awaitingProcessing,
    currently_processing: currentlyProcessing,
    analyzed_by_gemini: analyzedByGemini,
    clips_selected: clipsSelected,
    clips_rendered: clipsRendered,
    instagram_published: igPublished,
    youtube_published: ytPublished,
    pending_uploads: pendingUploads,
    failed_uploads: failedUploads,
    success_rate: successRate,
    avg_processing_time: avgProcessingTime
  };
}

export function formatWorkflowsList(n8nWorkflows = [], n8nExecutions = []) {
  const execByWorkflow = new Map();
  for (const exec of n8nExecutions) {
    const id = exec.workflow_id || exec.workflowId;
    if (id && !execByWorkflow.has(id)) {
      execByWorkflow.set(id, exec);
    }
  }

  const liveWfMap = new Map((n8nWorkflows || []).map(w => [String(w.id), w]));

  return FUNNY_WORKFLOWS.map(def => {
    const live = liveWfMap.get(def.id) || {};
    const recentExec = execByWorkflow.get(def.id);
    const isActive = live.active === true;
    const status = !live.id ? 'UNKNOWN' : isActive ? 'ACTIVE' : def.trigger === 'Sub-workflow' ? 'ON_DEMAND' : 'INACTIVE';
    const updatedAt = live.updated_at || live.updatedAt || null;

    let durationSec = null;
    if (recentExec?.started_at && recentExec?.stopped_at) {
      durationSec = ((new Date(recentExec.stopped_at) - new Date(recentExec.started_at)) / 1000).toFixed(2);
    } else if (recentExec?.startedAt && recentExec?.stoppedAt) {
      durationSec = ((new Date(recentExec.stoppedAt) - new Date(recentExec.startedAt)) / 1000).toFixed(2);
    }

    return {
      id: def.id,
      code: def.code,
      name: live.name || `SHIV OS | ${def.code} - ${def.name}`,
      role: def.role,
      trigger: def.trigger,
      active: isActive,
      status,
      status_label: ({UNKNOWN: 'Not reported', ACTIVE: 'Enabled', ON_DEMAND: 'Called by another step', INACTIVE: 'Not enabled'})[status],
      healthy: recentExec ? recentExec.status === 'success' : null,
      last_execution: recentExec?.started_at || recentExec?.startedAt || null,
      last_status: recentExec?.status || 'idle',
      duration_seconds: durationSec,
      last_error: recentExec?.status === 'error' ? (recentExec.error_message || 'Execution error') : null,
      n8n_url: `https://n8n.shivpatel.in/workflow/${def.id}`,
      updated_at: updatedAt
    };
  });
}

export function formatPublishedReels(auto = {}) {
  const igReels = auto.instagram_reels || [];
  const ytUploads = auto.youtube_uploads || [];
  const clips = auto.clips || [];

  const probeMap = new Map();
  for (const c of clips) {
    if (c.video_id) probeMap.set(c.video_id, c);
  }

  const ytByKey = new Map();
  for (const y of ytUploads) {
    if (y.job_key) ytByKey.set(y.job_key, y);

  }

  const items = [];

  for (const ig of igReels.filter(row => row.state === 'PUBLISHED' && row.instagram_media_id && row.permalink)) {
    const key = ig.job_key || ig.video_id;
    const yt = ig.job_key ? ytByKey.get(ig.job_key) : null;
    const probe = probeMap.get(ig.video_id);

    items.push({
      id: ig.id,
      job_key: key,
      video_id: ig.video_id,
      title: yt?.title || ig.caption?.slice(0, 40) || `Highlight - ${ig.video_id}`,
      caption: ig.caption || '',
      streamer: ig.streamer_name || yt?.streamer_handle || probe?.streamer || null,
      streamer_ig_handle: ig.streamer_ig_handle || null,
      original_source_url: ig.original_source_url || `https://www.youtube.com/watch?v=${ig.video_id}`,

      // Instagram details
      instagram_status: ig.state === 'PUBLISHED' ? 'PUBLISHED' : (ig.state || 'PENDING'),
      instagram_permalink: ig.permalink || null,
      instagram_media_id: ig.instagram_media_id || null,
      instagram_published_at: ig.published_at || ig.createdAt,

      // YouTube details
      youtube_status: yt ? (yt.privacy_status === 'public' && yt.youtube_video_id ? 'PUBLISHED' : yt.privacy_status === 'private' ? 'PRIVATE_UPLOADED' : 'NOT_VERIFIED') : 'NOT_DISPATCHED',
      youtube_url: yt?.youtube_url || (yt?.youtube_video_id ? `https://www.youtube.com/shorts/${yt.youtube_video_id}` : null),
      youtube_privacy: yt?.privacy_status || 'private',

      // Technical specs
      resolution: probe?.width > 0 && probe?.height > 0 ? `${probe.width}x${probe.height}` : null,
      fps: Number(probe?.fps) > 0 ? `${Number(probe.fps)}fps` : null,
      video_path: ig.video_path || probe?.path || '',
      preview_url: /^https:\/\//.test(probe?.preview_url || '') ? probe.preview_url : null,
      has_cover: Boolean(ig.cover_url || probe?.cover_url),
      error: ig.error_message || yt?.error_message || null
    });
  }

  for (const yt of ytUploads) {
    if (yt.privacy_status !== 'public' || !yt.youtube_video_id) continue;
    if (yt.job_key && items.some(item => item.job_key === yt.job_key && item.youtube_status === 'PUBLISHED')) continue;
    items.push({
      id: `youtube-${yt.id || yt.youtube_video_id}`,
      job_key: yt.job_key || yt.youtube_video_id,
      title: yt.title || 'YouTube Short',
      instagram_status: 'NOT_VERIFIED',
      youtube_status: 'PUBLISHED',
      youtube_url: `https://www.youtube.com/shorts/${encodeURIComponent(yt.youtube_video_id)}`,
      youtube_privacy: 'public',
      original_source_url: yt.source_video_id ? `https://www.youtube.com/watch?v=${encodeURIComponent(yt.source_video_id)}` : null
    });
  }
  return items;
}

export function formatAIHighlights(auto = {}) {
  return (auto.clips || []).map((clip, index) => {
    const start = Number.isFinite(clip.start_seconds) ? clip.start_seconds : null;
    const end = Number.isFinite(clip.end_seconds) ? clip.end_seconds : null;
    return {
      id: clip.id || clip.job_key || `clip-${index}`,
      job_id: clip.job_id || null,
      clip_number: clip.clip_number || null,
      video_id: clip.video_id || null,
      title: clip.title || clip.filename || 'Untitled clip',
      streamer: clip.streamer || clip.streamer_ig_handle || null,
      start_seconds: start,
      end_seconds: end,
      duration_label: start !== null && end !== null && end >= start ? `${end-start}s` : 'Timing not reported',
      humor_score: Number.isFinite(clip.humor_score) ? clip.humor_score : null,
      selection_reason: clip.selection_reason || null,
      hook_text: clip.hook_text || null,
      instagram_caption: clip.caption || '',
      youtube_title: clip.youtube_title || null,
      creator_credit: clip.streamer || clip.streamer_ig_handle || null,
      preview_url: clip.job_id && clip.clip_number ? `/api/admin/reel-media?job_id=${encodeURIComponent(clip.job_id)}&clip=${Number(clip.clip_number)}&kind=video` : /^https:\/\//.test(clip.preview_url || '') ? clip.preview_url : null,
      cover_url: clip.job_id && clip.clip_number ? `/api/admin/reel-media?job_id=${encodeURIComponent(clip.job_id)}&clip=${Number(clip.clip_number)}&kind=cover` : null,
      subtitles_available: clip.subtitles_available === true,
      render_status: clip.render_status || 'NOT_VERIFIED',
      platforms: {
        instagram: Boolean(clip.instagram_permalink),
        youtube: Boolean(clip.youtube_url)
      }
    };
  });
}
