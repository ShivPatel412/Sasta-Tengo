
import {createRoot} from 'react-dom/client';
const Link=({children,...props})=><a {...props}>{children}</a>;
import {Component,Suspense,lazy,useEffect,useRef,useState} from 'react';
import {worldData,workflowUrl} from './data.mjs';
import {stations,cameraModes} from './world.mjs';
import './hq.css';
const World=lazy(()=>import('./World.jsx'));
const date=value=>value?new Date(typeof value==='number'?value*1000:value).toLocaleString('en-IN'):'Unavailable';
const bytes=value=>Number.isFinite(value)?`${(value/1024**3).toFixed(1)} GB`:'Unavailable';
function StationDetails({panel,data,error}){
  if(!data)return <p role="status">{error||'Waiting for the authenticated control room snapshot…'}</p>;
  return <>
    {(error||!data.fresh||Object.keys(data.errors||{}).length>0)&&<p role="alert" className="hq-disconnected">{error||'Some source data is stale or disconnected. Last-known values are shown.'}</p>}
    <p>Collected {date(data.updated_at)}. Read-only monitoring; changes stay in the source application.</p>
    {['overview','workflows'].includes(panel.kind)&&<><div className="hq-panel-counts">{[['Workflows','workflows'],['AI workflows','agents'],['Running','running'],['Errors today','failures']].map(([label,key])=><div key={key}><b>{data.counts[key]??'—'}</b><span>{label}</span></div>)}</div><h3>n8n workflows</h3>{data.workflows.map(workflow=><a key={workflow.id} className="hq-record" href={workflowUrl(workflow.id)} target="_blank" rel="noopener noreferrer"><span>{workflow.name}<small>{workflow.agent_count} AI nodes · updated {date(workflow.updated_at)}</small></span><small>{workflow.active?'Published':'Draft'} ↗</small></a>)}{!data.workflows.length&&<p>No workflows in the current snapshot.</p>}</>}
    {['overview','executions','agent'].includes(panel.kind)&&<><h3>{panel.kind==='agent'?'AI workflow representative':'Recent executions'}</h3>{panel.kind==='agent'&&<><p>{data.agent?`${data.agent.name} · ${data.agent.agent_count} configured AI nodes`:'No AI workflow is configured. This human is an unassigned café host.'}</p><p>Published state does not mean a task is running. This character types only when the fresh snapshot reports a running execution. Agent conversation and node-level execution bodies are not exposed by the existing collector.</p></>}{data.executions.filter(e=>panel.kind!=='agent'||e.workflow_id===data.agent?.id).slice(0,15).map(execution=><a className="hq-record" key={execution.id} href={workflowUrl(execution.workflow_id)} target="_blank" rel="noopener noreferrer"><span>{execution.name||'Workflow'}<small>#{execution.id} · {date(execution.started_at)}</small></span><small>{execution.status} ↗</small></a>)}{!data.executions.length&&<p>No execution history in the current snapshot.</p>}{panel.kind==='agent'&&<><h3>Codex activity history</h3><p>These are recorded chats, not live running agents.</p>{(data.codex?.threads||[]).slice(0,20).map((thread,i)=><div className="hq-record" key={thread.id||i}><span>{thread.name}<small>{thread.model} · {thread.role}</small></span><small>History · {date(thread.updated_at)}</small></div>)}</>}</>}
    {panel.kind==='server'&&<><h3>Docker services</h3>{(data.services||[]).map(service=><div className="hq-record" key={service.name}><span>{service.name}<small>{service.status}</small></span><small>{service.state}</small></div>)}<h3>Physical storage</h3><p>PC: {bytes(data.storage?.free)} free / {bytes(data.storage?.total)} total.</p><p>External HDD: {data.hdd?.connected?`${bytes(data.hdd.free)} free / ${bytes(data.hdd.total)} total`:'Disconnected'}</p><p>CPU, memory and exact uptime are not collected. Container status above is the collector’s reported status.</p><a className="hq-button" href="https://dockhand.shivpatel.in" target="_blank" rel="noopener noreferrer">Open Dockhand ↗</a></>}
    <a className="hq-button accent" href="/">Return to Classic Control Room →</a>
  </>;
}
class GraphicsBoundary extends Component{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="hq-loading"><h2>3D graphics unavailable</h2><p>Try a browser with hardware acceleration, or return to Classic View.</p><Link href="/">Classic Dashboard</Link></div>:this.props.children;}
}
createRoot(document.getElementById('root')).render(<Headquarters/>);
export default function Headquarters(){
  const [mode,setMode]=useState('overview'),[started,setStarted]=useState(false),[panel,setPanel]=useState(null),[target,setTarget]=useState(null);
  const [stats,setStats]=useState(null),[error,setError]=useState(''),[updated,setUpdated]=useState(null),[map,setMap]=useState(true),[hud,setHud]=useState(true);
  const [quality,setQuality]=useState('balanced'),[sensitivity,setSensitivity]=useState(1),[fov,setFov]=useState(70),[bob,setBob]=useState(false);
  const player=useRef({x:0,z:4,yaw:0}),[marker,setMarker]=useState({x:0,z:4,yaw:0});
  const [destination,setDestination]=useState(null);
  useEffect(()=>{
    let active=true,timer;
    async function refresh(){
      try{const response=await fetch('/api/overview',{cache:'no-store',credentials:'same-origin'});if(response.status===401){window.location.assign('/?view=3d');return;}if(!response.ok)throw new Error('Control room snapshot unavailable');const data=worldData(await response.json());if(active){setStats(data);setUpdated(new Date());setError('');}}
      catch(e){if(active)setError(e.message);}
      if(active)timer=setTimeout(refresh,30000);
    }
    refresh();return()=>{active=false;clearTimeout(timer);};
  },[]);
  useEffect(()=>{const timer=setInterval(()=>setMarker({...player.current}),250);return()=>clearInterval(timer);},[]);
  function open(item){document.exitPointerLock?.();setPanel(item);}
  useEffect(()=>{
    const key=e=>{
      if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
      if(e.code==='Escape'){setPanel(null);if(document.activeElement?.tagName==='CANVAS')document.activeElement.blur();return;}
      if(panel||e.repeat)return;
      if(e.code==='KeyV'){e.preventDefault();document.exitPointerLock?.();setMode(current=>cameraModes[(cameraModes.indexOf(current)+1)%4]);}
      if(e.code==='KeyM'){e.preventDefault();setMap(value=>!value);}
      if(e.code==='KeyE'&&target){e.preventDefault();open(target);}
      if(e.code==='Tab'&&(document.pointerLockElement||document.activeElement?.tagName==='CANVAS')){e.preventDefault();open({name:'Classic Dashboard',kind:'overview'});}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[panel,target]);
  useEffect(()=>{if(!panel)return;const dialog=document.querySelector('.hq-dialog');dialog?.showModal();return()=>dialog?.close();},[panel]);
  return <main className="hq">
    <GraphicsBoundary><Suspense fallback={<div className="hq-loading">Preparing your gaming café…</div>}><World mode={mode} active={started&&!panel} onTarget={setTarget} onOpen={open} player={player} quality={quality} sensitivity={sensitivity} fov={fov} bob={bob} destination={destination} stats={error?null:stats}/></Suspense></GraphicsBoundary>
    <header className="hq-top"><Link href="/" className="hq-brand"><span className="hq-logo">HQ</span><span>AI AUTOMATION HQ<small>SHIV / AUTOMATION CONTROL ROOM</small></span></Link><div className="hq-connection"><i className={error?'offline':''}/>{error?'Dashboard disconnected':stats?'Dashboard connected':'Connecting…'}<small>{stats?.n8nConnected?'n8n snapshot connected':'n8n unavailable or stale'}</small></div><Link href="/" className="hq-button">↗ Classic View</Link></header>
    {hud&&<>
      <aside className="hq-left"><span className="hq-eyebrow">GAMING CAFÉ / CONTROL CENTER</span><h1>Play. Create.<br/>Automate.</h1><p>Your real workflows, in a different world.</p><div className="hq-metrics"><div><b>{stats?.counts.workflows??'—'}</b><span>n8n workflows</span></div><div><b>{stats?.counts.running??'—'}</b><span>Running executions · snapshot</span></div><div><b>{stats?.counts.agents??'—'}</b><span>Configured AI workflows</span></div></div>{updated&&<small>Snapshot checked {updated.toLocaleTimeString()}</small>}{error&&<p role="alert">{error} Previous data may be outdated.</p>}</aside>
      <aside className="hq-right"><label>Camera<select value={mode} onChange={e=>{document.exitPointerLock?.();setMode(e.target.value);}}>{cameraModes.map(value=><option key={value} value={value}>{({first:'First person',third:'Third person',free:'Free camera',overview:'Isometric overview'})[value]}</option>)}</select></label>
      {map&&<div className="hq-map"><span>OFFICE / LIVE POSITION</span><svg viewBox="-8 -6 16 12" aria-label="Office minimap"><rect x="-7.7" y="-5.7" width="15.4" height="11.4" rx=".3" fill="#111a15" stroke="#455346" strokeWidth=".1"/>{stations.map(item=><g key={item.id} role={mode==='overview'?'button':undefined} tabIndex={mode==='overview'?0:undefined} aria-label={`Navigate to ${item.name}`} onClick={()=>mode==='overview'&&setDestination({x:item.position[0],z:item.position[2]+2.4,nonce:Date.now()})} onKeyDown={e=>{if(mode==='overview'&&(e.key==='Enter'||e.key===' '))setDestination({x:item.position[0],z:item.position[2]+2.4,nonce:Date.now()});}}><rect x={item.position[0]-.45} y={item.position[2]-.3} width=".9" height=".6" fill="#a9b59f"/></g>)}<g transform={`translate(${marker.x},${marker.z}) rotate(${-marker.yaw*180/Math.PI})`}><path d="M0,-.5 L.3,.3 L0,.15 L-.3,.3 Z" fill="#98ff02"/></g></svg><small>{marker.x.toFixed(1)}, {marker.z.toFixed(1)} · {mode==='overview'?'Click a station to navigate':'Physical navigation'}</small></div>}
      <details className="hq-options"><summary>Game settings</summary><label>Graphics<select value={quality} onChange={e=>setQuality(e.target.value)}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label>Sensitivity<input type="range" min=".3" max="2" step=".1" value={sensitivity} onChange={e=>setSensitivity(Number(e.target.value))}/></label><label>Field of view · {fov}°<input type="range" min="55" max="95" value={fov} onChange={e=>setFov(Number(e.target.value))}/></label><label><input type="checkbox" checked={bob} onChange={e=>setBob(e.target.checked)}/> Head bobbing</label></details></aside>
      <footer className="hq-bottom"><div><span className="hq-eyebrow">{target?'NEARBY INTERACTION':'EXPLORE YOUR OFFICE'}</span><strong>{target?target.name:mode==='overview'?'Select a workstation or enter the office':mode==='free'?'Drag to orbit · scroll to zoom · right drag to pan':'Click to play · drag to look if mouse capture is unavailable'}</strong></div>{target&&<button className="hq-button accent" onClick={()=>open(target)}>E · Interact</button>}<span className="hq-keys">WASD move / SHIFT run / E interact / V camera / M map / ESC release</span></footer>
    </>}
    <button className="hq-hide" onClick={()=>setHud(!hud)}>{hud?'Hide HUD':'Show HUD'}</button>
    {mode==='first'&&started&&!panel&&<span className="hq-crosshair" aria-hidden="true">+</span>}
    {!started&&<div className="hq-entry"><span className="hq-eyebrow">WELCOME TO YOUR GAMING CAFÉ</span><h2>Your café.<br/>Your command center.</h2><p>A gaming café connected to your n8n workflows, execution history, Codex chats and infrastructure. Walk up to a screen and press E.</p><button className="hq-button accent" onClick={()=>{setStarted(true);setMode('first');}}>Enter headquarters →</button><button className="hq-button" onClick={()=>setStarted(true)}>Explore overview</button></div>}
    {panel&&<dialog className="hq-dialog" onCancel={()=>setPanel(null)}><div className="hq-dialog-head"><span className="hq-eyebrow">WORKSTATION / DETAILS</span><button className="hq-button" autoFocus onClick={()=>setPanel(null)}>Close · Esc</button></div><h2>{panel.name}</h2><StationDetails panel={panel} data={stats} error={error}/></dialog>}
  </main>;
}
