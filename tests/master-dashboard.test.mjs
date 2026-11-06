import test from 'node:test';
import assert from 'node:assert/strict';
import {controlSections,isLocalMaster,snapshotFresh} from '../lib/master-dashboard.mjs';
import {controlSnapshot,requireLocalMaster} from '../lib/control-room.mjs';

test('master mode is explicitly local and never enabled in production',()=>{
  assert.equal(isLocalMaster({NODE_ENV:'development',MASTER_DASHBOARD_LOCAL:'1'}),true);
  for(const env of [{NODE_ENV:'production',MASTER_DASHBOARD_LOCAL:'1'},{NODE_ENV:'development'},{}])assert.equal(isLocalMaster(env),false);
  assert.deepEqual(Object.keys(controlSections),['workflows','agents','cloud','services']);
});
test('collector freshness never turns missing, stale or future data into live metrics',()=>{
  const now=Date.parse('2026-11-06T10:00:00Z');
  assert(snapshotFresh({updated_at:'2026-11-06T09:59:00Z'},now));
  for(const updated_at of [null,'invalid','2026-11-06T09:50:00Z','2026-11-07T10:00:00Z'])assert(!snapshotFresh({updated_at},now));
});
test('master snapshot reads only configured metadata and omits unrelated state',async()=>{
  const snapshot={updated_at:'2026-11-06T10:00:00Z',n8n:{workflows:[]},private_config:'never expose'};let requested;
  const result=await controlSnapshot({CONTROL_ROOM_SNAPSHOT_PATH:'/test/snapshot.json'},async file=>{requested=file;return JSON.stringify(snapshot);},async()=>({size:100}));
  assert.equal(requested,'/test/snapshot.json');assert(!('private_config' in result));assert.deepEqual(result.n8n,{workflows:[]});
});
test('missing, oversized or non-snapshot files fail clearly without disclosing paths',async()=>{
  for(const value of ['{}','not-json',JSON.stringify({password:'secret'})])await assert.rejects(controlSnapshot({},async()=>value,async()=>({size:10})),/collector is not connected/);
  let read=false;await assert.rejects(controlSnapshot({},async()=>{read=true;},async()=>({size:3_000_000})),/collector is not connected/);assert.equal(read,false);
});
test('master bridge is unavailable outside local development',()=>{
  const before={NODE_ENV:process.env.NODE_ENV,MASTER_DASHBOARD_LOCAL:process.env.MASTER_DASHBOARD_LOCAL};
  process.env.NODE_ENV='production';process.env.MASTER_DASHBOARD_LOCAL='1';
  assert.throws(requireLocalMaster,/Not found/);
  for(const [k,v] of Object.entries(before))v===undefined?delete process.env[k]:process.env[k]=v;
});
