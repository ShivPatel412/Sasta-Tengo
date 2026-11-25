'use client';

import {useEffect,useId,useState} from 'react';
import {Activity,ChevronLeft,ChevronRight,Clapperboard,ListVideo,RefreshCw,ExternalLink} from 'lucide-react';
import {adminApi} from '../../../lib/dashboard-client.mjs';
import {analysisProgress,dashboardExecution,isProcessing,isQueued,newerGamingSnapshot,reelStatus,scheduledReels,stages,studioDay,studioTimeZone} from '../../../lib/gaming-studio.mjs';
import './gaming-studio.css';

const date = new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:studioTimeZone});
const time = value => Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : 'Not reported';
const label = value => value ? String(value).toLowerCase().replaceAll('_',' ') : 'Not reported';
const videoId = id => /^[\w-]{11}$/.test(id || '') ? id : null;
const sourceLink = id => videoId(id) && 'https://www.youtube.com/watch?v='+id;
const sectionTabs = {dashboard:'Master dashboard',execution:'Current execution',reels:'Generated reels',logs:'Logs'};
const reelTabs = {ready:'Ready to publish',published:'Published',processing:'Processing',scheduled:'Scheduled'};
const platformNames = {instagram:'Instagram',youtube:'YouTube'};
const monthFormat = new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'});

function Tabs({label,items,value,onChange,children}) {
  const id = useId();
  const names = Object.keys(items);
  function onKeyDown(event,index) {
    const next = {ArrowLeft:(index+names.length-1)%names.length,ArrowRight:(index+1)%names.length,Home:0,End:names.length-1}[event.key];
    if (typeof next !== 'number') return;
    event.preventDefault();
    event.currentTarget.parentElement.children[next].focus();
    onChange(names[next]);
  }
  return <>
    <div className="gaming-tabs" role="tablist" aria-label={label}>
      {names.map((name,index)=><button key={name} type="button" role="tab" id={`${id}-${name}`} aria-selected={value===name}
        aria-controls={`${id}-panel-${name}`} tabIndex={value===name?0:-1} onClick={()=>onChange(name)} onKeyDown={event=>onKeyDown(event,index)}>{items[name]}</button>)}
    </div>
    {names.map(name=><div key={name} className="gaming-panel" role="tabpanel" id={`${id}-panel-${name}`} aria-labelledby={`${id}-${name}`} tabIndex={0} hidden={value!==name}>
      {value===name && children}
    </div>)}
  </>;
}

function ReleaseTime({release}) {
  return <><time dateTime={release.at}>{time(release.at)} IST</time>{release.platform && <span className="gaming-pill">{platformNames[release.platform]}</span>}</>;
}

function ScheduleCalendar({clips,month,setMonth,available}) {
  const [year,monthNumber] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year,monthNumber-1,1));
  const days = new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
  const offset = (first.getUTCDay()+6)%7;
  const releases = scheduledReels(clips,month);
  const counts = new Map();
  for (const release of releases) counts.set(release.day,(counts.get(release.day) || 0)+1);
  function moveMonth(step) {
    setMonth(new Date(Date.UTC(year,monthNumber-1+step,1)).toISOString().slice(0,7));
  }
  return <section className="gaming-card">
    <div className="gaming-row"><h2>Publishing calendar</h2><div className="gaming-calendar-nav">
      <button type="button" aria-label="Previous month" onClick={()=>moveMonth(-1)}><ChevronLeft size={18} aria-hidden="true"/></button>
      <strong aria-live="polite">{monthFormat.format(first)}</strong>
      <button type="button" aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={18} aria-hidden="true"/></button>
    </div></div>
    <table className="gaming-calendar" aria-label={monthFormat.format(first)}>
      <thead><tr>{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day=><th key={day} scope="col" aria-label={day}>{day.slice(0,3)}</th>)}</tr></thead>
      <tbody>{Array.from({length:Math.ceil((offset+days)/7)},(_,week)=><tr key={week}>
        {Array.from({length:7},(_,weekday)=>{
          const day = week*7+weekday-offset+1;
          if (day<1 || day>days) return <td key={weekday}/>;
          const key = `${month}-${String(day).padStart(2,'0')}`;
          const count = counts.get(key);
          return <td key={weekday}><time dateTime={key}>{day}</time>{count && <span className="gaming-calendar-count" aria-label={`${count} scheduled`}>{count}</span>}</td>;
        })}
      </tr>)}</tbody>
    </table>
    {releases.length ? <ul className="gaming-schedule-list">{releases.map(release=><li key={`${release.id}-${release.platform}-${release.at}`}>
      <strong>{release.title || 'Generated reel'}</strong><div><ReleaseTime release={release}/></div>
    </li>)}</ul> : <p>{available?'No scheduled reels this month.':'Schedule unavailable.'}</p>}
  </section>;
}
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
function Progress({name,value,detail,waiting}) {
  const status = waiting ? 'Awaiting fresh data' : value == null ? 'Not measured' : `${detail ? detail+' · ' : ''}${value}%`;
  if (waiting || value == null) return <p className="gaming-progress"><span>{name}<strong>{status}</strong></span></p>;
  return <label className="gaming-progress"><span>{name}<strong>{status}</strong></span><progress max={100} value={value}/></label>;
}
function Execution({job,events=[],fresh,now,compact=false}) {
  if (!job) return <section className="gaming-card"><h2>Execution</h2><p>No execution reported.</p></section>;
  const running = isProcessing(job);
  const cancelled = ['CANCELED','CANCELLED'].includes(job.state);
  const age = now-Date.parse(job.last_heartbeat_at);
  const heartbeatFresh = Number.isFinite(age) && age >= -30000 && age < 900000;
  const started = Date.parse(job.started_at);
  const stop = running && fresh && heartbeatFresh ? now : Date.parse(job.finished_at || job.last_heartbeat_at);
  const elapsed = Number.isFinite(started) && stop >= started ? Math.floor((stop-started)/60000)+' min' : 'Not reported';
  const step = job.step;
  const clip = step?.clip;
  const current = stages.findIndex(([,keys])=>keys.includes(step?.stage || job.stage));
  const analysis = analysisProgress(job);
  const status = running ? fresh&&heartbeatFresh?'Processing':'Last reported' : cancelled?'Cancelled':job.failed?'Failed':'Completed';
  return <section className="gaming-card"><div className="gaming-row"><h2>{running?'Current execution':'Last execution'}</h2><span className={`gaming-pill${status==='Failed'?' gaming-pill-error':''}`}>{status}</span></div>
    <div className="gaming-source"><Thumbnail id={job.video_id}/><div><h3>{job.title || job.video_id || job.job_id}</h3>{job.workflow_version && <p>{job.workflow_version}</p>}{!compact && <External href={sourceLink(job.video_id)}>Source video</External>}</div></div>
    {!compact && <div className="gaming-step-scroll" role="region" aria-label="Processing steps" tabIndex={0}>
      <ol className="gaming-steps" role="list">{stages.map(([name,keys],index)=>{
        const selected = current===index;
        const reported = events.some(event=>keys.includes(event.stage));
        return <li key={name} aria-current={selected?'step':undefined}>
          <span className="gaming-step-number">{index+1}</span><strong>{name}</strong>
          {selected ? <small>{running?'Current step':'Last step'}</small> : reported && <small>Reported</small>}
        </li>;
      })}</ol>
    </div>}
    <div className="gaming-step"><p>{running?'Current step':'Last step'}</p><strong>{step?.name || (job.stage && running ? label(job.stage) : 'Not reported')}</strong>{compact && clip && <span>Clip {clip.number} of {clip.total}</span>}</div>
    {!compact && clip && <Progress name="Clip position" value={Math.floor(clip.number/clip.total*100)} detail={`${clip.number}/${clip.total}`}/>}
    {step?.stageProgress != null && !(step.stage==='ANALYZING' && analysis) && <Progress name="Step progress" value={step.stageProgress}/>}
    {analysis && <Progress name="Segments analysed" value={analysis.percent} detail={`${analysis.completed} / ${analysis.total}`}/>}
    {job.overall != null && <Progress name="Overall progress" value={job.overall}/>}
    {!compact && <>
    <dl className="gaming-facts">
      <div><dt>Elapsed</dt><dd>{elapsed}</dd></div><div><dt>Last heartbeat</dt><dd>{time(job.last_heartbeat_at)}</dd></div>
      <div><dt>Execution</dt><dd>{job.execution_id || '—'}</dd></div><div><dt>Retries</dt><dd>{job.retry_count ?? '—'}</dd></div>
    </dl>
    <details><summary>Execution details</summary>
      <dl className="gaming-facts">
        <div><dt>Current segment</dt><dd>{job.current_segment ?? 'Not reported'}</dd></div>
        <div><dt>Duration / resolution</dt><dd>{job.duration_seconds ? job.duration_seconds+' s' : '—'} / {job.resolution || '—'}</dd></div>
        <div><dt>Size / downloaded</dt><dd>{job.size_bytes ? Math.round(job.size_bytes/1e6)+' MB' : '—'} / {job.downloaded_mb != null ? job.downloaded_mb+' MB' : '—'}</dd></div>
        <div><dt>Source</dt><dd>{job.source_reused === true ? 'Existing source reused' : 'Reuse not reported'}</dd></div>
        <div><dt>Download speed / ETA</dt><dd>{job.download_speed || '—'} / {job.download_eta || '—'}</dd></div>
        <div><dt>Selected / limit</dt><dd>{job.clips_selected ?? '—'} / {job.max_clips ?? '—'}</dd></div>
        <div><dt>Latest reported milestone</dt><dd>{events[0] ? label(events[0].stage)+' · '+time(events[0].created_at || events[0].createdAt) : 'Not reported'}</dd></div>
      </dl>
    </details>
    <div className="gaming-row gaming-run"><External href={runLink(job)}>Open execution</External></div></>}
  </section>;
}
function Reel({clip}) {
  const [failedCover,setFailedCover]=useState([]);
  const thumbnail = clip.youtube ? 'https://i.ytimg.com/vi/'+clip.youtube.id+'/mqdefault.jpg' : null;
  const cover = [clip.cover,thumbnail].find(url=>url&&!failedCover.includes(url));
  return <article className="gaming-reel">
    {cover ? <img src={cover} alt="" loading="lazy" onError={()=>setFailedCover(previous=>[...previous,cover])}/> : <div className="gaming-placeholder"><Clapperboard size={24} aria-hidden="true"/></div>}
    <h3>{clip.title || 'Generated reel'}</h3>
    {(clip.category || clip.duration_seconds || clip.quality_score != null || clip.editing_engine) && <p>{[clip.category,clip.duration_seconds && clip.duration_seconds+' s',clip.quality_score != null && clip.quality_score+'/100',clip.editing_engine].filter(Boolean).join(' · ')}</p>}
    {clip.schedule?.map(release=><div className="gaming-release" key={`${release.platform}-${release.at}`}><ReleaseTime release={release}/></div>)}
    {(clip.instagram || clip.youtube) && <ul>{Object.keys(platformNames).filter(platform=>clip[platform]).map(platform=><li key={platform}><External href={clip[platform].url}>{platformNames[platform]}</External></li>)}</ul>}
    {(clip.preview || clip.caption || clip.hashtags || clip.streamer || clip.start_seconds != null || clip.created_at) && <details><summary>Reel details</summary>
      {clip.preview && <External href={clip.preview}>Open private preview</External>}
      {clip.caption && <p>{clip.caption}</p>}{clip.hashtags && <p>{clip.hashtags}</p>}
      {clip.streamer && <p>Creator: {clip.streamer}</p>}
      {clip.start_seconds != null && <p>Source: {clip.start_seconds}–{clip.end_seconds ?? '—'} s</p>}
      {clip.created_at && <p>{time(clip.created_at)}</p>}
    </details>}
  </article>;
}
export default function FunnyReelsStudio({initial,refresh}) {
  const [data,setData]=useState(initial),[error,setError]=useState(''),[now,setNow]=useState(0);
  const [section,setSection]=useState('dashboard'),[filter,setFilter]=useState('ready'),[limit,setLimit]=useState(8),[severity,setSeverity]=useState('All'),[revision,reload]=useState(0);
  const [month,setMonth]=useState(()=>studioDay(new Date()).slice(0,7));
  useEffect(()=>{
    let disposed=false, timer, controller;
    async function poll(){
      if(disposed || controller || document.hidden)return;
      controller=new AbortController();
      try {
        const snapshot=await adminApi('funny-reels',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});
        if(!disposed){setData(previous=>newerGamingSnapshot(previous,snapshot));setError('');}
      } catch {
        if(!disposed)setError('Collector refresh failed.');
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
  const job=dashboardExecution(data?.jobs || []);
  const clips=data?.clips || [];
  const filteredClips=clips.filter(clip=>{
    const status=reelStatus(clip);
    return status===filter || filter==='published' && Boolean(clip.instagram || clip.youtube);
  });
  const activity=(data?.events || []).filter(event=>severity==='All' || (severity==='Errors'&&/FAIL|ERROR/i.test(event.event_type)) ||
    (severity==='Warnings'&&/WARN|RETRY/i.test(event.event_type)) || (severity==='Milestones'&&!/FAIL|ERROR|WARN|RETRY/i.test(event.event_type)));
  return <div className="gaming-studio">
    <div className="gaming-row gaming-status"><div role="status"><span className="gaming-pill">{fresh?'Collector online':data?.available?'Collector stale':error||data?'Collector unavailable':'Connecting to collector'}</span>{data?.version && <time dateTime={data.version}>{time(data.version)} IST</time>}</div><button type="button" onClick={()=>reload(value=>value+1)}><RefreshCw size={15} aria-hidden="true"/> Refresh</button></div>
    {error && <p className="gaming-alert" role="alert">{error}</p>}
    <Tabs label="Gaming Studio" items={sectionTabs} value={section} onChange={setSection}>
      {section==='dashboard' && <>
        <div className="gaming-summary">{[[Activity,'Processing',active.length],[ListVideo,'In queue',queue.length],[Clapperboard,'Published',clips.filter(clip=>clip.instagram || clip.youtube || clip.published).length]].map(([Icon,name,count])=><section className="gaming-card" key={name}><div className="gaming-row"><h2>{name}</h2><Icon size={18} aria-hidden="true"/></div><strong>{data?.available?count:'—'}</strong></section>)}</div>
        {job && isProcessing(job) && <Execution job={job} fresh={fresh} now={now} compact/>}
        <ScheduleCalendar clips={clips} month={month} setMonth={setMonth} available={data?.available}/>
        <div className="gaming-side"><section className="gaming-card"><div className="gaming-row"><h2>Upcoming queue</h2><span className="gaming-pill">Intake paused</span></div>{queue.length ? <ol>{queue.map(item=><li key={item.job_id}><strong>{item.title || item.video_id || item.job_id}</strong><p>{time(item.requested_at || item.createdAt)} · {label(item.state)}</p><External href={sourceLink(item.video_id)}>Open source</External></li>)}</ol> : <p>No queued videos.</p>}</section>
          <section className="gaming-card"><h2>System health</h2><dl className="gaming-facts">{[['n8n',data?.n8nFresh&&fresh?'Recent status':'Status unavailable'],['Docker / n8n container',fresh&&data?.resources?.docker?'Running':'Not confirmed']].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><Progress name="Disk used" value={data?.resources?.disk} waiting={!fresh || data?.resources?.disk==null}/></section>
        </div>
      </>}
      {section==='execution' && <Execution job={job} events={(data?.events || []).filter(event=>event.job_id===job?.job_id && String(event.execution_id)===String(job?.execution_id))} fresh={fresh} now={now}/>}
      {section==='reels' && <Tabs label="Reel status" items={reelTabs} value={filter} onChange={value=>{setFilter(value);setLimit(8);}}>
        <section className="gaming-card">
          {filteredClips.length ? <div className="gaming-library">{filteredClips.slice(0,limit).map(clip=><Reel key={clip.id} clip={clip}/>)}</div>:<p>{data?.available?'No reels in this view.':'Reel data unavailable.'}</p>}
          {filteredClips.length>limit && <button type="button" onClick={()=>setLimit(n=>n+8)}>Show more reels</button>}
        </section>
      </Tabs>}
      {section==='logs' && <section className="gaming-card"><div className="gaming-row"><h2>Logs</h2><select aria-label="Filter logs" value={severity} onChange={event=>setSeverity(event.target.value)}>{['All','Errors','Warnings','Milestones'].map(value=><option key={value}>{value}</option>)}</select></div>
        {activity.length ? <ol className="gaming-activity">{activity.slice(0,20).map(event=><li key={event.id}><strong>{label(event.stage)}</strong><span>{label(event.event_type)}</span><time dateTime={event.created_at || event.createdAt}>{time(event.created_at || event.createdAt)}</time><External href={runLink(event)}>Run {event.execution_id}</External></li>)}</ol> : <p>No matching logs.</p>}
      </section>}
    </Tabs>
  </div>;
}
