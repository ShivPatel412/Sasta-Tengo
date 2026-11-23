'use client';
import {useEffect,useRef,useState} from 'react';
import {adminApi as api,jsonRequest} from '../../../lib/dashboard-client.mjs';
import {JOB_PAGE_SIZE,JOB_STATUSES,jobLabel,jobScore,jobUrl,jobsQuery,draftText,jobActivity,localDateInput} from '../../../lib/job-hunter-view.mjs';
import {Briefcase,Search,Check,X,ExternalLink,RefreshCw,Sparkles,ShieldCheck,Bot,FileText,MapPin,ChevronLeft,ChevronRight,CalendarDays} from './dashboard-icons';
import {Bell} from '@phosphor-icons/react/dist/csr/Bell';
import {DownloadSimple} from '@phosphor-icons/react/dist/csr/DownloadSimple';
import {Clock} from '@phosphor-icons/react/dist/csr/Clock';
import './job-hunter.css';

const sources=['all','linkedin','indeed','wellfound','remoteok','weworkremotely','greenhouse','lever','rss','manual'];
const tabs=['Overview','Match Analysis','Documents','Activity'];
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : 'Not reported';
function CompanyMark({company}) { return <span className="jh-company" aria-hidden="true">{(company||'?').slice(0,2).toUpperCase()}</span>; }
function Score({job}) {const score=jobScore(job);return <span className={`jh-match ${score && score.score>=80?'high':''}`}>{score ? <><Sparkles size={13}/>{score.score}% match</>:'Not scored'}</span>;}
function Empty({title,children}) {return <div className="jh-empty"><Briefcase size={27}/><h3>{title}</h3><p>{children}</p></div>;}

export default function JobHunterDashboard({readOnly,refresh,jobId,user}) {
  const [stats,setStats]=useState(null),[jobs,setJobs]=useState([]),[total,setTotal]=useState(0);
  const [page,setPage]=useState(1),[search,setSearch]=useState(''),[query,setQuery]=useState('');
  const [source,setSource]=useState('all'),[status,setStatus]=useState(''),[match,setMatch]=useState('');
  const [selectedId,setSelectedId]=useState(jobId||null),[details,setDetails]=useState(null),[tab,setTab]=useState('Overview');
  const [loading,setLoading]=useState(true),[detailLoading,setDetailLoading]=useState(false),[configured,setConfigured]=useState(null);
  const [listError,setListError]=useState(''),[detailError,setDetailError]=useState(''),[statsError,setStatsError]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[agentOpen,setAgentOpen]=useState(false),[prompt,setPrompt]=useState(''),[tasks,setTasks]=useState([]),[taskError,setTaskError]=useState('');
  const [applyOpen,setApplyOpen]=useState(false),[appliedDate,setAppliedDate]=useState(()=>localDateInput());
  const [editing,setEditing]=useState(null),[draftInput,setDraftInput]=useState('');
  const actionLock=useRef(false),detailRef=useRef(null),applyRef=useRef(null),applyTrigger=useRef(null);
  const selected=details?.id===selectedId?details:jobs.find(j=>j.id===selectedId);
  const score=jobScore(selected),writable=!readOnly && configured===true;
  const pageCount=Math.max(1,Math.ceil(total/JOB_PAGE_SIZE));

  useEffect(()=>{if(search===query)return;const timer=setTimeout(()=>{setQuery(search);setPage(1);},300);return()=>clearTimeout(timer);},[search,query]);
  useEffect(()=>{
    const controller=new AbortController();setStatsError('');
    api('jobs?view=stats',{signal:controller.signal}).then(setStats).catch(e=>{if(!controller.signal.aborted){setStats(null);setStatsError(e.message);}});
    return()=>controller.abort();
  },[refresh,revision]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setListError('');
    api(jobsQuery({page,search:query,source,status,match}),{signal:controller.signal}).then(data=>{
      if(controller.signal.aborted)return;
      setConfigured(data.configured!==false);setJobs(data.jobs||[]);setTotal(data.total||0);
      if(page>1 && page>Math.max(1,Math.ceil((data.total||0)/JOB_PAGE_SIZE))){setPage(Math.max(1,Math.ceil((data.total||0)/JOB_PAGE_SIZE)));return;}
      setSelectedId(current=>data.jobs?.some(j=>j.id===current)?current:jobId===current?current:data.jobs?.[0]?.id||null);
    }).catch(e=>{if(!controller.signal.aborted){setListError(e.message);setJobs([]);setTotal(0);setConfigured(null);setSelectedId(null);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[page,query,source,status,match,refresh,revision,jobId]);
  useEffect(()=>{
    setDetails(null);setDetailError('');setEditing(null);setApplyOpen(false);
    if(!selectedId){setDetailLoading(false);return;}
    const controller=new AbortController();setDetailLoading(true);
    api(`jobs?job_id=${encodeURIComponent(selectedId)}`,{signal:controller.signal}).then(data=>{
      if(controller.signal.aborted)return;
      if(!data.job)throw new Error('Job details are not available.');setDetails(data.job);
    }).catch(e=>{if(!controller.signal.aborted)setDetailError(e.message);}).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});
    return()=>controller.abort();
  },[selectedId,refresh,revision]);
  useEffect(()=>{
    if(!agentOpen)return;const controller=new AbortController();setTaskError('');
    api('jobs?view=tasks',{signal:controller.signal}).then(data=>setTasks(data.tasks||[])).catch(e=>{if(!controller.signal.aborted)setTaskError(e.message);});
    return()=>controller.abort();
  },[agentOpen,refresh,revision]);
  useEffect(()=>{
    if(!applyOpen)return;applyRef.current?.showModal();
    return()=>{applyRef.current?.close();applyTrigger.current?.focus();};
  },[applyOpen]);

  async function mutate(payload,message) {
    if(!writable||actionLock.current)return false;
    actionLock.current=true;setBusy(true);setError('');setNotice('');
    try {
      const result=await api('jobs',jsonRequest(payload.action==='agent_task'||payload.action==='analyze_job'?'POST':'PATCH',payload));
      if(result.configured===false || result.success===false)throw new Error('This action is not configured. No change was confirmed.');
      setNotice(result.message||message);setRevision(n=>n+1);return true;
    }catch(e){setError(e.message);return false;}
    finally{actionLock.current=false;setBusy(false);}
  }
  function choose(job){setSelectedId(job.id);setTab('Overview');if(window.innerWidth<1100)requestAnimationFrame(()=>detailRef.current?.scrollIntoView({behavior:'instant',block:'start'}));}
  function reset(){setSearch('');setQuery('');setSource('all');setStatus('');setMatch('');setPage(1);}
  function download(draft){
    const url=URL.createObjectURL(new Blob([draftText(draft)],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`${jobLabel(draft.kind)}-${(selected?.company||'job').replace(/[^a-z0-9-]/gi,'-')}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setNotice('Draft downloaded as text. Review it before sending.');
  }
  function print(draft){
    const win=window.open('','_blank','width=850,height=900');
    if(!win){setError('Allow the print window to save this document as PDF.');return;}
    win.opener=null;win.document.title=`${jobLabel(draft.kind)} draft`;const pre=win.document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font:14px/1.6 system-ui;padding:32px;color:#222';pre.textContent=draftText(draft);win.document.body.append(pre);win.document.close();win.focus();win.print();
  }
  function handleTabs(event,index){
    let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;
    if(next!==undefined){event.preventDefault();setTab(tabs[next]);document.getElementById(`jh-tab-${next}`)?.focus();}
  }
  const metrics=[['Jobs found',stats?.total,Briefcase,'Across your connected sources'],['Ready to review',stats?.review_queue,FileText,'Your next opportunities'],['Applied',stats?.applications_submitted,Check,'Applications you’ve recorded'],['Interviews',stats?.interviews_scheduled,CalendarDays,'A step closer to what’s next']];
  return <section className="job-hunter-dashboard" aria-label="Job Hunter workspace">
    <header className="jh-heading"><div><span className="jh-eyebrow">YOUR NEXT CHAPTER</span><h1>Job Hunter<span>.</span></h1><p>A little less searching. A better next opportunity.</p></div><div className="jh-header-actions"><button className="jh-button" aria-label="Refresh jobs" onClick={()=>setRevision(n=>n+1)} disabled={loading||busy}><RefreshCw size={16}/><span>Refresh</span></button><details className="jh-notifications"><summary aria-label="Notifications"><Bell size={21}/></summary><div><strong>Workspace updates</strong><p>{notice||'No new notifications in this session.'}</p><small>Application history is in each job’s Activity tab.</small></div></details><a className="jh-avatar" href="/dashboard/settings" aria-label="Open profile settings">{(user?.name||'Shiv Patel').split(' ').map(s=>s[0]).slice(0,2).join('')}</a></div></header>
    <div className="jh-summary">{metrics.map(([label,value,Icon,caption],i)=><article className={`jh-stat jh-stat-${i}`} key={label}><div><span>{label}</span><Icon size={19}/></div><strong>{value??'—'}</strong><small>{caption}</small></article>)}</div>
    {statsError&&<div className="jh-feedback" role="status">Summary unavailable: {statsError} <button onClick={()=>setRevision(n=>n+1)}>Retry</button></div>}
    {configured===false&&<div className="jh-feedback" role="status"><ShieldCheck size={18}/><span>Job storage isn’t connected yet. Your jobs will appear here once the existing integration is configured.</span></div>}
    {readOnly&&<div className="jh-feedback"><ShieldCheck size={18}/> Review mode — you can browse and download; changes are paused.</div>}
    {notice&&<div className="jh-feedback success" role="status"><Check size={17}/>{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}><X size={16}/></button></div>}
    {error&&<div className="jh-feedback error" role="alert">{error}<button aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
    <div className="jh-section-heading"><div><h2>Your opportunities <span>{loading?'…':total}</span></h2><p>Find the right fit. Make your next move.</p></div><button className={`jh-button ${agentOpen?'selected':''}`} aria-expanded={agentOpen} aria-controls="jh-agent" onClick={()=>setAgentOpen(v=>!v)}><Bot size={18}/> AI assistant</button></div>
    {agentOpen&&<section className="jh-agent" id="jh-agent"><div><h3>A hand with the next step</h3><p>Save a request for your existing agent. Execution still depends on the connected runner.</p></div><form onSubmit={async e=>{e.preventDefault();if(await mutate({action:'agent_task',message:prompt,reason:'Job Hunter workspace'},'Request saved for review.'))setPrompt('');}}><label className="sr-only" htmlFor="jh-prompt">Agent request</label><input id="jh-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="e.g. Prepare interview questions for this role" required maxLength={4000}/><button className="jh-button primary" disabled={!writable||busy||!prompt.trim()}>Save request</button></form>{taskError&&<p role="alert">{taskError}</p>}<ul>{tasks.slice(0,5).map(t=><li key={t.id}><span>{t.message}</span><span className="jh-status">{jobLabel(t.status)}</span></li>)}</ul></section>}
    <div className="jh-workspace">
      <section className="jh-list-panel" id="jh-listings" tabIndex={-1} aria-label="Job listings">
        <div className="jh-list-toolbar"><label className="jh-search"><Search size={18}/><span className="sr-only">Search jobs</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, company or location…" type="search"/></label><div className="jh-filters"><label><span>Source</span><select aria-label="Source" value={source} onChange={e=>{setSource(e.target.value);setPage(1);}}>{sources.map(s=><option key={s} value={s}>{s==='all'?'All sources':jobLabel(s)}</option>)}</select></label><label><span>Status</span><select aria-label="Status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All statuses</option>{JOB_STATUSES.map(s=><option key={s} value={s}>{jobLabel(s)}</option>)}</select></label><label><span>AI match</span><select aria-label="AI match" value={match} onChange={e=>{setMatch(e.target.value);setPage(1);}}><option value="">Any match</option><option value="high">High · 80%+</option><option value="moderate">60–79%</option><option value="low">Below 60%</option></select></label></div></div>
        <div className="jh-results-label"><span>{loading?'Finding your opportunities…':`${total} ${total===1?'opportunity':'opportunities'}`}</span>{(search||source!=='all'||status||match)&&<button onClick={reset}>Clear filters</button>}</div>
        <div className="jh-job-list" aria-busy={loading}>
          {loading?<div className="jh-skeletons" role="status" aria-label="Loading jobs">{[1,2,3,4].map(n=><div className="jh-skeleton" key={n}><i/><i/><i/></div>)}</div>:listError?<div className="jh-empty" role="alert"><h3>Jobs couldn’t load</h3><p>{listError}</p><button className="jh-button" onClick={()=>setRevision(n=>n+1)}>Try again</button></div>:jobs.length===0?<Empty title={query||source!=='all'||status||match?'No matching opportunities':'Your next opportunity starts here'}>{query||source!=='all'||status||match?<><span>Try another search or broaden your filters.</span><button className="jh-button" onClick={reset}>Clear filters</button></>:'New jobs will appear here when your connected sources find them.'}</Empty>:jobs.map(job=><button type="button" className={`jh-job ${selectedId===job.id?'active':''}`} key={job.id} aria-pressed={selectedId===job.id} onClick={()=>choose(job)}><div className="jh-job-top"><CompanyMark company={job.company}/><span className="jh-job-title"><strong>{job.title}</strong><span>{job.company||'Company not reported'}</span></span><ChevronRight size={17}/></div><div className="jh-job-meta"><span><MapPin size={13}/>{job.location||'Location not reported'}</span><span>{jobLabel(job.source)}</span></div><div className="jh-job-bottom"><Score job={job}/><span className="jh-status">{jobLabel(job.status)}</span></div></button>)}
        </div>
        <nav className="jh-pagination" aria-label="Job pages"><span>{total?`${(page-1)*JOB_PAGE_SIZE+1}–${Math.min(page*JOB_PAGE_SIZE,total)} of ${total}`:'0 opportunities'}</span><div><button aria-label="Previous page" disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button><span>Page {page} of {pageCount}</span><button aria-label="Next page" disabled={loading||page>=pageCount} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button></div></nav>
      </section>
      <section className="jh-detail-panel" ref={detailRef} aria-label="Selected job details">
        {!selectedId?<Empty title="A closer look at your next move">Select an opportunity to explore the role, your match and application documents.</Empty>:<>
          <div className="jh-detail-heading"><button className="jh-back-to-jobs" onClick={()=>{document.getElementById('jh-listings')?.focus({preventScroll:true});document.getElementById('jh-listings')?.scrollIntoView({behavior:'instant',block:'start'});}}><ChevronLeft size={14}/> Back to listings</button><div className="jh-detail-company"><CompanyMark company={selected?.company}/><div><span className="jh-eyebrow">{selected?.company||'JOB DETAILS'}</span><h2>{selected?.title||'Loading opportunity…'}</h2><p><MapPin size={14}/>{selected?.location||'Location not reported'}<span>·</span>{jobLabel(selected?.source)}</p></div></div><div className="jh-detail-badges"><span className="jh-status">{jobLabel(selected?.status)||'Loading'}</span><span><Clock size={13}/> Found {date(selected?.created_at)}</span></div></div>
          <div className="jh-tabs" role="tablist" aria-label="Job details">{tabs.map((name,i)=><button key={name} id={`jh-tab-${i}`} role="tab" aria-selected={tab===name} aria-controls="jh-tab-panel" tabIndex={tab===name?0:-1} onKeyDown={e=>handleTabs(e,i)} onClick={()=>setTab(name)}>{name}{name==='Documents'&&details?.drafts?.length>0&&<span>{details.drafts.length}</span>}</button>)}</div>
          <div className="jh-detail-body" id="jh-tab-panel" role="tabpanel" aria-labelledby={`jh-tab-${tabs.indexOf(tab)}`} tabIndex={0} aria-busy={detailLoading}>
            {detailLoading?<div className="jh-skeletons" role="status">Loading job details…<div className="jh-skeleton"><i/><i/><i/></div></div>:detailError?<div className="jh-empty" role="alert"><h3>Details couldn’t load</h3><p>{detailError}</p><button className="jh-button" onClick={()=>setRevision(n=>n+1)}>Retry details</button></div>:details&&<>
              {tab==='Overview'&&<><div className="jh-match-banner"><div><span className="jh-ai-icon"><Sparkles size={23}/></span><div><strong>{score?score.score>=80?'This could be a great fit': 'Your match at a glance':'Get to know your fit'}</strong><p>{score?'Based on your saved AI match analysis.':'Request an analysis against your verified profile.'}</p></div></div><button onClick={()=>setTab('Match Analysis')} aria-label="View match analysis">{score?<><strong>{score.score}<small>%</small></strong><span>AI match</span></>:<Sparkles size={24}/>}</button></div><h3>About the role</h3><div className="jh-description">{details.description||'This source hasn’t provided a job description yet. Open the original listing for more information.'}</div>{score?.matched_skills?.length>0&&<><h3>Skills in common</h3><div className="jh-skills">{score.matched_skills.map(s=><span key={s}><Check size={12}/>{s}</span>)}</div></>}<div className="jh-role-facts"><div><span>Source</span><strong>{jobLabel(details.source)}</strong></div><div><span>Posted</span><strong>{date(details.published_at)}</strong></div><div><span>Application status</span><strong>{jobLabel(details.status)}</strong></div><div><span>Location</span><strong>{details.location||'Not reported'}</strong></div></div></>}
              {tab==='Match Analysis'&&(score?<><div className="jh-analysis-title"><div><span className="jh-eyebrow">AI MATCH ANALYSIS</span><h3>Your fit, a little clearer.</h3><p>Use this as a guide. Review the role yourself.</p></div><strong>{score.score}<small>%</small></strong></div><h3>Score breakdown</h3><div className="jh-breakdown">{Object.entries(score.breakdown||{}).map(([key,value])=><div key={key}><div><span>{jobLabel(key)}</span><strong>{value}%</strong></div><meter min="0" max="100" value={value} aria-label={`${jobLabel(key)} score`}/></div>)}</div><h3>Matched skills</h3><div className="jh-skills">{(score.matched_skills||[]).map(s=><span key={s}><Check size={12}/>{s}</span>)}{!score.matched_skills?.length&&<p>No matched skills reported.</p>}</div>{score.gaps?.length>0&&<><h3>Room to grow</h3><ul className="jh-bullets">{score.gaps.map(s=><li key={s}>{s}</li>)}</ul></>}<h3>Why this match?</h3><ul className="jh-bullets">{(score.reasons||[]).map(r=><li key={r}>{r}</li>)}</ul><p className="jh-footnote">Eligibility: {jobLabel(score.eligibility)} · Salary fit: {jobLabel(score.salary_fit)}</p></>:<Empty title="This job hasn’t been scored yet">Request an AI analysis below. A saved request does not mean the runner has started.</Empty>)}
              {tab==='Documents'&&<><div className="jh-docs-intro"><h3>A thoughtful first impression.</h3><p>Your tailored drafts, ready for a human review.</p></div>{!details.drafts?.length?<Empty title="No documents yet">Ask your existing agent to prepare a tailored CV and application draft.</Empty>:details.drafts.map(d=><article className="jh-document" key={d.id}><div><span className="jh-doc-icon"><FileText size={23}/></span><div><h4>{jobLabel(d.kind)} draft</h4><p>{date(d.created_at)} · Review required</p></div></div><p>{d.content?.headline||d.content?.summary||d.content?.cover_letter?.slice(0,180)||'Prepared draft — review before sending.'}</p><div className="jh-document-actions"><button className="jh-button" onClick={()=>download(d)}><DownloadSimple size={15}/> Download TXT</button><button className="jh-button" onClick={()=>print(d)}>Print / PDF</button><button className="jh-text-button" disabled={!writable||busy} onClick={()=>{setEditing(d);setDraftInput(JSON.stringify(d.content,null,2));}}>Edit draft</button></div>{editing?.id===d.id&&<form className="jh-draft-editor" onSubmit={async e=>{e.preventDefault();let content;try{content=JSON.parse(draftInput);}catch{setError('Enter valid draft JSON before saving. Your edits are kept.');return;}if(await mutate({action:'update_draft',draft_id:d.id,content},'Draft saved. Review is still required.'))setEditing(null);}}><label htmlFor="jh-draft-input">Draft content (JSON)</label><textarea id="jh-draft-input" value={draftInput} onChange={e=>setDraftInput(e.target.value)} rows={12} required/><div><button className="jh-button primary" disabled={busy||!writable}>Save draft</button><button type="button" className="jh-button" onClick={()=>setEditing(null)}>Cancel</button></div></form>}</article>)}<button className="jh-button" disabled={!writable||busy} onClick={()=>mutate({action:'agent_task',job_id:selectedId,message:`Prepare tailored CV and application drafts for job ${selectedId}`,reason:'Dashboard document request'},'Draft request saved. Workflow execution is not confirmed.')}><Bot size={16}/> Request tailored drafts</button></>}
              {tab==='Activity'&&<><h3>The story so far</h3><p className="jh-subtle">Recorded events for this opportunity.</p><ol className="jh-timeline">{jobActivity(details).map(e=><li key={e.id}><span><Check size={12}/></span><div><strong>{e.title}</strong><time dateTime={e.at}>{date(e.at)}</time></div></li>)}</ol>{jobActivity(details).length===0&&<p>No timestamped activity is available.</p>}<label className="jh-status-control">Application status<select value={details.status} disabled={!writable||busy} onChange={e=>{if(e.target.value==='applied')setApplyOpen(true);else mutate({action:'update_status',job_id:selectedId,status:e.target.value},'Application status updated.');}}>{JOB_STATUSES.map(s=><option key={s} value={s}>{jobLabel(s)}</option>)}</select></label><p className="jh-footnote">Applications are recorded here after you submit externally.</p></>}
            </>}
          </div>
          {details&&!detailLoading&&!detailError&&<footer className="jh-detail-footer"><div className="jh-primary-actions">{jobUrl(details.url)?<a className="jh-button primary" href={jobUrl(details.url)} target="_blank" rel="noopener noreferrer">Open application <ExternalLink size={16}/></a>:<span className="jh-subtle">No application link available.</span>}<button className="jh-button" ref={applyTrigger} disabled={!writable||busy||details.status==='applied'} onClick={()=>setApplyOpen(true)}><Check size={16}/>{details.status==='applied'?'Applied':'Mark as applied'}</button></div><div className="jh-secondary-actions"><button disabled={!writable||busy} onClick={()=>mutate({action:'update_status',job_id:selectedId,status:'approved'},'Saved for review. No application was submitted.')}><Check size={14}/>Save for review</button><button disabled={!writable||busy} onClick={()=>mutate({action:'analyze_job',job_id:selectedId},'Analysis request saved. Workflow execution is not confirmed.')}><Sparkles size={14}/>Analyze match</button><button disabled={!writable||busy} onClick={()=>mutate({action:'update_status',job_id:selectedId,status:'archived'},'Job archived.')}><X size={14}/>Archive</button></div><p><ShieldCheck size={12}/> You’re in control. Applications are never sent by these buttons.</p></footer>}
        </>}
      </section>
    </div>
    {applyOpen&&<dialog className="jh-dialog" ref={applyRef} onCancel={()=>setApplyOpen(false)} aria-labelledby="jh-apply-title"><form onSubmit={async e=>{e.preventDefault();if(await mutate({action:'mark_applied',job_id:selectedId,applied_at:new Date(`${appliedDate}T12:00:00`).toISOString()},'Application recorded. No external application was submitted.'))setApplyOpen(false);}}><h2 id="jh-apply-title">Already sent your application?</h2><p>This records an application you submitted on the employer’s website.</p><label htmlFor="jh-applied-date">Application date</label><input type="date" id="jh-applied-date" value={appliedDate} max={localDateInput()} onChange={e=>setAppliedDate(e.target.value)} required/><div><button type="button" className="jh-button" onClick={()=>setApplyOpen(false)}>Cancel</button><button className="jh-button primary" disabled={busy||!writable}>Confirm application</button></div></form></dialog>}
  </section>;
}
