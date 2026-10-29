import test from 'node:test';
import assert from 'node:assert/strict';
import {magneticTarget,stepGridPoint} from '../lib/magnetic-grid.mjs';
test('grid attraction is local, bounded and safe at the pointer center',()=>{
  assert.deepEqual(magneticTarget(10,10,{active:false}),{x:10,y:10,influence:0});
  assert.deepEqual(magneticTarget(500,500,{active:true,x:0,y:0}),{x:500,y:500,influence:0});
  const center=magneticTarget(10,10,{active:true,x:10,y:10});assert.equal(center.x,10);assert.equal(center.y,10);
  const near=magneticTarget(20,20,{active:true,x:70,y:70});assert.ok(near.x>20&&near.y>20);assert.ok(Math.hypot(near.x-20,near.y-20)<=18);
});
test('deformed points settle back to their original positions without drifting',()=>{
  const point={x:40,y:75,vx:0,vy:0};
  for(let i=0;i<300;i++)stepGridPoint(point,{x:25,y:50});
  assert.ok(Math.hypot(point.x-25,point.y-50)<.001);
  assert.ok(Math.hypot(point.vx,point.vy)<.001);
});
