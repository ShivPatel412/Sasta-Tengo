import test from 'node:test';
import assert from 'node:assert/strict';
import {groups,nodes,edges,nodeWidth,nodeHeight,clampNode,connectionPath,neighbors} from '../lib/stack-map.mjs';
test('skill map connections resolve and related-node tracing is symmetric',()=>{
  const ids=new Set(nodes.map(n=>n.id));assert.equal(ids.size,nodes.length);
  for(const [a,b] of edges){assert.ok(ids.has(a)&&ids.has(b));assert.ok(neighbors(a).has(b));assert.ok(neighbors(b).has(a));}
});
test('dragging stays inside the layer and produces finite connecting paths',()=>{
  for(const node of nodes){
    const group=groups.find(g=>g.id===node.group);
    for(const [x,y] of [[-10000,-10000],[10000,10000],[node.x,node.y]]){
      const p=clampNode(node,x,y);assert.ok(p.x>=group.x&&p.y>=group.y+58);
      assert.ok(p.x+nodeWidth<=group.x+group.width&&p.y+nodeHeight<=group.y+group.height);
      const path=connectionPath(p,{x:node.x+100,y:node.y+100});assert.ok(!/NaN|Infinity/.test(path));assert.match(path,/^M /);
    }
  }
});
