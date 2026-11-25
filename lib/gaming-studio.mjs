import {sourceFresh} from './master-dashboard.mjs';

export const stages = [
  ['Source download', ['DOWNLOADING', 'DOWNLOADED', 'SOURCE_INTAKE', 'SOURCE_RECOVERY']],
  ['Local AI analysis', ['LOCAL_ANALYSIS', 'FEATURE_EXTRACTION', 'CANDIDATE_DISCOVERY', 'VISUAL_SCREENING']],
  ['AI highlight verification', ['ANALYZING', 'VERIFYING', 'GEMINI_VERIFICATION']],
  ['Highlight selection', ['SELECTING', 'CREATIVE_DIRECTION']],
  ['Video editing', ['RENDERING', 'CHATCUT_EDITING']],
  ['Cover and captions', ['COVERS']],
  ['Quality inspection', ['QUALITY_INSPECTION', 'VALIDATING']],
  ['Publishing', ['INSTAGRAM_UPLOAD', 'YOUTUBE_UPLOAD', 'PUBLISHING', 'PUBLISHED', 'WAITING_WEEKLY_SCHEDULE']]
];

const pick = (row, keys) => Object.fromEntries(keys.filter(key =>
  ['string', 'number', 'boolean'].includes(typeof row[key])).map(key => [
  key, typeof row[key] === 'string' ? row[key].slice(0, 1200) : row[key]
]));
const rows = value => Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : [];
const state = row => String(row.state || row.status || '').toUpperCase();
export const isProcessing = row => ['PROCESSING','RUNNING','DOWNLOADING','ANALYZING','RENDERING','UPLOADING','PUBLISHING'].includes(state(row)) ||
  String(row.worker_status).toUpperCase() === 'RUNNING' && !['FAILED','ERROR','PUBLISHED','CANCELED','CANCELLED','DONE'].includes(state(row));
export const isQueued = row => !isProcessing(row) && ['QUEUED','WAITING'].includes(state(row));

const terminalStates = ['DONE','COMPLETED','SUCCESS','PUBLISHED','FAILED','ERROR','CANCELED','CANCELLED'];
const runTime = job => Date.parse(job.finished_at || job.last_heartbeat_at || job.recordedAt || job.started_at || job.createdAt) || 0;
export const runHistory = jobs => jobs.filter(job=>/^\d+$/.test(job.execution_id || '')).sort((a,b)=>runTime(b)-runTime(a));
export function dashboardExecution(jobs) {
  const history = runHistory(jobs);
  return jobs.find(isProcessing) || history.find(job=>terminalStates.includes(state(job)) || state(job)==='READY_FOR_WEEKLY_POSTING') || history.find(job=>job.archived);
}

const stepNames = {DOWNLOADING:'Downloading source',ANALYZING:'Analysing segments',RENDERING:'Rendering video',COVERS:'Generating cover and captions',INSTAGRAM_UPLOAD:'Uploading to Instagram',YOUTUBE_UPLOAD:'Uploading to YouTube',WAITING_WEEKLY_SCHEDULE:'Waiting for weekly release'};
const endStages = ['PIPELINE_FAILED','FAILED','ERROR','DONE','COMPLETED','PUBLISHED','CANCELED','CANCELLED'];
function clipPosition(updates, stage) {
  const index = updates.findIndex(event=>event.stage===stage);
  const event = updates[index];
  const prior = index >= 0 ? updates[index+1] : null;
  const renderEvent = stage==='RENDERING' ? event : stage==='COVERS' && prior?.stage==='RENDERING' ? prior : null;
  const position = /^Rendering · clip (\d{1,3})\/(\d{1,3})$/i.exec(renderEvent?.message || '');
  return position && Number(position[1]) > 0 && Number(position[1]) <= Number(position[2])
    ? {number:Number(position[1]),total:Number(position[2])} : null;
}
function activeStep(row, updates) {
  const stage = endStages.includes(row.stage) ? updates[0]?.stage : row.stage;
  const stageProgress = endStages.includes(row.stage) ? null : [row.stage_progress,row.stage_percent,stage==='DOWNLOADING' ? row.download_percent : null]
    .map(percent).find(value=>value!==null) ?? null;
  return {stage,clip:clipPosition(updates,stage),stageProgress,name:stepNames[stage] || stages.find(([,keys])=>keys.includes(stage))?.[0] || null};
}

export function analysisProgress(job) {
  const count = job.segments?.completed ?? job.segments_processed;
  const total = job.segments?.total ?? job.segments_total;
  if (count == null || total == null || count === '' || total === '') return null;
  const completed = Number(count);
  const target = Number(total);
  return Number.isInteger(completed) && Number.isInteger(target) && completed>=0 && target>0 && completed<=target
    ? {completed,total:target,percent:Math.floor(completed/target*100)} : null;
}

const segmentEvents = {SEGMENT_STARTED:'starting',SEGMENT_PROCESSING:'processing',SEGMENT_COMPLETED:'completed',SEGMENT_FAILED:'failed',SEGMENT_RETRIED:'retried',WORKER_STEP:'processing'};
const activeSegmentStates = ['starting','processing','retried'];
const validSegment = value => Number.isInteger(Number(value)) && Number(value)>0 && Number(value)<=1000;
const verificationStages = stages.find(([,keys])=>keys.includes('ANALYZING'))[1];
function segmentMarker(event) {
  if (!segmentEvents[event.event_type] || !verificationStages.includes(event.stage)) return null;
  const match = /^Analyzing · segment (\d{1,4})\/(\d{1,4})$/.exec(event.message || '');
  const number = Number(event.segment_number ?? match?.[1]);
  const total = Number(event.segments_total ?? match?.[2]);
  return validSegment(number) && validSegment(total) && number<=total ? {number,total} : null;
}

function segmentReport(job, events) {
  const records = new Map();
  let reportedTotal = 0;
  let legacyStart = 0;
  let firstSegmentIndex = -1;
  let explicit = false;
  for (const [index,event] of events.entries()) {
    const status = segmentEvents[event.event_type];
    const marker = segmentMarker(event);
    if (!marker) continue;
    const {number,total} = marker;
    reportedTotal ||= total;
    if (total!==reportedTotal) continue;
    if (firstSegmentIndex<0) firstSegmentIndex=index;
    if (event.event_type==='WORKER_STEP') legacyStart=Math.max(legacyStart,number);
    else explicit=true;
    if (!records.has(number)) records.set(number,status);
  }
  const total = validSegment(job.segments_total) ? Number(job.segments_total) : reportedTotal;
  if (!total) return null;
  const matching = !reportedTotal || reportedTotal===total;
  if (!matching) { records.clear(); legacyStart=0; }
  const ended = legacyStart>0 && events.slice(0,firstSegmentIndex).some(event=>event.stage==='SELECTING');
  const rowCount = analysisProgress(job)?.completed ?? 0;
  const prefix = ended ? total : Math.max(explicit ? 0 : rowCount,legacyStart-1,0);
  const active = isProcessing(job) && verificationStages.includes(job.stage);
  const reportedCurrent = Number(job.current_segment);
  const [latest,latestStatus] = records.entries().next().value || [];
  const candidate = explicit ? (activeSegmentStates.includes(latestStatus) ? latest : null)
    : validSegment(reportedCurrent) && reportedCurrent<=total ? reportedCurrent : latestStatus==='processing' ? latest : null;
  const current = active && candidate>prefix && !['failed','completed'].includes(records.get(candidate)) ? candidate : null;
  const segments = Array.from({length:total},(_,index)=>{
    const number = index+1;
    const detail = records.get(number);
    if (detail==='failed' || detail==='completed') return detail;
    if (number===current) return detail || 'processing';
    if (number<=prefix) return 'completed';
    return active && current && number>current && !detail ? 'pending' : 'unknown';
  });
  return {total, completed:segments.filter(status=>status==='completed').length, current:current ?? null, rows:segments};
}

export const studioTimeZone = 'Asia/Kolkata';
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  year:'numeric', month:'2-digit', day:'2-digit', timeZone:studioTimeZone
});
export const studioDay = date => dayFormat.format(date);

function instant(value) {
  if (typeof value !== 'string' || !/[T ]\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function scheduledRelease(row, platform) {
  if (['PUBLISHED','CANCELED','CANCELLED','FAILED','ERROR','DISPATCHED'].includes(state(row))) return null;
  const date = instant(row.scheduled_at ?? row.scheduled_for);
  return date ? {platform, at:date.toISOString()} : null;
}

export const isReelPublished = clip => Boolean(clip.instagram || clip.youtube || clip.published || Object.values(clip.delivery?.platforms || {}).includes('Publication reported'));
export function reelStatus(clip) {
  if (clip.schedule?.length) return 'scheduled';
  const renderStatus = String(clip.render_status || '').toUpperCase();
  if (['PROCESSING','RENDERING'].includes(renderStatus) || Object.values(clip.delivery?.platforms || {}).includes('Processing')) return 'processing';
  if (isReelPublished(clip)) return 'published';
  if (renderStatus === 'RENDERED' || clip.delivery?.awaitingDate) return 'ready';
  return null;
}

const releaseKey = (jobId,key) => JSON.stringify([jobId,key]);
const platformKeys = ['instagram','youtube'];

export function publishingDays(clips, month) {
  const days = new Map();
  for (const clip of clips) {
    const releases = [...(clip.schedule || []).map(release=>({...release,status:'Scheduled'})),
      ...platformKeys.flatMap(platform=>clip[platform] ? [{at:clip[platform].at,platform,status:'Published'}] : [])];
    for (const release of releases) {
      if (release.status==='Scheduled' && (release.platform ? clip[release.platform] : clip.instagram && clip.youtube)) continue;
      const date = instant(release.at);
      if (!date) continue;
      const day = studioDay(date);
      if (!day.startsWith(month+'-')) continue;
      if (!days.has(day)) days.set(day,new Map());
      const reels = days.get(day);
      if (!reels.has(clip.id)) reels.set(clip.id,{clip,releases:[]});
      reels.get(clip.id).releases.push({...release,at:date.toISOString()});
    }
  }
  return new Map([...days].map(([day,reels])=>[day,[...reels.values()]
    .map(entry=>({...entry,releases:entry.releases.sort((a,b)=>a.at.localeCompare(b.at))}))
    .sort((a,b)=>a.releases[0].at.localeCompare(b.releases[0].at))]));
}

function platformDelivery(row, weekly, platform, receipt, pending) {
  if (receipt) return 'Published';
  const status = state(row || {}) || String(weekly?.[platform+'_state'] || '').toUpperCase();
  if (status==='PUBLISHED') return 'Publication reported';
  if (/ERROR|FAILED|RECONCILIATION|CREDIT_MISSING/.test(status)) return 'Needs attention';
  if (pending) return 'Scheduled';
  if (status==='WAITING_WEEKLY_SLOT') return 'Waiting for a slot';
  if (status==='PRIVATE_UPLOADED') return 'Uploaded privately';
  if (/UPLOAD|CONTAINER|PROCESS|PUBLISHING|DISPATCHED/.test(status)) return 'Processing';
  return 'Not reported';
}

export function percent(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

const eventTime = event => Date.parse(event.created_at || event.createdAt);
const executionKey = row => JSON.stringify([row.job_id,String(row.execution_id)]);

function stepTiming(events, keys, boundary) {
  const matching = events.filter(event=>keys.includes(event.stage));
  const first = matching.at(-1);
  if (!first) return {};
  const at = eventTime(first);
  const newest = eventTime(matching[0]);
  let duration = 0;
  let measured = false;
  events.forEach((event,index)=>{
    if (!keys.includes(event.stage)) return;
    const end = index ? eventTime(events[index-1]) : boundary;
    const delta = end-eventTime(event);
    if (Number.isFinite(delta) && delta>=0) { duration+=delta; measured=true; }
  });
  return {startedAt:Number.isFinite(at) ? new Date(at).toISOString() : null,
    durationSeconds:measured ? Math.floor(duration/1000) : null,
    at:Number.isFinite(newest) ? new Date(newest).toISOString() : null};
}

export function platformReceipt(row, platform) {
  try {
    const url = new URL(platform === 'instagram' ? row.permalink : row.youtube_url);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (platform === 'instagram') {
      if (!['www.instagram.com','instagram.com'].includes(url.hostname) || !/^\/(reel|p)\/[\w-]+\/?$/.test(url.pathname) || !row.instagram_media_id || state(row) !== 'PUBLISHED') return null;
    } else {
      const id = String(row.youtube_video_id || '');
      if (!/^[\w-]{11}$/.test(id) || state(row) !== 'PUBLISHED' || row.privacy_status !== 'public') return null;
      const valid = ['www.youtube.com','youtube.com'].includes(url.hostname)
        ? url.pathname === '/shorts/'+id || url.pathname === '/watch' && url.searchParams.get('v') === id
        : url.hostname === 'youtu.be' && url.pathname === '/'+id;
      if (!valid) return null;
    }
    return {url:url.href, id: platform === 'instagram' ? String(row.instagram_media_id) : row.youtube_video_id, at:row.published_at || null, job_id:row.parent_job_id || null};
  } catch { return null; }
}

export function gamingSnapshot(snapshot, now = Date.now()) {
  const auto = snapshot?.automations?.funny_reels;
  const version = snapshot?.source_updated_at?.automations || snapshot?.updated_at || null;
  const workerEvents = rows(auto?.events).slice(0,1000).sort((a,b)=>(eventTime(b)||0)-(eventTime(a)||0) || Number(b.id)-Number(a.id));
  const eventsByRun = new Map();
  for (const event of workerEvents) {
    const key = executionKey(event);
    if (!eventsByRun.has(key)) eventsByRun.set(key,[]);
    eventsByRun.get(key).push(event);
  }
  const currentRows = new Map(rows(auto?.jobs).filter(row=>row.job_id).slice(0,20).map(row=>[executionKey(row),row]));
  const archived = [];
  for (const [key,[event]] of eventsByRun) {
    if (currentRows.has(key) || !/^[\w-]{1,100}$/.test(event.job_id || '') || !/^\d+$/.test(event.execution_id || '')) continue;
    const source = [...currentRows.values()].find(row=>row.job_id===event.job_id);
    const run = rows(snapshot?.n8n?.executions).find(row=>String(row.id)===String(event.execution_id));
    const recordedState = ['error','crashed'].includes(run?.status) ? 'ERROR' : run?.status==='canceled' ? 'CANCELED' : run?.status==='success' ? 'DONE' : 'UNKNOWN';
    archived.push({...pick(source || {},['title','video_id','n8n_workflow_id']),job_id:event.job_id,execution_id:event.execution_id,
      stage:event.stage,state:recordedState,archived:true,recordedAt:Number.isFinite(eventTime(event)) ? new Date(eventTime(event)).toISOString() : null,finished_at:run?.stoppedAt || run?.stopped_at});
    if (archived.length===20) break;
  }
  const jobs = [...currentRows.values(), ...archived].map(row => {
    const runEvents = eventsByRun.get(executionKey(row)) || [];
    const updates = runEvents.filter(event=>event.event_type==='WORKER_STEP');
    const stageEvents = runEvents.filter(event=>stages.some(([,keys])=>keys.includes(event.stage)));
    const step = activeStep(row,updates);
    const steps = stages.map(([,keys])=>{
      const event = runEvents.find(event=>keys.includes(event.stage));
      if (!event) return null;
      const boundary = keys.includes(step.stage) && terminalStates.includes(state(row)) ? Date.parse(row.finished_at) : NaN;
      const timing = stepTiming(stageEvents,keys,boundary);
      return {...timing, clip:clipPosition(updates,event.stage),
        progress:event.stage==='DOWNLOADED' ? 100 : null};
    });
    return {
      ...pick(row, ['job_id','video_id','title','state','stage','worker_status','workflow_version','execution_id','n8n_workflow_id','current_node','current_step','duration_seconds','size_bytes','resolution','createdAt','requested_at','started_at','last_heartbeat_at','finished_at','priority','retry_count','segments_processed','segments_total','current_segment','clips_selected','max_clips','downloaded_mb','download_speed','download_eta','source_reused']),
      failed: Boolean(row.error_message || row.error_code || ['FAILED','ERROR','PIPELINE_FAILED'].includes(state(row))),
      overall: percent(row.overall_progress),
      archived:Boolean(row.archived), recordedAt:row.recordedAt, segments:segmentReport(row,runEvents), step, steps, stageProgress:step.stageProgress
    };
  });
  const cleanReceipts = (list, platform) => new Map(rows(list).slice(0,250).flatMap(row => {
    const receipt = platformReceipt(row, platform);
    return receipt && row.job_key ? [[row.job_key, receipt]] : [];
  }));
  const instagram = cleanReceipts(auto?.instagram_reels, 'instagram');
  const youtubeRows = rows(snapshot?.automations?.youtube?.uploads).slice(0,250);
  const youtube = cleanReceipts(youtubeRows, 'youtube');
  const weekly = new Map();
  for (const row of rows(auto?.weekly_queue).slice(0,250)) {
    if (!row.job_key || !/^[\w-]{1,100}$/.test(row.parent_job_id || '')) continue;
    const key = releaseKey(row.parent_job_id,row.job_key);
    if (!weekly.has(key)) weekly.set(key,row);
  }
  const releases = new Map();
  for (const [platform, list] of [['instagram',rows(auto?.instagram_reels).slice(0,250)],['youtube',youtubeRows]]) {
    for (const row of list) {
      if (!row.job_key || !row.parent_job_id) continue;
      const key = releaseKey(row.parent_job_id,row.job_key);
      const entry = releases.get(key) || {row, platforms:new Map()};
      // Collector rows arrive newest first. A later publication or cancellation supersedes the schedule.
      if (entry.platforms.has(platform)) continue;
      entry.platforms.set(platform,row);
      releases.set(key,entry);
    }
  }
  function reelDelivery(jobId,key,clip) {
    const id = releaseKey(jobId,key);
    const queue = weekly.get(id);
    const platforms = releases.get(id)?.platforms;
    const ig = instagram.get(key), yt = youtube.get(key);
    const receipts = {instagram:ig?.job_id===jobId ? ig : null,youtube:yt?.job_id===jobId ? yt : null};
    const schedule = platformKeys.map(platform=>{
      const row=platforms?.get(platform);
      return row && !receipts[platform] ? scheduledRelease(row,platform) : null;
    }).filter(Boolean);
    const fallback = queue ? scheduledRelease(queue,null) : clip ? scheduledRelease({...clip,status:clip.render_status},null) : null;
    if (!schedule.length && fallback && !(receipts.instagram && receipts.youtube)) schedule.push(fallback);
    const relatedRuns=runHistory(jobs.filter(job=>job.job_id===jobId));
    const created = Date.parse(queue?.created_at || clip?.created_at);
    const sourceRun = relatedRuns.find(job=>Date.parse(job.started_at || job.steps.find(Boolean)?.startedAt)<=created)
      || (relatedRuns.length===1 ? relatedRuns[0] : null);
    return {...receipts,schedule,sourceExecution:sourceRun?.execution_id || null,published:Boolean(receipts.instagram && receipts.youtube),
      delivery:{awaitingDate:Boolean(queue && ['QUEUED','READY','SCHEDULED'].includes(state(queue)) && !schedule.length && !receipts.instagram && !receipts.youtube),
        coverReady:queue?.has_cover===true,
        review:clip?.review_status==='APPROVED' ? 'Approved' : clip?.review_status==='NEEDS_REVIEW' ? 'Needs review' : 'Not reported',
        platforms:Object.fromEntries(platformKeys.map(platform=>[platform,platformDelivery(platforms?.get(platform),queue,platform,receipts[platform],schedule.some(item=>!item.platform || item.platform===platform))]))}};
  }
  const matchedReleases = new Set();
  const clips = rows(auto?.clips).filter(row => /^[\w-]{1,100}$/.test(row.job_id || '') &&
    Number.isInteger(Number(row.clip_number)) && Number(row.clip_number) >= 1 && Number(row.clip_number) <= 10).slice(0,200).map(row => {
    const id = row.id || row.job_id + '-' + row.clip_number;
    const key = row.job_key || [row.video_id,row.start_seconds,row.end_seconds].join('-');
    const endpoint = '/api/admin/reel-media?'+new URLSearchParams({job_id:row.job_id,clip:row.clip_number});
    matchedReleases.add(releaseKey(row.job_id,key));
    return {...pick(row,['job_id','title','category','duration_seconds','start_seconds','end_seconds','quality_score','editing_engine','caption','hashtags','streamer','created_at','render_status']),
      id, clipNumber:Number(row.clip_number), cover:row.cover_path ? endpoint+'&kind=cover' : null, preview:row.video_path ? endpoint+'&kind=video' : null,
      receiptKey:key, ...reelDelivery(row.job_id,key,row)};
  });
  for (const [id,row] of weekly) {
    if (matchedReleases.has(id)) continue;
    matchedReleases.add(id);
    clips.push({...pick(row,['title','start_seconds','end_seconds']),id:'weekly-'+id,job_id:row.parent_job_id,receiptKey:row.job_key,
      ...reelDelivery(row.parent_job_id,row.job_key)});
  }
  for (const job of jobs.filter(isProcessing)) {
    const clip = job.step.clip;
    if (!clip || clips.some(item=>item.job_id===job.job_id && item.clipNumber===clip.number)) continue;
    clips.push({id:`processing-${job.execution_id || job.job_id}-${clip.number}`,job_id:job.job_id, sourceExecution:job.execution_id,
      clipNumber:clip.number, title:`Clip ${clip.number} of ${clip.total}`,render_status:'PROCESSING', processingStep:job.step.name});
  }
  const gamingJobs = new Set([...jobs.map(row=>row.job_id), ...clips.map(row=>row.job_id)]);
  for (const [key, {row}] of releases) {
    if (matchedReleases.has(key) || !gamingJobs.has(row.parent_job_id)) continue;
    const delivery=reelDelivery(row.parent_job_id,row.job_key);
    if (!delivery.schedule.length) continue;
    clips.push({...pick(row,['title','caption']), id:'scheduled-'+key, job_id:row.parent_job_id,receiptKey:row.job_key,...delivery});
  }
  for (const key of new Set([...instagram.keys(), ...youtube.keys()])) {
    const ig = instagram.get(key), yt = youtube.get(key);
    if (clips.some(clip => clip.receiptKey === key && (clip.instagram || clip.youtube))) continue;
    const sameJob = Boolean(ig?.job_id && ig.job_id === yt?.job_id);
    if (ig) clips.push({id:'ig-'+ig.id,job_id:ig.job_id,title:'Instagram publication',...reelDelivery(ig.job_id,key)});
    if (yt && !sameJob) clips.push({id:'yt-'+yt.id,job_id:yt.job_id,title:'YouTube publication',...reelDelivery(yt.job_id,key)});
  }
  const events = [...new Map(workerEvents.filter(row => row.id != null).map(row => [String(row.id), row])).values()].slice(0,200)
    .map(row => ({...pick(row,['id','job_id','execution_id','stage','event_type','created_at','createdAt']),segment:segmentMarker(row)}));
  const disk = snapshot?.storage;
  const resources = {disk: disk?.total > 0 ? percent(Math.round(disk.used/disk.total*100)) : null,
    docker: Array.isArray(snapshot?.services) ? snapshot.services.some(service => service.name === 'n8n' && service.state === 'running') : null};
  return {version, available:Boolean(auto), fresh:Boolean(auto) && sourceFresh(snapshot,'automations',now),
    n8nFresh:sourceFresh(snapshot,'n8n',now), jobs, clips, events, resources,
    receipts:{instagram:instagram.size,youtube:youtube.size}};
}

export function newerGamingSnapshot(current, next) {
  return Date.parse(next.version) >= Date.parse(current?.version) || !current?.version ? next : current;
}
