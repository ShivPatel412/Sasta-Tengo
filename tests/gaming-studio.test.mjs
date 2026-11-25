import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisProgress,dashboardExecution,gamingSnapshot,newerGamingSnapshot,platformReceipt,percent,isProcessing,isQueued,publishingDays,reelStatus} from '../lib/gaming-studio.mjs';

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

test('keeps the last failed run and pairs the last cover step with a clip from that execution',()=>{
  const input=snapshot();
  const records=input.automations.funny_reels;
  Object.assign(records.jobs[0],{execution_id:'61413',state:'ERROR',stage:'PIPELINE_FAILED',finished_at:stamp,
    stage_percent:81,progress_percent:60,segments_processed:118,segments_total:118});
  records.jobs.unshift({job_id:'queued',state:'QUEUED'},{job_id:'older',state:'DONE',execution_id:'111',finished_at:'2026-11-24T00:00:00Z'});
  records.events=[
    {id:3,job_id:'job-1',execution_id:'61413',stage:'COVERS',event_type:'WORKER_STEP',created_at:stamp,message:'Covers'},
    {id:4,job_id:'job-1',execution_id:'111',stage:'RENDERING',event_type:'WORKER_STEP',created_at:stamp,message:'Rendering · clip 9/10'},
    {id:2,job_id:'job-1',execution_id:'61413',stage:'RENDERING',event_type:'WORKER_STEP',created_at:'2026-11-25T07:26:10Z',message:'Rendering · clip 3/10'},
    {id:1,job_id:'job-1',execution_id:'61413',stage:'DOWNLOADED',event_type:'WORKER_STEP',created_at:'2026-11-25T07:20:00Z'}
  ];
  const job=dashboardExecution(gamingSnapshot(input,now).jobs);
  assert.equal(job.execution_id,'61413');
  assert.equal(job.failed,true);
  assert.deepEqual(job.step,{stage:'COVERS',name:'Generating cover and captions',clip:{number:3,total:10},stageProgress:null});
  assert.deepEqual(job.steps[4],{at:'2026-11-25T07:26:10.000Z',startedAt:'2026-11-25T07:26:10.000Z',durationSeconds:7,clip:{number:3,total:10},progress:null});
  assert.equal(job.steps[0].progress,100);
  assert.equal(job.steps[6],null);
  assert.deepEqual(analysisProgress(job),{completed:118,total:118,percent:100});
  assert.equal(job.overall,null);
  const active={execution_id:'new',state:'PROCESSING'};
  assert.equal(dashboardExecution([job,active]),active);
  assert.equal(analysisProgress({segments_processed:119,segments_total:118}),null);
  assert.equal(analysisProgress({segments_processed:117,segments_total:118}).percent,99);
});

test('isolates segment evidence across attempts and recovers recorded historical runs',()=>{
  const input=snapshot();
  const records=input.automations.funny_reels;
  records.jobs[0]={job_id:'job-1',execution_id:'21',stage:'ANALYZING',state:'PROCESSING',segments_processed:2,segments_total:5};
  const event=(id,execution_id,message,stage='ANALYZING',event_type='WORKER_STEP')=>({id,job_id:'job-1',execution_id,message,stage,event_type,created_at:`2026-11-25T07:26:${String(id).padStart(2,'0')}Z`});
  records.events=[event(5,'21','Analyzing · segment 3/5'),event(1,'20','Analyzing · segment 5/5'),event(2,'20','Selecting','SELECTING'),event(3,'20','Covers','COVERS')];
  const result=gamingSnapshot(input,now);
  assert.deepEqual(result.jobs[0].segments,{total:5,completed:2,current:3,rows:['completed','completed','processing','pending','pending']});
  const old=result.jobs.find(job=>job.execution_id==='20');
  assert.equal(old.archived,true);
  assert.equal(old.state,'UNKNOWN');
  assert.deepEqual(old.segments,{total:5,completed:5,current:null,rows:Array(5).fill('completed')});
  records.events=[event(7,'21','Analyzing · segment 3/5','ANALYZING','SEGMENT_FAILED'),event(6,'21','Analyzing · segment 2/5','ANALYZING','SEGMENT_COMPLETED')];
  assert.deepEqual(gamingSnapshot(input,now).jobs[0].segments,{total:5,completed:1,current:null,rows:['unknown','completed','failed','unknown','unknown']});
  records.events.push(event(8,'21','Analyzing · segment 3/5','ANALYZING','SEGMENT_RETRIED'));
  assert.equal(gamingSnapshot(input,now).jobs[0].segments.current,3);
  assert.equal(gamingSnapshot(input,now).jobs[0].segments.rows[2],'retried');
  for (const [id,event_type,start,status] of [[9,'SEGMENT_STARTED',4,'starting'],[10,'SEGMENT_PROCESSING',4,'processing'],[11,'SEGMENT_COMPLETED',4,'completed']]) {
    records.events.push(event(id,'21',`Analyzing · segment ${start}/5`,'ANALYZING',event_type));
    const segment = gamingSnapshot(input,now).jobs[0].segments;
    assert.equal(segment.rows[3],status);
    assert.equal(segment.current,status==='completed'?null:4);
  }
});

test('weekly gaming queue distinguishes dated and undated reels and retains an active render',()=>{
  const input=snapshot();
  const records=input.automations.funny_reels;
  records.jobs[0]={job_id:'job-1',execution_id:'21',stage:'RENDERING',state:'PROCESSING'};
  records.events=[{id:1,job_id:'job-1',execution_id:'21',stage:'RENDERING',event_type:'WORKER_STEP',created_at:stamp,message:'Rendering · clip 2/8'}];
  records.weekly_queue=[{parent_job_id:'job-1',job_key:'weekly1',title:'Weekly pick',status:'QUEUED',instagram_state:'WAITING_WEEKLY_SLOT',has_cover:true},
    {parent_job_id:'job-1',job_key:'weekly2',title:'Assigned slot',status:'QUEUED',scheduled_for:'2026-11-30T20:00:00Z',last_error:'private trace'}];
  const {clips}=gamingSnapshot(input,now);
  const ready=clips.find(clip=>clip.title==='Weekly pick');
  assert.equal(reelStatus(ready),'ready');
  assert.equal(ready.delivery.platforms.instagram,'Waiting for a slot');
  assert.equal(ready.delivery.coverReady,true);
  assert.equal(ready.sourceExecution,'21');
  const scheduled=clips.find(clip=>clip.title==='Assigned slot');
  assert.equal(reelStatus(scheduled),'scheduled');
  assert.equal(scheduled.delivery.platforms.youtube,'Scheduled');
  assert.equal(publishingDays(clips,'2026-12').get('2026-12-01')[0].clip.title,'Assigned slot');
  assert.equal(clips.find(clip=>reelStatus(clip)==='processing')?.title,'Clip 2 of 8');
  assert.doesNotMatch(JSON.stringify(clips),/private trace/);
});

test('a scheduled platform release belongs to the matching reel and displays in its IST month',()=>{
  const scheduled = {...youtube,status:'SCHEDULED',privacy_status:'private',scheduled_at:'2026-11-30T20:00:00Z'};
  const input = snapshot(scheduled);
  input.automations.funny_reels.clips[0].title = 'Final round';
  const result = gamingSnapshot(input,now);
  assert.equal(reelStatus(result.clips[0]),'scheduled');
  assert.ok(result.clips[0].instagram);
  assert.equal(publishingDays(result.clips,'2026-11').size,0);
  const [entry] = publishingDays(result.clips,'2026-12').get('2026-12-01');
  assert.equal(entry.clip.title,'Final round');
  assert.deepEqual(entry.releases,[{platform:'youtube',at:'2026-11-30T20:00:00.000Z',status:'Scheduled'}]);
  assert.equal(publishingDays(gamingSnapshot(snapshot({...scheduled,parent_job_id:'different-job'}),now).clips,'2026-12').size,0);
});

test('published, canceled, missing and ambiguous times do not appear on the calendar',()=>{
  const scheduled = {...youtube,status:'SCHEDULED',scheduled_at:'2026-11-30T20:00:00Z'};
  for (const row of [{...scheduled,status:'PUBLISHED'},{...scheduled,status:'CANCELED'},{...scheduled,scheduled_at:null},
    {...scheduled,scheduled_at:'2026-12-01T01:30'}]) {
    const input = snapshot(row);
    input.automations.youtube.uploads.push(scheduled);
    assert.equal(publishingDays(gamingSnapshot(input,now).clips,'2026-12').size,0);
  }
  assert.equal(reelStatus({render_status:'RENDERED'}),'ready');
  assert.equal(reelStatus({render_status:'RENDERING'}),'processing');
  assert.equal(reelStatus({instagram:{}}),'published');
  assert.equal(reelStatus({}),null);
});

test('calendar groups both platform posts into one reel on the right IST date',()=>{
  const clip = {id:'first',title:'Double release',instagram:{...platformReceipt(instagram,'instagram'),at:'2026-11-30T20:15:00Z'},
    youtube:{...platformReceipt(youtube,'youtube'),at:'2026-12-01T04:00:00Z'},schedule:[{platform:'instagram',at:'2026-11-30T15:30:00Z'}]};
  const [entry] = publishingDays([clip],'2026-12').get('2026-12-01');
  assert.deepEqual(entry.releases.map(release=>[release.platform,release.status]),[['instagram','Published'],['youtube','Published']]);
  assert.equal(entry.clip.youtube.url,'https://www.youtube.com/shorts/abcdefghijk');
  assert.equal(publishingDays([clip],'2026-11').size,0);
  const split = {...clip,youtube:null,schedule:[{platform:'youtube',at:'2026-12-02T14:30:00Z'}]};
  const days = publishingDays([split],'2026-12');
  assert.equal(days.get('2026-12-01')[0].releases[0].status,'Published');
  assert.equal(days.get('2026-12-02')[0].releases[0].status,'Scheduled');
});
