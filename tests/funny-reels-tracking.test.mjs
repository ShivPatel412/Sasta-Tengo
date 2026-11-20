import test from 'node:test';
import assert from 'node:assert/strict';
import { jobTracking, safeReelLink } from '../lib/funny-reels-tracking.mjs';
import { formatWorkflowsList, formatPublishedReels } from '../lib/funny-reels.mjs';

test('waiting and handoff do not claim processing or publication', () => {
  assert.equal(jobTracking({ state: 'QUEUED', progress_percent: 0 }).progress, 0);
  assert.equal(jobTracking({ state: 'QUEUED' }).label, 'Waiting to start');
  assert.equal(jobTracking({ state: 'QUEUED' }).progress, null);
  assert.equal(jobTracking({ state: 'DONE', progress_percent: 100 }).label, 'Handoff complete');
  assert.equal(jobTracking({ state: 'PUBLISHED' }).label, 'Reported published');
  assert.equal(jobTracking({}).label, 'Status not reported');
});
test('old running jobs need checking, fresh jobs show reported stage, errors take precedence', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  assert.equal(jobTracking({ state: 'RENDERING', last_heartbeat_at: '2026-11-20T11:40:00Z' }, now).label, 'Update overdue');
  assert.equal(jobTracking({ state: 'PROCESSING', stage: 'ANALYZING', last_heartbeat_at: '2026-11-20T11:59:00Z' }, now).label, 'Find moments');
  assert.equal(jobTracking({ state: 'RENDERING', error_message: 'Download failed' }, now).detail, 'Download failed');
  assert.equal(jobTracking({ state: 'AWAITING_PERMISSION' }).label, 'Permission needed');
});
test('unknown workflows and on-demand workflows are different from disabled triggers', () => {
  const rows = formatWorkflowsList([{ id: '86Kj8o1974krkKlR', active: false }]);
  assert.equal(rows.find(row => row.code === 'REELS-02').status, 'ON_DEMAND');
  assert.equal(rows.find(row => row.code === 'FUNNY-02').status, 'UNKNOWN');
  assert.equal(rows.find(row => row.code === 'FUNNY-02').healthy, null);
});
test('YouTube-only public receipts appear without matching a different clip from the same source', () => {
  const rows = formatPublishedReels({
    instagram_reels: [{ job_key: 'clip-a', video_id: 'source', state: 'PUBLISHED', instagram_media_id: 'ig-id', permalink: 'https://www.instagram.com/reel/example/' }],
    youtube_uploads: [
      { job_key: 'clip-b', source_video_id: 'source', privacy_status: 'public', youtube_video_id: 'public-id' },
      { job_key: 'clip-c', source_video_id: 'source', privacy_status: 'private', youtube_video_id: 'private-id' }
    ]
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].youtube_status, 'NOT_DISPATCHED');
  assert.equal(rows[1].youtube_status, 'PUBLISHED');
  assert.equal(rows[1].instagram_status, 'NOT_VERIFIED');
  assert.equal(formatPublishedReels({ instagram_reels: [{ state: 'PUBLISHED' }] }).length, 0);
});
test('unsafe preview and action links are rejected', () => {
  assert.equal(safeReelLink('javascript:alert(1)'), null);
  assert.equal(safeReelLink('https://user:secret@example.com/'), null);
  assert.equal(safeReelLink('https://www.youtube.com/shorts/example'), 'https://www.youtube.com/shorts/example');
});
