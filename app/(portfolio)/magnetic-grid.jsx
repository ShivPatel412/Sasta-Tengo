'use client';
import {useEffect,useRef} from 'react';
import {magneticTarget,stepGridPoint} from '../../lib/magnetic-grid.mjs';

export default function MagneticGrid(){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current,parent=canvas.parentElement,context=canvas.getContext('2d');
    if(!context)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
    const pointer={x:0,y:0,active:false};
    let points=[],columns=0,rows=0,width=0,height=0,frame=0,lastTime=0,presence=0,disposed=false;
    function schedule(){if(!frame&&!disposed&&!document.hidden)frame=requestAnimationFrame(draw);}
    function draw(time){
      frame=0;if(disposed||document.hidden)return;
      const dt=Math.min(1.8,Math.max(.3,(time-lastTime)/16.667||1));lastTime=time;
      presence+=(Number(pointer.active)-presence)*.12;
      context.clearRect(0,0,width,height);
      let moving=false;
      for(const point of points){
        const target=magneticTarget(point.bx,point.by,pointer);
        stepGridPoint(point,target,dt);
        point.light=Math.max(0,1-Math.hypot(pointer.x-point.bx,pointer.y-point.by)/165)**1.5*presence;
        if(Math.hypot(point.x-point.bx,point.y-point.by)>.05)moving=true;
      }
      for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
        const point=points[row*columns+col],color=(row+col)%2?'177,151,239':'152,255,2';
        for(const adjacent of [col+1<columns?points[row*columns+col+1]:null,row+1<rows?points[(row+1)*columns+col]:null]){
          if(!adjacent)continue;const alpha=(point.light+adjacent.light)*.12;if(alpha<.003)continue;
          context.strokeStyle=`rgba(${color},${alpha})`;context.lineWidth=.65;
          context.beginPath();context.moveTo(point.x,point.y);context.lineTo(adjacent.x,adjacent.y);context.stroke();
        }
        if(point.light>.012){
          context.fillStyle=`rgba(${color},${point.light*.88})`;
          context.beginPath();context.arc(point.x,point.y,.6+point.light*1.15,0,Math.PI*2);context.fill();
        }
      }
      if(pointer.active||presence>.005||moving)schedule();else context.clearRect(0,0,width,height);
    }
    function resize(){
      width=parent.clientWidth;height=parent.clientHeight;
      const ratio=Math.min(window.devicePixelRatio||1,1.5);
      canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);
      columns=Math.ceil(width/44)+1;rows=Math.ceil(height/44)+1;
      points=Array.from({length:columns*rows},(_,i)=>{const x=(i%columns)*44,y=Math.floor(i/columns)*44;return{bx:x,by:y,x,y,vx:0,vy:0,light:0};});
      lastTime=0;schedule();
    }
    function leave(){pointer.active=false;canvas.dataset.active='false';schedule();}
    function move(event){
      if(reduced.matches||!fine.matches||event.pointerType==='touch')return;
      const bounds=parent.getBoundingClientRect();pointer.x=event.clientX-bounds.left;pointer.y=event.clientY-bounds.top;
      pointer.active=pointer.x>=0&&pointer.x<=width&&pointer.y>=0&&pointer.y<=height;
      canvas.dataset.active=String(pointer.active);schedule();
    }
    function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTime=0;}else leave();}
    const observer=new ResizeObserver(resize);observer.observe(parent);
    parent.addEventListener('pointermove',move,{passive:true});parent.addEventListener('pointerleave',leave);
    document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',leave);fine.addEventListener('change',leave);
    resize();
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();parent.removeEventListener('pointermove',move);parent.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',leave);fine.removeEventListener('change',leave);};
  },[]);
  return <canvas className="stack-magnetic-grid" ref={ref} aria-hidden="true" data-active="false"/>;
}
