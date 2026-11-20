import test from 'node:test';
import assert from 'node:assert/strict';
import { jobTracking, reelRemaining, safeReelLink } from '../lib/funny-reels-tracking.mjs';
import { formatWorkflowsList, formatPublishedReels } from '../lib/funny-reels.mjs';

test('waiting and handoff do not claim processing or publication', () => {
  assert.equal(jobTracking({ state: 'QUEUED', progress_percent: 0 }).progress, 0);
  assert.equal(jobTracking({ state: 'QUEUED' }).label, 'Waiting to start');
  assert.equal(jobTracking({ state: 'QUEUED' }).progress, null);
  assert.equal(jobTracking({ state: 'DONE', progress_percent: 100 }).label, 'Handoff complete');
  assert.equal(jobTracking({ state: 'PUBLISHED' }).label, 'Published on both platforms');
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

const etaNow = Date.parse('2026-11-20T12:00:00Z');
const milestone = (stage, message, ago) => ({ stage, message, created_at: new Date(etaNow - ago * 1000).toISOString() });
const running = { state: 'PROCESSING', stage: 'RENDERING', last_heartbeat_at: new Date(etaNow).toISOString(), clips_selected: 10,
  events: [milestone('RENDERING', 'Rendering · clip 1/10', 180), milestone('RENDERING', 'Rendering · clip 2/10', 60)] };

test('ETA waits for video size, pauses for stale data and never calls handoff finished', () => {
  assert.match(reelRemaining({ state: 'PROCESSING', last_heartbeat_at: new Date(etaNow).toISOString() }, etaNow).label, /Calculating/);
  for (const state of ['ERROR', 'AWAITING_PERMISSION', 'QUEUED', 'UNCERTAIN']) assert.equal(reelRemaining({ state }, etaNow).label, 'Estimate paused');
  assert.equal(reelRemaining(running, etaNow, false).label, 'Estimate paused');
  assert.equal(reelRemaining(running, etaNow + 16 * 60000).label, 'Estimate paused');
  assert.equal(reelRemaining({ state: 'PUBLISHED' }, etaNow, false).label, 'Finished');
  assert.match(reelRemaining({ state: 'DISPATCHED', clips_selected: 10, finished_at: new Date(etaNow).toISOString() }, etaNow).detail, /Clips are ready/);
});

test('ETA uses clip pace, counts down and provides a finish window for ten clips', () => {
  const first = reelRemaining(running, etaNow);
  const later = reelRemaining(running, etaNow + 30000);
  assert(first.finishStart > etaNow && first.finishEnd > first.finishStart);
  assert(later.finishEnd - (etaNow + 30000) < first.finishEnd - etaNow);
  assert(reelRemaining({ ...running, clips_selected: 3 }, etaNow).finishEnd < first.finishEnd);
  assert.match(first.detail, /Initial estimate/);
  assert.match(reelRemaining({ ...running, clips_selected: 2 }, etaNow + 240000).label, /Taking longer/);
});

test('analysis starts a provisional estimate and publishing overruns do not count down to finished', () => {
  assert(reelRemaining({ ...running, stage: 'ANALYZING', segments_total: 4, events: [milestone('ANALYZING', 'Analyzing · segment 1/4', 30)] }, etaNow).finishEnd > etaNow);
  const handedOff = { state: 'DISPATCHED', clips_selected: 2, finished_at: new Date(etaNow - 900000).toISOString() };
  assert.match(reelRemaining(handedOff, etaNow).label, /Taking longer/);
});

test('publication receipt pace refines the provisional platform budget', () => {
  const receipts = [60, 30].map(ago => ({ state: 'PUBLISHED', published_at: new Date(etaNow - ago * 1000).toISOString() }));
  const job = { state: 'DISPATCHED', clips_selected: 3, instagram_published: 2, youtube_published: 2,
    instagram_clips: receipts, youtube_clips: receipts, finished_at: new Date(etaNow).toISOString() };
  assert.match(reelRemaining(job, etaNow).detail, /publication pace/);
});
