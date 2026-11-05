import test from 'node:test';
import assert from 'node:assert/strict';
import {movement,interactionTarget,stations,cameraModes} from '../lib/hq.mjs';
test('HQ movement is normalized, camera relative and running is bounded',()=>{
  assert.deepEqual(movement(new Set(),0),{x:0,z:0});
  const forward=movement(new Set(['KeyW']),0);assert.equal(forward.z,-2.7);
  const diagonal=movement(new Set(['KeyW','KeyD']),0);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-2.7)<1e-9);
  const turned=movement(new Set(['KeyW']),Math.PI/2);assert.ok(Math.abs(turned.x+2.7)<1e-9);
  assert.equal(movement(new Set(['KeyW','ShiftLeft']),0).z,-5);
});
test('interactions require proximity and aim, and only choose the closest station',()=>{
  const items=[{id:'near',position:[0,1,-2]},{id:'far',position:[0,1,-2.5]}];
  assert.equal(interactionTarget([0,1,0],[0,0,-1],items).id,'near');
  assert.equal(interactionTarget([0,1,0],[0,0,1],items),null);
  assert.equal(interactionTarget([0,1,5],[0,0,-1],items),null);
  assert.equal(new Set(stations.map(item=>item.id)).size,stations.length);
  assert.equal(cameraModes.length,4);
});
