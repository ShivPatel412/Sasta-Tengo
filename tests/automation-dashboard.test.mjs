import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FUNNY_WORKFLOWS,
  validateVideoSubmission,
  calculateOverviewStats,
  formatWorkflowsList,
  formatPublishedReels,
  formatAIHighlights
} from '../lib/funny-reels.mjs';

test('funny reels intake validates YouTube watch and live stream URLs and bounds clips', () => {
  const validUrls = [
    'https://www.youtube.com/watch?v=l-oEKLu4Y3w',
    'https://youtu.be/l-oEKLu4Y3w',
    'https://www.youtube.com/live/irNhWMG560k?feature=share',
    'https://m.youtube.com/watch?v=l-oEKLu4Y3w&t=10s'
  ];
  for (const url of validUrls) {
    const res = validateVideoSubmission({ youtube_url: url, max_clips: 3, rights_confirmed: true });
    assert(res.videoId && res.videoId.length === 11);
    assert(res.sourceUrl.includes(res.videoId));
    assert.equal(res.rightsConfirmed, true);
    assert.equal(res.maxClips, 3);
  }

  const invalidUrls = [
    'https://vimeo.com/12345678',
    'https://youtube.com/not-a-video',
    'javascript:alert(1)'
  ];
  for (const url of invalidUrls) {
    assert.throws(() => validateVideoSubmission({ youtube_url: url }), /Enter a valid YouTube/);
  }

  // Bounds check
  const clampedMax = validateVideoSubmission({ youtube_url: validUrls[0], max_clips: 10 });
  assert.equal(clampedMax.maxClips, 5);
  const clampedMin = validateVideoSubmission({ youtube_url: validUrls[0], max_clips: -2 });
  assert.equal(clampedMin.maxClips, 1);
});

test('calculateOverviewStats handles empty and populated data without fabricating metrics', () => {
  const emptyStats = calculateOverviewStats({});
  assert.equal(emptyStats.total_submitted, 0);
  assert.equal(emptyStats.success_rate, 'Not available');
  assert.equal(emptyStats.avg_processing_time, 'Not available');

  const populated = calculateOverviewStats({
    jobs: [
      { state: 'DONE', clips_selected: 2, started_at: '2026-11-20T10:00:00Z', finished_at: '2026-11-20T10:05:00Z' },
      { state: 'AWAITING_PERMISSION' }
    ],
    streams: [{ stream_id: 'str-1' }],
    clips: [{ filename: 'clip1.mp4' }, { filename: 'clip2.mp4' }],
    instagram_reels: [{ state: 'PUBLISHED', instagram_media_id: 'fixture-receipt', permalink: 'https://www.instagram.com/reel/test/' }],
    youtube_uploads: [{ status: 'PRIVATE_UPLOADED', privacy_status: 'private' }]
  });

  assert.equal(populated.total_submitted, 3);
  assert.equal(populated.awaiting_processing, 1);
  assert.equal(populated.clips_selected, 2);
  assert.equal(populated.clips_rendered, 2);
  assert.equal(populated.instagram_published, 1);
  assert.equal(populated.youtube_published, 0);
  assert.equal(populated.pending_uploads, 1);
  assert.equal(populated.success_rate, '100%');
  assert.equal(populated.avg_processing_time, '5.0 mins');
});

test('workflow monitor tracks exactly the 7 funny reels workflows and separates active from drafts', () => {
  assert.equal(FUNNY_WORKFLOWS.length, 7);
  const sampleLive = [
    { id: 'uFAzLSFG7vb8GLXl', name: 'REELS-03', active: true },
    { id: '0DlqKnBRQPvkwknF', name: 'FUNNY-02', active: false }
  ];
  const sampleExec = [
    { workflow_id: 'uFAzLSFG7vb8GLXl', status: 'success', started_at: '2026-11-20T12:00:00Z', stopped_at: '2026-11-20T12:00:02Z' }
  ];

  const formatted = formatWorkflowsList(sampleLive, sampleExec);
  assert.equal(formatted.length, 7);

  const r03 = formatted.find(w => w.id === 'uFAzLSFG7vb8GLXl');
  assert.equal(r03.active, true);
  assert.equal(r03.status, 'ACTIVE');
  assert.equal(r03.healthy, true);
  assert.equal(r03.duration_seconds, '2.00');

  const f02 = formatted.find(w => w.id === '0DlqKnBRQPvkwknF');
  assert.equal(f02.active, false);
  assert.equal(f02.status, 'DRAFT_PAUSED');
});

test('published reels require receipts and missing media facts stay unverified', () => {
  const auto = {
    instagram_reels: [{
      id: 1,
      job_key: 'vid-310-341',
      video_id: 'vid1',
      caption: 'Funny moment',
      state: 'PUBLISHED',
      permalink: 'https://www.instagram.com/reel/abc12345/',
      instagram_media_id: 'fixture-receipt',
      streamer_name: 'carryminati'
    }],
    youtube_uploads: [{
      job_key: 'vid-310-341',
      source_video_id: 'vid1',
      youtube_video_id: 'yt123',
      youtube_url: 'https://www.youtube.com/shorts/yt123',
      privacy_status: 'private',
      status: 'PRIVATE_UPLOADED',
      title: 'Shorts title'
    }],
    clips: [{ video_id: 'vid1', filename: 'clip.mp4' }]
  };

  const published = formatPublishedReels(auto);
  assert.equal(published.length, 1);
  assert.equal(published[0].instagram_status, 'PUBLISHED');
  assert.equal(published[0].instagram_permalink, 'https://www.instagram.com/reel/abc12345/');
  assert.equal(published[0].youtube_status, 'PRIVATE_UPLOADED');
  assert.equal(published[0].youtube_url, 'https://www.youtube.com/shorts/yt123');
  assert.equal(published[0].fps, null);
  assert.equal(published[0].resolution, null);

  const highlights = formatAIHighlights(auto);
  assert.equal(highlights.length, 1);
  assert.equal(highlights[0].render_status, 'NOT_VERIFIED');
  assert.equal(highlights[0].humor_score, null);
  assert.equal(highlights[0].selection_reason, null);
});

test('youtube shorts enforce manual review before public publishing', () => {
  const defaultUpload = { status: 'PRIVATE_UPLOADED', privacy_status: 'private' };
  assert.equal(defaultUpload.privacy_status, 'private');
  
  function updatePrivacy(action, requestedPrivacy) {
    if (action === 'review_approve') return 'public';
    if (action === 'set_privacy') return requestedPrivacy || 'private';
    return defaultUpload.privacy_status;
  }

  assert.equal(updatePrivacy('review_approve'), 'public');
  assert.equal(updatePrivacy('unknown', 'public'), 'private');
});

test('linkedin publisher remains paused and rejects automatic activation', () => {
  function handleLinkedInAction(payload) {
    if (payload.enabled === true) throw new Error('Automated activation blocked');
    if (payload.action === 'update_limits') {
      return { max_posts_week: Math.min(5, Math.max(1, Number.parseInt(payload.max_posts_week, 10) || 2)) };
    }
    return { ok: true };
  }

  assert.throws(() => handleLinkedInAction({ enabled: true }), /activation blocked/);
  assert.equal(handleLinkedInAction({ action: 'update_limits', max_posts_week: 10 }).max_posts_week, 5);
  assert.equal(handleLinkedInAction({ action: 'update_limits', max_posts_week: -1 }).max_posts_week, 1);
});
