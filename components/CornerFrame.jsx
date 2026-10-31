'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {outsideFrame,frameColor} from '../lib/corner-frame.mjs';

export default function CornerFrame() {
  const anchor=useRef(null),[active,setActive]=useState(false),[frame,setFrame]=useState(null);
  useEffect(()=>{
    const box=anchor.current.parentElement;
    const fine=window.matchMedia('(hover:hover) and (pointer:fine)');
    const update=()=>setActive((fine.matches&&box.matches(':hover'))||box.matches(':focus-within'));
    const blur=()=>queueMicrotask(update);
    box.addEventListener('mouseenter',update);box.addEventListener('mouseleave',update);
    box.addEventListener('focusin',update);box.addEventListener('focusout',blur);
    return()=>{box.removeEventListener('mouseenter',update);box.removeEventListener('mouseleave',update);box.removeEventListener('focusin',update);box.removeEventListener('focusout',blur);};
  },[]);
  useEffect(()=>{
    if(!active){setFrame(null);return;}
    const box=anchor.current.parentElement;let animation;
    const measure=()=>{
      const styles=[];for(let node=box;node;node=node.parentElement)styles.push(getComputedStyle(node));
      const rect=box.getBoundingClientRect();
      const color=frameColor(styles,styles[0].getPropertyValue('--corner-accent').trim()||'#98ff02');
      const next={...outsideFrame(rect),color,small:box.classList.contains('skill-tag')};
      // Follow hover transforms, dragging and scroll without changing the card layout.
      setFrame(previous=>previous&&Object.keys(next).every(key=>previous[key]===next[key])?previous:next);
      animation=requestAnimationFrame(measure);
    };
    measure();return()=>cancelAnimationFrame(animation);
  },[active]);
  return <><span ref={anchor} hidden style={{display:'none'}} aria-hidden="true"/>{active&&frame&&createPortal(<span className={`corner-frame${frame.small?' corner-frame-small':''}`} aria-hidden="true" style={{left:frame.left,top:frame.top,width:frame.width,height:frame.height,'--corner-color':frame.color}}><i/><i/><i/><i/></span>,document.body)}</>;
}
