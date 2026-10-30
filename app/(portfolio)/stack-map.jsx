'use client';
import CornerFrame from '../../components/CornerFrame';
import { useEffect, useRef, useState } from 'react';
import { groups,nodes,edges,nodeWidth,nodeHeight,clampNode,connectionPath,neighbors } from '../../lib/stack-map.mjs';
import MagneticGrid from './magnetic-grid';

export default function StackMap() {
  const [positions,setPositions] = useState(()=>Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}])));
  const [selected,setSelected] = useState('interface'),[hover,setHover] = useState(null),[filter,setFilter] = useState('all');
  const canvas = useRef(null),drag = useRef(null),suppressClick = useRef(false);
  const focus = hover || selected,related = neighbors(focus);
  const activeNode = nodes.find(n=>n.id===selected);
  function startDrag(event,node) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {id:node.id,startX:event.clientX,startY:event.clientY,origin:positions[node.id],moved:false};
    suppressClick.current = false;
  }
  function moveDrag(event,node) {
    const current=drag.current; if (!current || current.id!==node.id) return;
    const scale=1000/canvas.current.getBoundingClientRect().width;
    const dx=event.clientX-current.startX,dy=event.clientY-current.startY;
    if (Math.hypot(dx,dy)>5) current.moved=true;
    if (current.moved) setPositions(p=>({...p,[node.id]:clampNode(node,current.origin.x+dx*scale,current.origin.y+dy*scale)}));
  }
  function endDrag(event) {
    if (!drag.current) return;
    suppressClick.current=drag.current.moved;
    drag.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboard(event,node) {
    const delta={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[event.key];
    if(!delta)return; event.preventDefault();
    setPositions(p=>({...p,[node.id]:clampNode(node,p[node.id].x+delta[0],p[node.id].y+delta[1])}));
  }
  function reset(){setPositions(Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}])));setSelected('interface');setFilter('all');}
  return <section className="stack-map" id="stack-map" aria-labelledby="stack-map-heading">
    <div className="stack-map-inner"><header className="stack-map-header"><div><p className="stack-eyebrow"><span/> HOW I BUILD</p><h2 id="stack-map-heading">Good ideas.<br/><em>Connected thinking.</em></h2></div><p className="stack-intro">From the first pixel to the last query.<br/>Explore the tools I connect to bring a digital product to life.</p></header>
      <div className="stack-workbench"><div className="stack-toolbar"><span className="stack-file"><i/> shiv / toolkit.map</span><div className="stack-filters" role="group" aria-label="Filter skill layers">{['all',...groups.map(g=>g.id)].map(id=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{id==='all'?'All layers':id}</button>)}</div><button type="button" className="stack-reset" onClick={reset}>↺ Reset</button></div>
        <div className="stack-scroll" tabIndex={0} aria-label="Interactive skill map. Scroll horizontally on smaller screens. Select a card to inspect it. Focus a card and use arrow keys to move it."><div className="stack-canvas" ref={canvas}>
          <MagneticGrid/>
          <svg className="stack-wires" viewBox="0 0 1000 560" fill="none" aria-hidden="true">
            {edges.map(([from,to],index)=>{const a=nodes.find(n=>n.id===from),b=nodes.find(n=>n.id===to),path=connectionPath(positions[from],positions[to]);const lit=related.has(from)&&related.has(to);const visible=filter==='all'||a.group===filter||b.group===filter;return <g key={from+to} className={`stack-wire ${lit?'is-lit':''} ${visible?'':'is-dim'}`} style={{'--wire-color':b.color}}><path d={path} stroke="currentColor" strokeWidth={lit?1.8:1.2} strokeDasharray={a.group!==b.group?'5 8':undefined}/><circle className="stack-packet" r="3.4" fill="currentColor"><animateMotion dur={`${4+index*.6}s`} begin={`${-index}s`} repeatCount="indefinite" path={path}/></circle></g>;})}
          </svg>
          {groups.map(g=><div className={`stack-layer ${filter!=='all'&&filter!==g.id?'is-dim':''}`} key={g.id} style={{left:`${g.x/10}%`,top:`${g.y/5.6}%`,width:`${g.width/10}%`,height:`${g.height/5.6}%`,'--layer-color':g.color}}><span><i/>{g.label}</span></div>)}
          {nodes.map(node=>{const p=positions[node.id];const dim=filter!=='all'&&filter!==node.group;return <button type="button" key={node.id} className={`corner-box stack-node ${selected===node.id?'is-selected':''} ${related.has(node.id)?'is-connected':''} ${dim?'is-dim':''}`} style={{left:`${p.x/10}%`,top:`${p.y/5.6}%`,width:`${nodeWidth/10}%`,height:`${nodeHeight/5.6}%`,'--node-color':node.color}} aria-pressed={selected===node.id} aria-controls="stack-inspector" aria-label={`${node.title}: ${node.tool}`} onMouseEnter={()=>setHover(node.id)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(node.id)} onBlur={()=>setHover(null)} onPointerDown={e=>startDrag(e,node)} onPointerMove={e=>moveDrag(e,node)} onPointerUp={endDrag} onPointerCancel={e=>{endDrag(e);suppressClick.current=false;}} onKeyDown={e=>keyboard(e,node)} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}setSelected(node.id);}}><CornerFrame/><span className="stack-node-top"><strong>{node.title}</strong><i aria-hidden="true"/></span><span className="stack-node-tool">{node.tool}</span><span className="stack-node-tag">{node.tag}</span></button>;})}
          <span className="stack-canvas-note">06 TOOLS · 03 CONNECTED LAYERS</span>
        </div></div>
        <div className="stack-inspector" id="stack-inspector" aria-live="polite" style={{'--inspect-color':activeNode.color}}><div><span className="stack-inspect-label">EXPLORING / {activeNode.group.toUpperCase()}</span><h3>{activeNode.tool}</h3></div><p>{activeNode.description}</p><span className="stack-inspect-arrow" aria-hidden="true">↗</span></div>
        <footer className="stack-map-footer"><span><i/> A map of my creative toolkit</span><span>CLICK TO EXPLORE <b>·</b> DRAG TO REARRANGE</span></footer>
      </div>
    </div>
  </section>;
}
