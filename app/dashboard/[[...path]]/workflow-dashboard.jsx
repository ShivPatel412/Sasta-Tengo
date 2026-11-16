'use client';
import {useEffect,useRef,useState} from 'react';
import {adminApi as api,jsonRequest} from '../../../lib/dashboard-client.mjs';
import {dateLabel} from '../../../lib/dashboard.mjs';
import {workflowFolderView} from '../../../lib/workflow-folders.mjs';
import {Folder,ChevronRight,ExternalLink,RefreshCw,Search} from './dashboard-icons';

const runMessage={accepted:'n8n accepted this execution request. Check n8n for completion.',rejected:'n8n rejected this execution request. Check the webhook configuration.',uncertain:'The acknowledgement is uncertain. Check n8n before starting another run.',dispatching:'The execution request is being dispatched. Check n8n before starting another run.'};
export default function WorkflowDashboard({readOnly,refresh}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[pending,setPending]=useState(null);
  const [folderId,setFolderId]=useState(null),[search,setSearch]=useState(''),[allExecutions,setAllExecutions]=useState(false);
  useEffect(()=>{
    let active=true,timer;
    async function load(){
      try{const value=await api('workflows');if(active){setData(value);setError('');}}
      catch(e){if(active)setError(e.message);}
      if(active)timer=setTimeout(load,30000);
    }
    load();return()=>{active=false;clearTimeout(timer);};
  },[refresh,revision]);
  async function execute(workflow,retry=null){
    if(busy||readOnly)return;
    if(!retry&&!window.confirm(`Run “${workflow.name}” now? This executes its configured actions in n8n.`))return;
    const requestId=retry||crypto.randomUUID();setPending({workflow,requestId});setBusy(true);setError('');setNotice('');
    try{const result=await api(`workflows/${encodeURIComponent(workflow.id)}/run`,jsonRequest('POST',{requestId}));setNotice(runMessage[result.state]||'Check the execution in n8n.');setPending(null);setRevision(value=>value+1);}
    catch(e){setError(e.message+' Use “Check last request” to safely repeat the same request ID.');}
    finally{setBusy(false);}
  }
  const browserHeading=useRef(null);
  function openFolder(id){setFolderId(id);setSearch('');requestAnimationFrame(()=>browserHeading.current?.focus());}
  const workflows=data?.data||[],view=workflowFolderView(workflows,data?.folders||[],folderId,search),live=!error&&data?.monitoringAvailable;
  const executions=data?.executions||[],recent=allExecutions?executions:executions.slice(0,5);
  const metrics=[['Total workflows',data?workflows.length:'—','Across your Personal workspace'],['Published',data?workflows.filter(row=>row.active).length:'—',live?'Current workflow configuration':'Last synced configuration'],['Runs today',live?data.today?.total??'—':'—','Today in India'],['Failed today',live?data.today?.errors??'—':'—','Errors and crashed executions']];
  return <section className="management-panel workflow-dashboard">
    {error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback notice" role="status">{notice}</p>}
    {data&&!live&&<p className="panel-footnote" role="status">Live monitoring is unavailable. Showing last-known folders and workflows; live execution totals are unavailable.</p>}
    <div className="metric-grid" aria-label="Workflow summary">{metrics.map(([label,value,detail])=><article className="metric-card" key={label}><span className="metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div>
    <div className="management-tools"><span className="panel-footnote">{data?.collectedAt?'Synced '+dateLabel(data.collectedAt,true)+' · updates every 30 seconds':'Connecting to n8n…'}</span><button className="button secondary" onClick={()=>setRevision(value=>value+1)} disabled={busy}><RefreshCw size={16} aria-hidden="true"/>Refresh workflows</button>{pending&&<button className="button secondary" disabled={busy||readOnly} onClick={()=>execute(pending.workflow,pending.requestId)}>Check last request</button>}<a className="button secondary" href="https://n8n.shivpatel.in/projects/UWCIZeLCvuUGM9uC/workflows" target="_blank" rel="noopener noreferrer">Open n8n<ExternalLink size={16} aria-hidden="true"/></a></div>
    <section className="workspace-panel" aria-labelledby="recent-workflow-heading"><div className="panel-heading"><div><h2 id="recent-workflow-heading">Recent executions</h2><p className="panel-footnote">{allExecutions?'Latest '+executions.length+' executions':'Five latest executions'} from your Personal workspace.</p></div>{executions.length>5&&<button className="button secondary small" onClick={()=>setAllExecutions(value=>!value)}>{allExecutions?'Show latest five':'View all '+executions.length}</button>}</div>
      <ul className="workflow-executions">{recent.map(run=><li key={run.id}><a href={'https://n8n.shivpatel.in/workflow/'+encodeURIComponent(run.workflow_id)+'/executions/'+encodeURIComponent(run.id)} target="_blank" rel="noopener noreferrer">{run.name||workflows.find(row=>row.id===String(run.workflow_id))?.name||'Workflow'}<small>Execution #{run.id}</small></a><span className="badge">{run.status}</span><time dateTime={run.started_at}>{dateLabel(run.started_at,true)}</time></li>)}</ul>
      {!recent.length&&<p className="panel-footnote">{data?'No executions have been collected yet.':'Loading execution history…'}</p>}
    </section>
    <section className="workspace-panel workflow-browser" aria-labelledby="workflow-browser-heading">
      <div className="panel-heading"><div><h2 id="workflow-browser-heading" ref={browserHeading} tabIndex={-1}>Browse workflows</h2><p className="panel-footnote">Your n8n folders, with all nested folders included.</p></div><label className="workflow-search"><span className="sr-only">Search workflows across all folders</span><Search size={18} aria-hidden="true"/><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search all workflows"/></label></div>
      <nav className="workflow-breadcrumbs" aria-label="Workflow folder path"><button type="button" onClick={()=>openFolder(null)} aria-current={!view.current&&!search?'page':undefined}>Personal</button>{view.trail.map((folder,index)=><span key={folder.id}><ChevronRight size={14} aria-hidden="true"/><button type="button" onClick={()=>openFolder(folder.id)} aria-current={index===view.trail.length-1&&!search?'page':undefined}>{folder.name}</button></span>)}{search&&<span><ChevronRight size={14} aria-hidden="true"/>Search results</span>}</nav>
      {!data&&!error&&<p role="status">Loading folders and workflows…</p>}
      {view.folders.length>0&&<div className="workflow-folders">{view.folders.map(folder=><button className="workflow-folder" key={folder.id} onClick={()=>openFolder(folder.id)}><Folder size={28} aria-hidden="true"/><span><strong>{folder.name}</strong><small>{folder.workflow_count} workflows total · {folder.folder_count} folders</small></span><ChevronRight size={18} aria-hidden="true"/></button>)}</div>}
      <p className="panel-footnote workflow-result-count" role="status">{search?view.workflows.length+' matching workflows across all folders':view.workflows.length+' workflows in '+(view.trail.at(-1)?.name||'Personal')+(view.current?'':' root')}</p>
      <div className="workflow-entries">{view.workflows.map(workflow=><article className="workflow-entry" key={workflow.id}><div><h3><a href={'https://n8n.shivpatel.in/workflow/'+encodeURIComponent(workflow.id)} target="_blank" rel="noopener noreferrer">{workflow.name}</a></h3><p>{search?workflow.folder_path:workflow.agent_count+' AI nodes'} · Updated {dateLabel(workflow.updated_at,true)}</p></div><div className="workflow-entry-actions"><span className="badge">{workflow.active==null?'Status unavailable':workflow.active?'Published':'Draft'}</span>{workflow.runnable&&<button className="button secondary small" disabled={busy||readOnly||pending!==null} onClick={()=>execute(workflow)}>{busy?'Sending…':'Run workflow'}</button>}<a className="icon-button" href={'https://n8n.shivpatel.in/workflow/'+encodeURIComponent(workflow.id)} target="_blank" rel="noopener noreferrer" aria-label={'Open '+workflow.name+' in n8n'}><ExternalLink size={18} aria-hidden="true"/></a></div></article>)}</div>
      {data&&!view.workflows.length&&<p className="panel-footnote">{search?'No workflows match this search. Try another name or folder.':view.folders.length?'Choose a folder to see its workflows.':'This folder has no workflows yet.'}</p>}
    </section>
    {data?.runs.length>0&&<details className="workspace-panel"><summary>Recent execution requests</summary><p className="panel-footnote">Accepted means n8n acknowledged the trigger. It does not confirm completion.</p><div className="workflow-history">{data.runs.map(run=><div key={run.request_id}><strong>{workflows.find(row=>row.id===run.workflow_id)?.name||run.workflow_id}</strong><span>{run.state}</span><small>{dateLabel(run.created_at,true)}</small></div>)}</div></details>}
  </section>;
}
