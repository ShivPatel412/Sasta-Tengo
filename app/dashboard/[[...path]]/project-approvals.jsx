'use client';
import {useEffect,useState} from 'react';
import {adminApi as api,jsonRequest} from '../../../lib/dashboard-client.mjs';
import {ArrowRight,Check,ExternalLink,RefreshCw,X} from './dashboard-icons';
import {dateLabel,safeLink} from '../../../lib/dashboard.mjs';

function Draft({row,categories,readOnly,onChanged,local}){
  const [project,setProject]=useState(row.payload),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=row.status==='pending',proof=row.provenance;
  async function review(action){
    if(action==='publish'&&!window.confirm(local?'Approve these details and images to the LOCAL portfolio copy? Your public website will not change.':'Publish these details and images to your public portfolio website?'))return;
    setBusy(true);setError('');
    try{await api('project-drafts/'+row.id,jsonRequest('POST',{revision:row.revision,action,project}));await onChanged();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <article className="workspace-panel approval-card">
    <div className="panel-heading"><div><span className="mini-label">{row.repository}</span><h2>{project.title}</h2></div><span className="badge">{row.status}{row.project_id?' · Existing project':''}</span></div>
    <div className="approval-media"><figure><img src={project.poster} alt={(proof.cover_status==='unavailable'?'Repository preview for ':'AI cover for ')+project.title}/><figcaption>{proof.cover_status==='unavailable'?'Repository preview · AI cover pending':'AI cover · '+proof.image_model}</figcaption></figure>{(project.gallery||[]).map(src=><figure key={src}><img src={src} alt={'Browser screenshot of '+project.title}/><figcaption>Real website capture · {dateLabel(proof.captured_at,true)}</figcaption></figure>)}</div>
    <p className="panel-footnote">Generated {dateLabel(proof.generated_at,true)} · revision {row.revision.slice(0,12)}</p>
    <div className="approval-links">{[['Repository',project.github_url],['Live website',project.live_url]].filter(([,url])=>safeLink(url)).map(([label,url])=><a href={url} key={label} target="_blank" rel="noopener noreferrer">{label}<ExternalLink size={16} aria-hidden="true"/></a>)}</div>
    {proof.warnings.map(w=><p key={w} className="connection-notice">{w}</p>)}
    {pending?<fieldset disabled={busy||readOnly} className="approval-fields"><label>Title<input value={project.title} maxLength={255} onChange={e=>setProject({...project,title:e.target.value})}/></label><label>Description<textarea value={project.description} maxLength={10000} rows={6} onChange={e=>setProject({...project,description:e.target.value})}/></label><div className="approval-field-grid"><label>Project type<select value={project.category} onChange={e=>setProject({...project,category:e.target.value})}>{categories.map(c=><option key={c.category} value={c.category}>{c.name}</option>)}</select></label><label>Technologies, one per line<textarea value={project.technologies.join('\n')} rows={3} onChange={e=>setProject({...project,technologies:e.target.value.split('\n')})}/></label></div></fieldset>:<p>{row.status==='published'?(local?'Approved into the local portfolio copy.':'Published to your public portfolio website.'):'This revision was rejected. A changed repository can create a new draft.'}</p>}
    {error&&<p role="alert" className="feedback error">{error}</p>}
    {pending&&<div className="approval-actions"><button className="button secondary" disabled={busy||readOnly} onClick={()=>review('save')}>Save draft</button><button className="button primary" disabled={busy||readOnly||proof.cover_status==='unavailable'} onClick={()=>review('publish')}><Check size={18} aria-hidden="true"/>{local?'Approve to local portfolio':'Publish to portfolio'}</button><button className="button secondary" disabled={busy||readOnly} onClick={()=>review('reject')}><X size={18} aria-hidden="true"/>Reject</button></div>}
  </article>;
}
export default function ProjectApprovals({readOnly,local=false}){
  const [rows,setRows]=useState([]),[categories,setCategories]=useState([]),[worker,setWorker]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  async function load(){
    const results=await Promise.allSettled([api('project-drafts'),api('categories'),...(local?[api('project-worker')]:[])]);
    if(results[0].status==='fulfilled')setRows(results[0].value.data);
    if(results[1].status==='fulfilled')setCategories(results[1].value);
    if(results[2]?.status==='fulfilled')setWorker(results[2].value);
    setError(results.filter(r=>r.status==='rejected').map(r=>r.reason.message).join(' '));setLoaded(true);
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{if(!worker?.running)return;const timer=setTimeout(load,5000);return()=>clearTimeout(timer);},[worker]);
  async function scan(action='scan'){setBusy(true);setError('');try{await api('project-worker',jsonRequest('POST',{action}));await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="project-approvals"><section className="workspace-panel"><div className="panel-heading"><div><span className="mini-label">{local?'GITHUB → GEMINI → YOUR PORTFOLIO':'GITHUB → DETAILS → YOUR PORTFOLIO'}</span><h2>Your next project, ready to review.</h2></div><a href={local?'https://n8n.shivpatel.in/workflow/ShivProjectGemini01':'https://n8n.shivpatel.in/workflow/znWH2q245LqTt8kK'} target="_blank" rel="noopener noreferrer">Open n8n<ExternalLink size={16}/></a></div><p>Public GitHub repositories become review drafts. Missing artwork and screenshots are marked explicitly.</p>{worker?.image_generation_blocked&&<div className="connection-notice"><div><strong>AI covers are waiting for Gemini quota</strong><p>Details and genuine website captures can still be reviewed. Enable image generation for the Gemini account, then retry covers.</p><button className="button secondary" disabled={busy||worker?.running} onClick={()=>scan('retry-covers')}>Retry AI covers</button></div></div>}<p role="status" className="panel-footnote">{worker?.running?'Preparing project drafts…':worker?.message||(local?'Checking the project worker…':'Imports run in n8n. Open n8n to check execution status or run a manual import.')}{worker?.finished_at?' · '+dateLabel(worker.finished_at,true):''}{worker?.schedule_enabled?' · Automatic checks every hour':''}</p><div className="approval-actions">{local&&<button className="button primary" onClick={()=>scan()} disabled={busy||worker?.running||!worker?.configured}>Check GitHub now<ArrowRight size={18}/></button>}<button className="button secondary" onClick={load} disabled={busy}><RefreshCw size={18}/>Refresh queue</button></div><p className="panel-footnote">{local?'Generation uses the existing Gemini account in n8n. Approval updates only this local portfolio copy.':'GitHub imports with completed covers publish automatically. Incomplete projects stay here for review.'}</p></section>{error&&<p role="alert" className="feedback error">{error}</p>}{loaded&&!rows.length&&<section className="workspace-panel master-empty"><h2>No drafts yet.</h2><p>Open the GitHub workflow in n8n to prepare the first project. Nothing publishes automatically.</p></section>}{rows.map(row=><Draft key={row.id+row.revision+row.updated_at} row={row} categories={categories} readOnly={readOnly} onChanged={load} local={local}/>)}</div>;
}
