'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {adminApi} from '../../../lib/dashboard-client.mjs';
import {snapshotFresh} from '../../../lib/master-dashboard.mjs';
import {dateLabel} from '../../../lib/dashboard.mjs';
import {Cloud,Server,FolderOpen,Workflow,ExternalLink,Plugs,Shield} from './dashboard-icons';

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
  const fresh=!error&&snapshotFresh(snapshot),workflows=snapshot?.n8n?.workflows||[],executions=snapshot?.n8n?.executions||[],threads=snapshot?.codex?.threads||[];
  const query=search.toLowerCase(),filtered=workflows.filter(w=>String(w.name).toLowerCase().includes(query));
  const n8nOK=fresh&&!snapshot?.errors?.n8n;
  return <section className="master-control">
    {error&&<div role="status" className="connection-notice"><Plugs size={24} aria-hidden="true"/><div><strong>Service status is unavailable</strong><p>Your tools still open. Refresh to check for updated status.</p></div></div>}
    {snapshot&&!fresh&&<p role="status" className="review-banner">Collector data is stale. Last-known information is shown; live counts are unavailable.</p>}
    {!snapshot&&!error&&<div className="workspace-loading" role="status"><div className="master-loading-bars" aria-hidden="true"><i/><i/><i/></div><span>Connecting to your services…</span></div>}
    {section==='overview'&&<><div className="panel-heading"><div><span className="mini-label">YOUR CONNECTED ECOSYSTEM</span><h2>Automation & infrastructure</h2></div><Link href="/dashboard/3d" className="button secondary">Enter 3D café ↗</Link></div><div className="metric-grid">{[['Workflows',n8nOK?workflows.length:'—','workflows'],['Runs today',n8nOK?snapshot.n8n?.today?.total??'—':'—','workflows'],['AI workflows',n8nOK?workflows.filter(w=>w.agent_count>0).length:'—','agents'],['Cloud storage',bytes(snapshot?.cloud?.storage?.used),'cloud']].map(([label,value,path])=><Link href={'/dashboard/'+path} className="metric-card" key={label}><span className="metric-label">{label}</span><strong>{value}</strong><small>{n8nOK?'Collector metadata':'Awaiting fresh collector data'}</small></Link>)}</div></>}
    {section==='workflows'&&<><label className="master-search">Search workflows<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a workflow"/></label><section className="workspace-panel"><div className="panel-heading"><h2>n8n workflows</h2><a href="https://n8n.shivpatel.in" target="_blank" rel="noopener noreferrer">Open n8n ↗</a></div><div className="master-list">{filtered.map(w=><a key={w.id} href={workflowLink(w.id)} target="_blank" rel="noopener noreferrer"><span><strong>{w.name}</strong><small>{Number(w.agent_count)||0} AI nodes · updated {dateLabel(w.updated_at,true)}</small></span><span className="badge">{w.active?'Published':'Draft'}</span></a>)}{!filtered.length&&<div className="master-empty"><Workflow size={32} aria-hidden="true"/><h3>{snapshot?'No matching workflows':'No workflow data yet'}</h3><p>{snapshot?'Try another search.':'Your workflows will appear when service status is connected. You can still open n8n.'}</p></div>}</div></section><section className="workspace-panel"><h2>Recent executions</h2><div className="master-list">{!executions.length&&<p className="panel-footnote">No execution history is available yet.</p>}{executions.slice(0,30).map(run=><a key={run.id} href={workflowLink(run.workflow_id)} target="_blank" rel="noopener noreferrer"><span><strong>{run.name||'Workflow'}</strong><small>#{run.id} · {dateLabel(run.started_at,true)}</small></span><span className="badge">{run.status}</span></a>)}</div></section></>}
    {section==='agents'&&<><p className="panel-footnote">Published workflows describe configuration. Codex entries are chat history; live agent running status is unavailable.</p><label className="master-search">Search agents and chats<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find an agent or chat"/></label><div className="overview-grid"><section className="workspace-panel"><h2>n8n AI workflows</h2><div className="master-list">{filtered.filter(w=>w.agent_count>0).map(w=><a key={w.id} href={workflowLink(w.id)} target="_blank" rel="noopener noreferrer"><span><strong>{w.name}</strong><small>{w.agent_count} configured AI nodes</small></span><span className="badge">{w.active?'Published':'Draft'}</span></a>)}</div></section><section className="workspace-panel"><h2>Codex activity history</h2><div className="master-list">{threads.filter(t=>String(t.name).toLowerCase().includes(query)).map(t=><div key={t.id}><span><strong>{t.name}</strong><small>{t.model} · {t.role}</small></span><span className="badge">History</span></div>)}</div></section></div></>}
    {section==='cloud'&&<>
      <div className="cloud-layout">
        <section className="workspace-panel cloud-card">
          <div className="cloud-card-top"><span className="cloud-symbol"><Cloud size={32} aria-hidden="true"/></span><span className="badge">Personal cloud</span></div>
          <span className="mini-label">CLOUD.SHIVPATEL.IN</span><h2>Everything in its place.</h2>
          <p>Your photos, files and project assets. Stored in your existing Nextcloud, ready when you need them.</p>
          <dl className="cloud-data"><div><dt>Account storage used</dt><dd>{snapshot?bytes(snapshot.cloud?.storage?.used):'—'}<small>{snapshot?' / '+bytes(snapshot.cloud?.storage?.quota):' Status unavailable'}</small></dd></div><div><dt>Space available on PC</dt><dd>{snapshot?bytes(snapshot.storage?.free):'—'}</dd></div></dl>
          <a className="button primary" href="https://cloud.shivpatel.in" target="_blank" rel="noopener noreferrer"><FolderOpen size={20} aria-hidden="true"/>Open my files<ExternalLink size={16} aria-hidden="true"/></a>
          <p className="cloud-footnote">Nextcloud keeps its existing account and sign in.</p>
        </section>
        <section className="workspace-panel cloud-card disk-card">
          <div className="cloud-card-top"><span className="cloud-symbol"><Server size={32} aria-hidden="true"/></span><span className="badge">{!snapshot?'Status unavailable':snapshot.hdd?.connected?'Connected':'Disconnected'}</span></div>
          <span className="mini-label">MY PASSPORT · EXTERNAL STORAGE</span><h2>Your extra room.</h2>
          <div className="disk-capacity">4 <span>TB HDD</span></div>
          <p>{snapshot?.hdd?.connected?bytes(snapshot.hdd.free)+' free of '+bytes(snapshot.hdd.total):'Live storage usage is currently unavailable.'}</p>
          <p className="disk-note">Choose the “4 TB HDD” folder in Nextcloud to use this drive. Keep your originals until you have an independent backup.</p>
        </section>
      </div>
      <section className="service-directory" aria-labelledby="service-directory-heading"><div className="panel-heading"><div><span className="mini-label">PART OF YOUR WORKSPACE</span><h2 id="service-directory-heading">A direct path to your tools.</h2></div></div><div className="service-links">{[[Cloud,'Nextcloud','Files and personal storage','https://cloud.shivpatel.in'],[Workflow,'n8n','Your automation workspace','https://n8n.shivpatel.in'],[ExternalLink,'Portfolio','Your work on the web','https://www.shivpatel.in']].map(([Icon,title,description,url])=><a key={title} href={url} target="_blank" rel="noopener noreferrer"><Icon size={24} aria-hidden="true"/><span><strong>{title}</strong><small>{description}</small></span><ExternalLink size={16} aria-hidden="true"/></a>)}</div></section>
    </>}
    {section==='services'&&<section className="workspace-panel"><div className="panel-heading"><h2>Docker services</h2><a href="https://dockhand.shivpatel.in" target="_blank" rel="noopener noreferrer">Open Dockhand ↗</a></div><div className="master-list">{(snapshot?.services||[]).map(service=><div key={service.name}><span><strong>{service.name}</strong><small>{service.status}</small></span><span className="badge">{service.state}</span></div>)}</div><p className="panel-footnote">Read-only monitoring. Service changes remain in the existing tools.</p></section>}
    {snapshot&&<p className="panel-footnote">Collected {dateLabel(snapshot.updated_at,true)} · refreshes every 30 seconds</p>}
  </section>;
}
