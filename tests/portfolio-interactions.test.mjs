import test from 'node:test';
import assert from 'node:assert/strict';
import { mountPortfolioInteractions } from '../lib/portfolio-interactions.mjs';

function browser({ fine = true, reduced = false } = {}) {
  class Element extends EventTarget {
    children = []; hidden = false; values = new Map(); classes = new Set();
    style = { setProperty: (key,value) => this.values.set(key,value) };
    classList = {
      add: key => this.classes.add(key), remove: key => this.classes.delete(key),
      toggle: (key,on) => on ? this.classes.add(key) : this.classes.delete(key)
    };
    appendChild(node) { this.children.push(node); return node; }
    setAttribute() {}
    remove() { this.removed = true; }
    closest(selector) { return this.matches?.[selector] || null; }
    getBoundingClientRect() { return { left:100, top:200 }; }
  }
  const doc = new EventTarget(); doc.body = new Element(); doc.documentElement = new Element();
  doc.createElement = () => new Element();
  const view = new EventTarget(); let tick;
  view.matchMedia = query => Object.assign(new EventTarget(), { matches: query.includes('reduced') ? reduced : fine });
  view.setInterval = (callback,ms) => { assert.equal(ms,5000); tick = callback; return 1; };
  view.clearInterval = () => { tick = null; };
  const stop = mountPortfolioInteractions(doc, view);
  const event = (type, props = {}) => {
    const e = new Event(type);
    for (const [key,value] of Object.entries(props)) Object.defineProperty(e,key,{ value });
    doc.dispatchEvent(e);
  };
  const move = (target,props = {}) => event('pointermove',{target,pointerType:'mouse',clientX:180,clientY:260,...props});
  return { doc,view,stop,event,move,Element,tick:()=>tick?.(), cursor:doc.body.children[0] };
}
test('three dots follow the pointer and rotate on target entry and every five seconds', () => {
  const b = browser(); const triangle = b.cursor.children[0]; const link = new b.Element();
  const target = new b.Element(); target.matches = { 'a,button,select,summary,[role="button"],[role="link"]':link };
  assert.equal(triangle.children.length,3);
  b.move(target); assert.equal(b.cursor.hidden,false);
  assert.equal(b.cursor.style.transform,'translate3d(180px,260px,0)');
  assert.equal(triangle.style.transform,'rotate(120deg)');
  b.move(target); assert.equal(triangle.style.transform,'rotate(120deg)');
  b.tick(); assert.equal(triangle.style.transform,'rotate(480deg)');
  b.event('keydown',{key:'Tab'}); assert.equal(b.cursor.hidden,true);
  b.stop(); assert.equal(b.cursor.removed,true); assert.equal(b.doc.documentElement.classes.size,0);
  b.tick(); assert.equal(triangle.style.transform,'rotate(480deg)');
});
test('touch input keeps native cursors; reduced motion skips rotations', () => {
  const touch = browser({fine:false}); touch.move(new touch.Element()); assert.equal(touch.cursor.hidden,true); touch.stop();
  const b = browser({reduced:true}); b.move(new b.Element()); b.tick();
  assert.equal(b.cursor.children[0].style.transform,undefined); b.stop();
});
test('background spotlight uses coordinates relative to About; text inputs retain their cursor', () => {
  const b = browser(); const target = new b.Element(); const section = new b.Element();
  target.matches = {'#about':section}; b.move(target);
  assert.equal(section.values.get('--spot-x'),'80px'); assert.equal(section.values.get('--spot-y'),'60px');
  target.matches = {'input,textarea,[contenteditable="true"]':target}; b.move(target);
  assert.equal(b.cursor.hidden,true); assert.equal(b.doc.documentElement.classes.size,0); b.stop();
});
