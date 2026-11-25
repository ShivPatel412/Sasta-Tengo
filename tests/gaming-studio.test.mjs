import test from 'node:test';
import assert from 'node:assert/strict';
import {gamingSnapshot,newerGamingSnapshot,platformReceipt,percent,isProcessing,isQueued,reelStatus,scheduledReels} from '../lib/gaming-studio.mjs';

const now = Date.parse('2026-11-25T07:26:20Z');
const stamp = '2026-11-25T07:26:17Z';
const instagram = {job_key:'abcdefghijk-5-15',parent_job_id:'job-1',state:'PUBLISHED',instagram_media_id:'11',permalink:'https://www.instagram.com/reel/example/'};
const youtube = {job_key:instagram.job_key,parent_job_id:'job-1',status:'PUBLISHED',privacy_status:'public',youtube_video_id:'abcdefghijk',youtube_url:'https://www.youtube.com/shorts/abcdefghijk'};
function snapshot(yt=youtube) {
  return {updated_at:stamp,source_updated_at:{n8n:stamp,automations:stamp},automations:{
    funny_reels:{jobs:[{job_id:'job-1',state:'PROCESSING',stage:'ANALYZING',progress_percent:20,stage_percent:81,error_message:'private error'}],
      clips:[{job_id:'job-1',video_id:'abcdefghijk',clip_number:1,start_seconds:5,end_seconds:15,video_path:'/private/file.mp4'}],
      instagram_reels:[instagram],events:[{id:1,stage:'ANALYZING',created_at:stamp,message:'private trace'},{id:1,stage:'ANALYZING',created_at:stamp}]},
    youtube:{uploads:[yt]}
  }};
}

test('separates verified stage progress from ambiguous legacy overall progress',()=>{
  const result=gamingSnapshot(snapshot(),now);
  assert.equal(result.jobs[0].overall,null);
  assert.equal(result.jobs[0].stageProgress,81);
  assert.equal(isProcessing(result.jobs[0]),true);
  assert.equal(isQueued(result.jobs[0]),false);
  assert.equal(result.fresh,true);
  assert.equal(gamingSnapshot(snapshot(),now+120000).fresh,false);
  assert.equal(percent(false),null);
});
test('only matching public platform receipts count for the same generated reel',()=>{
  const result=gamingSnapshot(snapshot(),now);
  assert.equal(result.clips[0].published,true);
  assert.equal(gamingSnapshot(snapshot({...youtube,privacy_status:'private'}),now).clips[0].published,false);
  assert.equal(gamingSnapshot(snapshot({...youtube,parent_job_id:'job-2'}),now).clips[0].published,false);
  assert.equal(platformReceipt({...instagram,permalink:'https://instagram.com.example.org/reel/a'},'instagram'),null);
});
test('strips worker paths and diagnostics, deduplicates events and ignores older snapshots',()=>{
  const result=gamingSnapshot(snapshot(),now);
  assert.equal(result.events.length,1);
  assert.doesNotMatch(JSON.stringify(result),/private error|private trace|\/private\/file/);
  assert.match(result.clips[0].preview,/^\/api\/admin\/reel-media\?/);
  assert.equal(newerGamingSnapshot(result,{version:'2026-11-24T00:00:00Z'}),result);
});

test('a scheduled platform release belongs to the matching reel and displays in its IST month',()=>{
  const scheduled = {...youtube,status:'SCHEDULED',privacy_status:'private',scheduled_at:'2026-11-30T20:00:00Z'};
  const input = snapshot(scheduled);
  input.automations.funny_reels.clips[0].title = 'Final round';
  const result = gamingSnapshot(input,now);
  assert.equal(reelStatus(result.clips[0]),'scheduled');
  assert.ok(result.clips[0].instagram);
  assert.deepEqual(scheduledReels(result.clips,'2026-11'),[]);
  assert.deepEqual(scheduledReels(result.clips,'2026-12'),[{
    id:'job-1-1',title:'Final round',platform:'youtube',at:'2026-11-30T20:00:00.000Z',day:'2026-12-01'
  }]);
  assert.equal(scheduledReels(gamingSnapshot(snapshot({...scheduled,parent_job_id:'different-job'}),now).clips,'2026-12').length,0);
});

test('published, canceled, missing and ambiguous times do not appear on the calendar',()=>{
  const scheduled = {...youtube,status:'SCHEDULED',scheduled_at:'2026-11-30T20:00:00Z'};
  for (const row of [{...scheduled,status:'PUBLISHED'},{...scheduled,status:'CANCELED'},{...scheduled,scheduled_at:null},
    {...scheduled,scheduled_at:'2026-12-01T01:30'}]) {
    const input = snapshot(row);
    input.automations.youtube.uploads.push(scheduled);
    assert.equal(scheduledReels(gamingSnapshot(input,now).clips,'2026-12').length,0);
  }
  assert.equal(reelStatus({render_status:'RENDERED'}),'ready');
  assert.equal(reelStatus({render_status:'RENDERING'}),'processing');
  assert.equal(reelStatus({instagram:{}}),'published');
  assert.equal(reelStatus({}),null);
});
