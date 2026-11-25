import {sourceFresh} from './master-dashboard.mjs';

export const stages = [
  ['Source download', ['DOWNLOADING', 'DOWNLOADED', 'SOURCE_INTAKE', 'SOURCE_RECOVERY']],
  ['Local AI analysis', ['LOCAL_ANALYSIS', 'FEATURE_EXTRACTION', 'CANDIDATE_DISCOVERY', 'VISUAL_SCREENING']],
  ['AI highlight verification', ['ANALYZING', 'VERIFYING', 'GEMINI_VERIFICATION']],
  ['Highlight selection', ['SELECTING', 'CREATIVE_DIRECTION']],
  ['Video editing', ['RENDERING', 'COVERS', 'CHATCUT_EDITING']],
  ['Quality inspection', ['QUALITY_INSPECTION', 'VALIDATING']],
  ['Publishing', ['INSTAGRAM_UPLOAD', 'YOUTUBE_UPLOAD', 'PUBLISHING', 'PUBLISHED']]
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

export const studioTimeZone = 'Asia/Kolkata';
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  year:'numeric', month:'2-digit', day:'2-digit', timeZone:studioTimeZone
});
export const studioDay = date => dayFormat.format(date);

function scheduledRelease(row, platform) {
  if (['PUBLISHED','CANCELED','CANCELLED','FAILED','ERROR'].includes(state(row))) return null;
  const value = row.scheduled_at;
  if (typeof value !== 'string' || !/[T ]\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? {platform, at:new Date(timestamp).toISOString()} : null;
}

export function reelStatus(clip) {
  if (clip.schedule?.length) return 'scheduled';
  if (clip.instagram || clip.youtube || clip.published) return 'published';
  const renderStatus = String(clip.render_status || '').toUpperCase();
  if (renderStatus === 'RENDERED') return 'ready';
  if (['PROCESSING','RENDERING'].includes(renderStatus)) return 'processing';
  return null;
}

export function scheduledReels(clips, month) {
  return clips.flatMap(clip => (clip.schedule || []).map(release => ({
    ...release, day:studioDay(new Date(release.at)), id:clip.id, title:clip.title
  }))).filter(release => release.day.startsWith(month + '-'))
    .sort((a,b) => a.at.localeCompare(b.at));
}

export function percent(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
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
  const jobs = [...new Map(rows(auto?.jobs).filter(row => row.job_id).slice(0,20).map(row => [row.job_id, row])).values()].map(row => ({
    ...pick(row, ['job_id','video_id','title','state','stage','worker_status','workflow_version','execution_id','n8n_workflow_id','current_node','current_step','duration_seconds','size_bytes','resolution','createdAt','requested_at','started_at','last_heartbeat_at','finished_at','priority','retry_count','segments_processed','segments_total','current_segment','clips_selected','max_clips','downloaded_mb','download_speed','download_eta','source_reused']),
    failed: Boolean(row.error_message || row.error_code || ['FAILED','ERROR','PIPELINE_FAILED'].includes(state(row))),
    overall: percent(row.overall_progress),
    stageProgress: percent(row.stage_progress ?? row.stage_percent ?? (row.stage === 'DOWNLOADING' ? row.download_percent : null))
  }));
  const cleanReceipts = (list, platform) => new Map(rows(list).slice(0,250).flatMap(row => {
    const receipt = platformReceipt(row, platform);
    return receipt && row.job_key ? [[row.job_key, receipt]] : [];
  }));
  const instagram = cleanReceipts(auto?.instagram_reels, 'instagram');
  const youtubeRows = rows(snapshot?.automations?.youtube?.uploads).slice(0,250);
  const youtube = cleanReceipts(youtubeRows, 'youtube');
  const releases = new Map();
  for (const [platform, list] of [['instagram',rows(auto?.instagram_reels).slice(0,250)],['youtube',youtubeRows]]) {
    for (const row of list) {
      if (!row.job_key || !row.parent_job_id) continue;
      const key = JSON.stringify([row.parent_job_id,row.job_key]);
      const entry = releases.get(key) || {row, schedule:new Map()};
      // Collector rows arrive newest first. A later publication or cancellation supersedes the schedule.
      if (entry.schedule.has(platform)) continue;
      entry.schedule.set(platform,scheduledRelease(row, platform));
      releases.set(key,entry);
    }
  }
  const matchedReleases = new Set();
  const clips = rows(auto?.clips).filter(row => /^[\w-]{1,100}$/.test(row.job_id || '') &&
    Number.isInteger(Number(row.clip_number)) && Number(row.clip_number) >= 1 && Number(row.clip_number) <= 10).slice(0,200).map(row => {
    const id = row.id || row.job_id + '-' + row.clip_number;
    const key = row.job_key || [row.video_id,row.start_seconds,row.end_seconds].join('-');
    const endpoint = '/api/admin/reel-media?'+new URLSearchParams({job_id:row.job_id,clip:row.clip_number});
    const ig = instagram.get(key), yt = youtube.get(key);
    const releaseKey = JSON.stringify([row.job_id,key]);
    const platforms = [...(releases.get(releaseKey)?.schedule.values() || [])].filter(Boolean);
    const clipRelease = scheduledRelease({...row,status:row.render_status}, null);
    const schedule = platforms.length ? platforms : ig?.job_id === row.job_id || yt?.job_id === row.job_id ? [] : [clipRelease].filter(Boolean);
    matchedReleases.add(releaseKey);
    return {...pick(row,['job_id','title','category','duration_seconds','start_seconds','end_seconds','quality_score','editing_engine','caption','hashtags','streamer','created_at','render_status']),
      id, cover:row.cover_path ? endpoint+'&kind=cover' : null, preview:row.video_path ? endpoint+'&kind=video' : null,
      schedule, receiptKey:key, instagram:ig?.job_id === row.job_id ? ig : null, youtube:yt?.job_id === row.job_id ? yt : null, published:ig?.job_id === row.job_id && yt?.job_id === row.job_id};
  });
  const gamingJobs = new Set([...jobs.map(row=>row.job_id), ...clips.map(row=>row.job_id)]);
  for (const [key, {row, schedule}] of releases) {
    const pending = [...schedule.values()].filter(Boolean);
    if (!pending.length || matchedReleases.has(key) || !gamingJobs.has(row.parent_job_id)) continue;
    clips.push({...pick(row,['title','caption']), id:'scheduled-'+key, job_id:row.parent_job_id, schedule:pending});
  }
  for (const key of new Set([...instagram.keys(), ...youtube.keys()])) {
    const ig = instagram.get(key), yt = youtube.get(key);
    if (clips.some(clip => clip.receiptKey === key && (clip.instagram || clip.youtube))) continue;
    const sameJob = Boolean(ig?.job_id && ig.job_id === yt?.job_id);
    if (ig) clips.push({id:'ig-'+ig.id,job_id:ig.job_id,title:'Instagram publication',instagram:ig,youtube:sameJob ? yt : null,published:sameJob});
    if (yt && !sameJob) clips.push({id:'yt-'+yt.id,job_id:yt.job_id,title:'YouTube publication',youtube:yt,published:false});
  }
  const events = [...new Map(rows(auto?.events).filter(row => row.id != null).map(row => [String(row.id), row])).values()]
    .sort((a,b) => (Date.parse(b.created_at || b.createdAt)||0)-(Date.parse(a.created_at || a.createdAt)||0)).slice(0,200)
    .map(row => pick(row,['id','job_id','execution_id','stage','event_type','created_at','createdAt']));
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
