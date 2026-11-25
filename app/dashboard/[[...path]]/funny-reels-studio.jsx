'use client';

import {useEffect,useState} from 'react';
import {Activity,Clapperboard,ListVideo,RefreshCw,ExternalLink} from 'lucide-react';
import {adminApi} from '../../../lib/dashboard-client.mjs';
import {isProcessing,isQueued,newerGamingSnapshot,stages} from '../../../lib/gaming-studio.mjs';
import './gaming-studio.css';

const date = new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'});
const time = value => Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : 'Not reported';
const label = value => value ? String(value).toLowerCase().replaceAll('_',' ') : 'Not reported';
const videoId = id => /^[\w-]{11}$/.test(id || '') ? id : null;
const sourceLink = id => videoId(id) && 'https://www.youtube.com/watch?v='+id;
function runLink(row) {
  if (!/^\d+$/.test(row?.execution_id || '')) return null;
  const workflow = /^[\w-]+$/.test(row.n8n_workflow_id || '') ? row.n8n_workflow_id : null;
  return workflow ? 'https://n8n.shivpatel.in/workflow/'+workflow+'/executions/'+row.execution_id
    : 'https://n8n.shivpatel.in/execution/'+row.execution_id;
}
function External({href,children}) {
  return href && <a href={href} target="_blank" rel="noopener noreferrer">{children} <ExternalLink size={13} aria-hidden="true"/></a>;
}
function Thumbnail({id}) {
  return videoId(id) ? <img className="gaming-thumbnail" src={'https://i.ytimg.com/vi/'+id+'/mqdefault.jpg'} alt="" loading="lazy"/> :
    <div className="gaming-thumbnail gaming-placeholder"><Clapperboard size={26} aria-hidden="true"/></div>;
}
function Progress({name,value,waiting}) {
  return <label className="gaming-progress"><span>{name}<strong>{waiting ? 'Awaiting fresh data' : value == null ? 'Not measured' : value+'%'}</strong></span>
    {!waiting && <progress max={100} value={value ?? undefined}/>}</label>;
}
function Execution({job,events,fresh,now}) {
  if (!job) return <section className="gaming-card"><h2>Current execution</h2><p>No active execution appears in the collected jobs.</p></section>;
  const completed = job.segments_processed;
  const total = job.segments_total > 0 ? job.segments_total : null;
  const age = now-Date.parse(job.last_heartbeat_at);
  const heartbeatFresh = Number.isFinite(age) && age >= -30000 && age < 900000;
  const started = Date.parse(job.started_at);
  const elapsed = fresh && Number.isFinite(started) && now >= started ? Math.floor((now-started)/60000)+' min' : 'Not reported';
  const current = stages.findIndex(([,keys])=>keys.includes(job.stage));
  return <section className="gaming-card"><div className="gaming-row"><h2>Current execution</h2><span className="gaming-pill">{job.failed?'Needs attention':fresh&&heartbeatFresh?'Processing':'Last reported'}</span></div>
    <div className="gaming-source"><Thumbnail id={job.video_id}/><div><h3>{job.title || job.video_id || job.job_id}</h3><p>{label(job.stage)} · {job.workflow_version || 'Version not reported'}</p><External href={sourceLink(job.video_id)}>Source video</External></div></div>
    <Progress name="Overall progress" value={job.overall} waiting={!fresh || !heartbeatFresh}/>
    <Progress name="Current stage" value={job.stageProgress} waiting={!fresh || !heartbeatFresh}/>
    <dl className="gaming-facts">
      <div><dt>Segments completed</dt><dd>{completed ?? '—'}{total ? ' / '+total : ''}</dd></div>
      <div><dt>Segments remaining</dt><dd>{total && completed != null ? Math.max(0,total-completed) : '—'}</dd></div>
      <div><dt>Elapsed</dt><dd>{elapsed}</dd></div><div><dt>Last heartbeat</dt><dd>{time(job.last_heartbeat_at)}</dd></div>
      <div><dt>Execution</dt><dd>{job.execution_id || '—'}</dd></div><div><dt>Retries</dt><dd>{job.retry_count ?? '—'}</dd></div>
    </dl>
    <details><summary>Processing timeline</summary>
      <ol className="gaming-timeline">{stages.map(([name,keys],index)=>{
        const reported=events.some(event=>keys.includes(event.stage));
        return <li key={name}><span>{name}</span><strong>{current===index ? 'Current' : reported ? 'Reported' : 'No event'}</strong></li>;
      })}</ol>
      <dl className="gaming-facts">
        <div><dt>Current step</dt><dd>{job.current_node || job.current_step || 'Not reported'}</dd></div>
        <div><dt>Current segment</dt><dd>{job.current_segment ?? 'Not reported'}</dd></div>
        <div><dt>Duration / resolution</dt><dd>{job.duration_seconds ? job.duration_seconds+' s' : '—'} / {job.resolution || '—'}</dd></div>
        <div><dt>Size / downloaded</dt><dd>{job.size_bytes ? Math.round(job.size_bytes/1e6)+' MB' : '—'} / {job.downloaded_mb != null ? job.downloaded_mb+' MB' : '—'}</dd></div>
        <div><dt>Source</dt><dd>{job.source_reused === true ? 'Existing source reused' : 'Reuse not reported'}</dd></div>
        <div><dt>Download speed / ETA</dt><dd>{job.download_speed || '—'} / {job.download_eta || '—'}</dd></div>
        <div><dt>Selected / limit</dt><dd>{job.clips_selected ?? '—'} / {job.max_clips ?? '—'}</dd></div>
        <div><dt>Latest reported milestone</dt><dd>{events[0] ? label(events[0].stage)+' · '+time(events[0].created_at || events[0].createdAt) : 'Not reported'}</dd></div>
      </dl>
    </details>
    <div className="gaming-row gaming-run"><External href={runLink(job)}>Open execution</External><span>Pause, resume and retry require worker support.</span></div>
  </section>;
}
function Reel({clip}) {
  const [failedCover,setFailedCover]=useState([]);
  const thumbnail = clip.youtube ? 'https://i.ytimg.com/vi/'+clip.youtube.id+'/mqdefault.jpg' : null;
  const cover = [clip.cover,thumbnail].find(url=>url&&!failedCover.includes(url));
  return <article className="gaming-reel">
    {cover ? <img src={cover} alt="" loading="lazy" onError={()=>setFailedCover(previous=>[...previous,cover])}/> : <div className="gaming-placeholder"><Clapperboard size={24} aria-hidden="true"/></div>}
    <h3>{clip.title || 'Generated reel'}</h3>
    <p>{[clip.category,clip.duration_seconds && clip.duration_seconds+' s',clip.quality_score != null && clip.quality_score+'/100',clip.editing_engine].filter(Boolean).join(' · ') || 'Details from collected records'}</p>
    <ul>{['instagram','youtube'].map(platform=><li key={platform}>{clip[platform] ? <External href={clip[platform].url}>{label(platform)} receipt</External> : label(platform)+' receipt pending'}</li>)}</ul>
    <details><summary>Reel details</summary>
      {clip.preview && <External href={clip.preview}>Open private preview</External>}
      {clip.caption && <p>{clip.caption}</p>}{clip.hashtags && <p>{clip.hashtags}</p>}
      {clip.streamer && <p>Creator: {clip.streamer}</p>}
      {clip.start_seconds != null && <p>Source: {clip.start_seconds}–{clip.end_seconds ?? '—'} s</p>}
      {clip.created_at && <p>{time(clip.created_at)}</p>}
    </details>
  </article>;
}
export default function FunnyReelsStudio({initial,refresh}) {
  const [data,setData]=useState(initial),[error,setError]=useState(''),[now,setNow]=useState(0);
  const [filter,setFilter]=useState('All'),[limit,setLimit]=useState(8),[severity,setSeverity]=useState('All'),[revision,reload]=useState(0);
  useEffect(()=>{
    let disposed=false, timer, controller;
    async function poll(){
      if(disposed || controller || document.hidden)return;
      controller=new AbortController();
      try {
        const snapshot=await adminApi('funny-reels',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
        if(!disposed){setData(previous=>newerGamingSnapshot(previous,snapshot));setError('');}
      } catch {
        if(!disposed)setError('Could not refresh collector data. Showing the last available records.');
      } finally {
        controller=null;
        if(!disposed){setNow(Date.now());timer=setTimeout(poll,10000);}
      }
    }
    function visible(){if(!document.hidden){clearTimeout(timer);poll();}}
    document.addEventListener('visibilitychange',visible);
    poll();
    return ()=>{disposed=true;controller?.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
  },[refresh,revision]);
  const age=now-Date.parse(data?.version);
  const fresh=Boolean(data?.fresh && !error && (!now || age >= -30000 && age < 120000));
  const active=(data?.jobs || []).filter(isProcessing),queue=(data?.jobs || []).filter(isQueued).sort((a,b)=>(a.priority ?? Infinity)-(b.priority ?? Infinity) || Date.parse(a.requested_at || a.createdAt)-Date.parse(b.requested_at || b.createdAt));
  const job=active[0];
  const clips=(data?.clips || []).filter(clip=>filter==='All' || filter==='Published'&&clip.published || filter==='Ready'&&clip.render_status==='RENDERED'&&!clip.published || filter==='Failed'&&/FAILED|ERROR/i.test(clip.render_status) || filter==='Processing'&&/PROCESSING|RENDERING/i.test(clip.render_status));
  const activity=(data?.events || []).filter(event=>severity==='All' || (severity==='Errors'&&/FAIL|ERROR/i.test(event.event_type)) ||
    (severity==='Warnings'&&/WARN|RETRY/i.test(event.event_type)) || (severity==='Milestones'&&!/FAIL|ERROR|WARN|RETRY/i.test(event.event_type)));
  return <div className="gaming-studio">
    <div className="gaming-row gaming-status" role="status"><span className="gaming-pill">{fresh?'Collector online':data?'Collector stale':error?'Collector unavailable':'Connecting to collector'}</span><span>Last collected {time(data?.version)} IST</span><button type="button" onClick={()=>reload(value=>value+1)}><RefreshCw size={15} aria-hidden="true"/> Refresh</button></div>
    {error && <p className="gaming-alert" role="alert">{error}</p>}
    <section className="gaming-card"><h2>Add new video</h2><div className="gaming-intake"><input type="url" aria-label="YouTube source URL" placeholder="Paste a YouTube video or livestream URL" disabled/><button disabled>Add to queue</button></div><p>Intake is paused until the dispatcher can safely queue sources without starting another worker. Permission to edit and republish is required.</p></section>
    <div className="gaming-summary">{[[Activity,'Processing',active.length],[ListVideo,'In queue',queue.length],[Clapperboard,'Published',data?.clips?.filter(clip=>clip.published).length||0]].map(([Icon,name,count])=><section className="gaming-card" key={name}><div className="gaming-row"><h2>{name}</h2><Icon size={18} aria-hidden="true"/></div><strong>{data?.available?count:'—'}</strong></section>)}</div>
    <div className="gaming-grid">
      <Execution job={job} events={(data?.events || []).filter(event=>event.job_id===job?.job_id)} fresh={fresh} now={now}/>
      <div className="gaming-side"><section className="gaming-card"><h2>Upcoming queue</h2>{queue.length ? <ol>{queue.map(item=><li key={item.job_id}><strong>{item.title || item.video_id || item.job_id}</strong><p>{time(item.requested_at || item.createdAt)} · {label(item.state)}</p><External href={sourceLink(item.video_id)}>Open source</External></li>)}</ol> : <p>No queued items appear in the collected records.</p>}<p>Reordering and removal require dispatcher support.</p></section>
        <section className="gaming-card"><h2>System health</h2><dl className="gaming-facts">{[['n8n',data?.n8nFresh&&fresh?'Recent status':'Status unavailable'],['WSL / collector',fresh?'Reporting':'Awaiting update'],['Docker / n8n container',fresh&&data?.resources.docker?'Running':'Not confirmed'],['GPU / CPU / RAM','No telemetry feed']].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><Progress name="Disk used" value={data?.resources.disk} waiting={!fresh || data?.resources.disk==null}/></section>
      </div>
    </div>
    <section className="gaming-card"><div className="gaming-row"><h2>Generated reels</h2><select aria-label="Filter reels" value={filter} onChange={event=>{setFilter(event.target.value);setLimit(8);}}>{['All','Processing','Ready','Published','Failed'].map(value=><option key={value}>{value}</option>)}</select></div>
      {clips.length ? <div className="gaming-library">{clips.slice(0,limit).map(clip=><Reel key={clip.id} clip={clip}/>)}</div>:<p>No collected reels match this view.</p>}
      {clips.length>limit && <button onClick={()=>setLimit(n=>n+8)}>Show more reels</button>}
    </section>
    <section className="gaming-card"><div className="gaming-row"><h2>Recent activity</h2><select aria-label="Filter activity" value={severity} onChange={event=>setSeverity(event.target.value)}>{['All','Errors','Warnings','Milestones'].map(value=><option key={value}>{value}</option>)}</select></div>
      {activity.length ? <details open><summary>{activity.length} collected events</summary><ol className="gaming-activity">{activity.slice(0,20).map(event=><li key={event.id}><strong>{label(event.stage)}</strong><span>{label(event.event_type)}</span><time>{time(event.created_at || event.createdAt)}</time><External href={runLink(event)}>Run {event.execution_id}</External></li>)}</ol></details> : <p>No events match this view.</p>}
    </section>
  </div>;
}
