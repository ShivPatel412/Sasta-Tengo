'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {adminApi} from '../../../lib/dashboard-client.mjs';
import {snapshotFresh,sourceFresh} from '../../../lib/master-dashboard.mjs';
import {dateLabel} from '../../../lib/dashboard.mjs';
import {Server,Workflow,ExternalLink,Plugs} from './dashboard-icons';

const workflowLink=id=>'https://n8n.shivpatel.in/workflow/'+encodeURIComponent(id);
const bytes=value=>Number.isFinite(Number(value))&&value!=null?(Number(value)/1024**3).toFixed(1)+' GB':'Unavailable';
export default function ControlPanels({section,refresh=0}){
  const [snapshot,setSnapshot]=useState(null),[error,setError]=useState(''),[search,setSearch]=useState('');
  useEffect(()=>{
    let active=true,timer;
    async function load(){
      try{const data=await adminApi('control-room');if(active){setSnapshot(data);setError('');}}
      catch(e){if(active)setError(e.message);}
      if(active)timer=setTimeout(load,30000);
    }
    load();return()=>{active=false;clearTimeout(timer);};
  },[refresh]);
  const fresh=!error&&snapshotFresh(snapshot),workflows=snapshot?.n8n?.workflows||[],threads=snapshot?.codex?.threads||[];
  const query=search.toLowerCase(),filtered=workflows.filter(w=>String(w.name).toLowerCase().includes(query));
  const n8nOK=!error&&sourceFresh(snapshot,'n8n');
  return <section className="master-control">
    {error&&<div role="status" className="connection-notice"><Plugs size={24} aria-hidden="true"/><div><strong>Service status is unavailable</strong><p>Your tools still open. Refresh to check for updated status.</p></div></div>}
    {snapshot&&!fresh&&<p role="status" className="review-banner">Collector data is stale. Last-known information is shown; live counts are unavailable.</p>}
    {!snapshot&&!error&&<div className="workspace-loading" role="status"><div className="master-loading-bars" aria-hidden="true"><i/><i/><i/></div><span>Connecting to your services…</span></div>}
    {section==='overview'&&<><div className="panel-heading"><div><span className="mini-label">YOUR CONNECTED ECOSYSTEM</span><h2>Automation & infrastructure</h2></div></div><div className="metric-grid">{[['Workflows',n8nOK?workflows.length:'—','workflows'],['Runs today',n8nOK?snapshot.n8n?.today?.total??'—':'—','workflows'],['AI workflows',n8nOK?workflows.filter(w=>w.agent_count>0).length:'—','agents']].map(([label,value,path])=><Link href={'/dashboard/'+path} className="metric-card" key={label}><span className="metric-label">{label}</span><strong>{value}</strong><small>{n8nOK?'Collector metadata':'Awaiting fresh collector data'}</small></Link>)}</div></>}
    {section==='agents'&&<>{snapshot&&(!n8nOK||!sourceFresh(snapshot,'codex'))&&<p role="status" className="panel-footnote">Some agent sources are unavailable. Showing last-known configuration and chat history.</p>}<p className="panel-footnote">Published workflows describe configuration. Codex entries are chat history; live agent running status is unavailable.</p><label className="master-search">Search agents and chats<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find an agent or chat"/></label><div className="overview-grid"><section className="workspace-panel"><h2>n8n AI workflows</h2><div className="master-list">{filtered.filter(w=>w.agent_count>0).map(w=><a key={w.id} href={workflowLink(w.id)} target="_blank" rel="noopener noreferrer"><span><strong>{w.name}</strong><small>{w.agent_count} configured AI nodes</small></span><span className="badge">{w.active?'Published':'Draft'}</span></a>)}</div></section><section className="workspace-panel"><h2>Codex activity history</h2><div className="master-list">{threads.filter(t=>String(t.name).toLowerCase().includes(query)).map(t=><div key={t.id}><span><strong>{t.name}</strong><small>{t.model} · {t.role}</small></span><span className="badge">History</span></div>)}</div></section></div></>}
    {section==='services'&&<>
      <div className="panel-heading">
        <div>
          <span className="mini-label">INFRASTRUCTURE & WORKERS</span>
          <h2>System Health & Service Monitor</h2>
        </div>
        <a href="https://dockhand.shivpatel.in" target="_blank" rel="noopener noreferrer" className="button secondary">Open Dockhand ↗</a>
      </div>

      {/* n8n Execution Health & Pipelines Summary */}
      <div className="metric-grid" style={{marginBottom:'1.5rem'}}>
        <div className="metric-card">
          <span className="metric-label">Runs today</span>
          <strong style={{color:'#98FF02'}}>{n8nOK?snapshot.n8n?.today?.total??0:'—'}</strong>
          <small>{n8nOK?`${snapshot.n8n?.today?.success??0} success · ${snapshot.n8n?.today?.errors??0} errors`:'Awaiting collector data'}</small>
        </div>
        <div className="metric-card">
          <span className="metric-label">Execution success rate</span>
          <strong style={{color:snapshot.n8n?.today?.errors>0?'#ffaa00':'#98FF02'}}>
            {n8nOK?(snapshot.n8n?.today?.total>0?Math.round(((snapshot.n8n?.today?.success||0)/snapshot.n8n.today.total)*100)+'%':'100%'):'—'}
          </strong>
          <small>{snapshot.n8n?.today?.running??0} running right now</small>
        </div>
        <div className="metric-card">
          <span className="metric-label">Host storage</span>
          <strong>{fresh?bytes(snapshot.storage?.free):'—'}</strong>
          <small>{fresh?`${bytes(snapshot.storage?.used)} used of ${bytes(snapshot.storage?.total)}`:'Storage usage'}</small>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active containers</span>
          <strong style={{color:'#98FF02'}}>{(snapshot?.services||[]).filter(s=>s.state==='running').length}</strong>
          <small>{(snapshot?.services||[]).length} total managed containers</small>
        </div>
      </div>

      {/* Docker Workers */}
      <section className="workspace-panel" style={{marginBottom:'1.5rem'}}>
        <div className="panel-heading">
          <h2>Worker & container statuses</h2>
          <span className="panel-footnote">Read-only monitoring</span>
        </div>
        <div className="master-list">
          {(snapshot?.services||[]).map(service=><div key={service.name}>
            <span><strong>{service.name}</strong><small>{service.status} · {service.image}</small></span>
            <span className={`badge ${service.state==='running'?'published':''}`}>{service.state}</span>
          </div>)}
        </div>
      </section>

      {/* Recent Execution Logs */}
      {snapshot?.n8n?.executions?.length>0&&(
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>Recent n8n execution logs ({snapshot.n8n.executions.length})</h2>
            <a href="https://n8n.shivpatel.in" target="_blank" rel="noopener noreferrer">Open n8n workspace ↗</a>
          </div>
          <div className="master-list">
            {snapshot.n8n.executions.map(exec=><a key={exec.id} href={`https://n8n.shivpatel.in/execution/${exec.id}`} target="_blank" rel="noopener noreferrer">
              <span>
                <strong>{exec.name||'Workflow execution'} #{exec.id}</strong>
                <small>Started {dateLabel(exec.started_at,true)}</small>
              </span>
              <span className={`badge ${exec.status==='success'?'published':exec.status==='running'?'':'status-error'}`}>
                {exec.status}
              </span>
            </a>)}
          </div>
        </section>
      )}
    </>}
    {snapshot&&<p className="panel-footnote">Collected {dateLabel(snapshot.updated_at,true)} · refreshes every 30 seconds</p>}
  </section>;
}
