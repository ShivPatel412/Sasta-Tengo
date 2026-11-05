'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {Component,useEffect,useRef,useState} from 'react';
import {adminApi} from '../../../lib/dashboard-client.mjs';
import {stations,cameraModes} from '../../../lib/hq.mjs';
import './hq.css';
const World=dynamic(()=>import('../../../components/game/World'),{ssr:false,loading:()=> <div className="hq-loading">Preparing your headquarters…</div>});
class GraphicsBoundary extends Component{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="hq-loading"><h2>3D graphics unavailable</h2><p>Try a browser with hardware acceleration, or return to Classic View.</p><Link href="/dashboard">Classic Dashboard</Link></div>:this.props.children;}
}
export default function Headquarters(){
  const [mode,setMode]=useState('overview'),[started,setStarted]=useState(false),[panel,setPanel]=useState(null),[target,setTarget]=useState(null);
  const [stats,setStats]=useState(null),[error,setError]=useState(''),[updated,setUpdated]=useState(null),[map,setMap]=useState(true),[hud,setHud]=useState(true);
  const [quality,setQuality]=useState('balanced'),[sensitivity,setSensitivity]=useState(1),[fov,setFov]=useState(70),[bob,setBob]=useState(false);
  const player=useRef({x:0,z:4,yaw:0}),[marker,setMarker]=useState({x:0,z:4,yaw:0});
  const [destination,setDestination]=useState(null);
  useEffect(()=>{
    let active=true,timer;
    async function refresh(){
      try{const data=await adminApi('stats');if(active){setStats(data);setUpdated(new Date());setError('');}}
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
      if(e.code==='Tab'&&(document.pointerLockElement||document.activeElement?.tagName==='CANVAS')){e.preventDefault();open({name:'Classic Dashboard',kind:'portfolio'});}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[panel,target]);
  useEffect(()=>{if(!panel)return;const dialog=document.querySelector('.hq-dialog');dialog?.showModal();return()=>dialog?.close();},[panel]);
  return <main className="hq">
    <GraphicsBoundary><World mode={mode} active={started&&!panel} onTarget={setTarget} onOpen={open} player={player} quality={quality} sensitivity={sensitivity} fov={fov} bob={bob} destination={destination} stats={error?null:stats}/></GraphicsBoundary>
    <header className="hq-top"><Link href="/dashboard" className="hq-brand"><span className="hq-logo">HQ</span><span>AI AUTOMATION HQ<small>SHIV / PRIVATE WORKSPACE</small></span></Link><div className="hq-connection"><i className={error?'offline':''}/>{error?'Dashboard disconnected':stats?'Dashboard connected':'Connecting…'}<small>Automation not connected</small></div><Link href="/dashboard" className="hq-button">↗ Classic View</Link></header>
    {hud&&<>
      <aside className="hq-left"><span className="hq-eyebrow">HEADQUARTERS / 01</span><h1>Space to<br/>build what’s next.</h1><p>A playable home for your workspace.</p><div className="hq-metrics"><div><b>{stats?.counts.projects??'—'}</b><span>Projects</span></div><div><b>{stats?.counts.unread_contacts??'—'}</b><span>Unread messages</span></div><div><b>—</b><span>Live agents · not connected</span></div></div>{updated&&<small>Dashboard checked {updated.toLocaleTimeString()}</small>}{error&&<p role="alert">{error} Previous data may be outdated.</p>}</aside>
      <aside className="hq-right"><label>Camera<select value={mode} onChange={e=>{document.exitPointerLock?.();setMode(e.target.value);}}>{cameraModes.map(value=><option key={value} value={value}>{({first:'First person',third:'Third person',free:'Free camera',overview:'Isometric overview'})[value]}</option>)}</select></label>
      {map&&<div className="hq-map"><span>OFFICE / LIVE POSITION</span><svg viewBox="-8 -6 16 12" aria-label="Office minimap"><rect x="-7.7" y="-5.7" width="15.4" height="11.4" rx=".3" fill="#111a15" stroke="#455346" strokeWidth=".1"/>{stations.map(item=><g key={item.id} role={mode==='overview'?'button':undefined} tabIndex={mode==='overview'?0:undefined} aria-label={`Navigate to ${item.name}`} onClick={()=>mode==='overview'&&setDestination({x:item.position[0],z:item.position[2]+2.4,nonce:Date.now()})} onKeyDown={e=>{if(mode==='overview'&&(e.key==='Enter'||e.key===' '))setDestination({x:item.position[0],z:item.position[2]+2.4,nonce:Date.now()});}}><rect x={item.position[0]-.45} y={item.position[2]-.3} width=".9" height=".6" fill="#a9b59f"/></g>)}<g transform={`translate(${marker.x},${marker.z}) rotate(${-marker.yaw*180/Math.PI})`}><path d="M0,-.5 L.3,.3 L0,.15 L-.3,.3 Z" fill="#98ff02"/></g></svg><small>{marker.x.toFixed(1)}, {marker.z.toFixed(1)} · {mode==='overview'?'Click a station to navigate':'Physical navigation'}</small></div>}
      <details className="hq-options"><summary>Game settings</summary><label>Graphics<select value={quality} onChange={e=>setQuality(e.target.value)}><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label>Sensitivity<input type="range" min=".3" max="2" step=".1" value={sensitivity} onChange={e=>setSensitivity(Number(e.target.value))}/></label><label>Field of view · {fov}°<input type="range" min="55" max="95" value={fov} onChange={e=>setFov(Number(e.target.value))}/></label><label><input type="checkbox" checked={bob} onChange={e=>setBob(e.target.checked)}/> Head bobbing</label></details></aside>
      <footer className="hq-bottom"><div><span className="hq-eyebrow">{target?'NEARBY INTERACTION':'EXPLORE YOUR OFFICE'}</span><strong>{target?target.name:mode==='overview'?'Select a workstation or enter the office':mode==='free'?'Drag to orbit · scroll to zoom · right drag to pan':'Click to play · drag to look if mouse capture is unavailable'}</strong></div>{target&&<button className="hq-button accent" onClick={()=>open(target)}>E · Interact</button>}<span className="hq-keys">WASD move / SHIFT run / E interact / V camera / M map / ESC release</span></footer>
    </>}
    <button className="hq-hide" onClick={()=>setHud(!hud)}>{hud?'Hide HUD':'Show HUD'}</button>
    {mode==='first'&&started&&!panel&&<span className="hq-crosshair" aria-hidden="true">+</span>}
    {!started&&<div className="hq-entry"><span className="hq-eyebrow">PLAYABLE VERTICAL SLICE</span><h2>Your office.<br/>A new perspective.</h2><p>Walk around, change cameras and inspect your real portfolio data. Automation and infrastructure connections are not configured.</p><button className="hq-button accent" onClick={()=>{setStarted(true);setMode('first');}}>Enter headquarters →</button><button className="hq-button" onClick={()=>setStarted(true)}>Explore overview</button></div>}
    {panel&&<dialog className="hq-dialog" onCancel={()=>setPanel(null)}><div className="hq-dialog-head"><span className="hq-eyebrow">WORKSTATION / DETAILS</span><button className="hq-button" autoFocus onClick={()=>setPanel(null)}>Close · Esc</button></div><h2>{panel.name}</h2>{panel.kind==='portfolio'?<>{error&&<p role="alert">{error}</p>}<p>Read-only view of your existing authenticated dashboard. Last successful check: {updated?.toLocaleString()||'Waiting for connection'}.</p><div className="hq-panel-counts">{[['Projects','projects'],['Experience','experience'],['Contacts','contacts'],['Service requests','appointments']].map(([label,key])=><div key={key}><b>{stats?.counts[key]??'—'}</b><span>{label}</span></div>)}</div><h3>Recent projects</h3>{stats?.recentProjects?.map(project=><Link key={project.id} className="hq-record" href={`/dashboard/projects/${project.id}`}><span>{project.title}</span><small>{project.category} ↗</small></Link>)}{stats&&!stats.recentProjects?.length&&<p>No projects saved yet.</p>}<Link className="hq-button accent" href="/dashboard">Open Classic Dashboard →</Link></>:<><p className="hq-disconnected">Not connected</p><p>{panel.kind==='agent'?'This human character is an office host placeholder, not a configured AI agent. No tasks, replies or progress are being simulated.':panel.kind==='server'?'No infrastructure monitoring API is configured. CPU, memory, disk, uptime and container status are unavailable.':'No n8n workflow or execution API is configured in this Next.js application. Workflow states, errors and execution history are unavailable.'}</p><a className="hq-button" href="https://dashboard.shivpatel.in" target="_blank" rel="noopener noreferrer">Open existing control room ↗</a></>}</dialog>}
  </main>;
}
