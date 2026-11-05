import test from 'node:test';
import assert from 'node:assert/strict';
import {worldData,agentState,workflowUrl} from './data.mjs';
import {movement,interactionTarget,stations} from './world.mjs';
const now=Date.parse('2026-11-05T12:00:00Z');
const snapshot={updated_at:new Date(now).toISOString(),source_updated_at:{n8n:new Date(now).toISOString()},n8n:{workflows:[{id:'w1',name:'Real workflow',active:true,agent_count:1}],executions:[],today:{running:0,errors:2}},codex:{threads:[{name:'Chat history'}]},services:[{name:'n8n',state:'running'}]};
test('published workflows never invent a running agent or chat activity',()=>{
  const data=worldData(snapshot,now);assert.equal(data.counts.workflows,1);assert.equal(data.counts.running,0);assert.equal(data.counts.failures,2);assert.equal(agentState(data),'no executions');
  const running=worldData({...snapshot,n8n:{...snapshot.n8n,executions:[{workflow_id:'w1',status:'running'}]}},now);
  assert.equal(agentState(running),'running');assert.equal(running.codex.threads[0].name,'Chat history');
});
test('stale or failed sources retain history but disable live counts and agent animation',()=>{
  for(const data of [worldData(snapshot,now+121000),worldData({...snapshot,errors:{n8n:'TimeoutError'}},now)]){
    assert.equal(data.n8nConnected,false);assert.equal(data.counts.running,null);assert.equal(data.counts.failures,null);assert.equal(agentState(data),'disconnected');assert.equal(data.workflows.length,1);
  }
  assert.equal(workflowUrl('a/b?'), 'https://n8n.shivpatel.in/workflow/a%2Fb%3F');
});
test('movement is normalized, camera-relative and interactions require aim and distance',()=>{
  assert.ok(Math.abs(Math.hypot(...Object.values(movement(new Set(['KeyW','KeyD']),0)))-2.7)<1e-9);
  assert.equal(movement(new Set(['KeyW','ShiftLeft']),0).z,-5);
  const item={id:'pc',position:[0,1,-2]};assert.equal(interactionTarget([0,1,0],[0,0,-1],[item]),item);assert.equal(interactionTarget([0,1,0],[0,0,1],[item]),null);assert.equal(interactionTarget([0,1,8],[0,0,-1],[item]),null);
  assert.equal(new Set(stations.map(item=>item.id)).size,stations.length);
});
