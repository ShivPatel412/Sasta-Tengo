import test from 'node:test';
import assert from 'node:assert/strict';
import {adminApi,jsonRequest} from '../lib/dashboard-client.mjs';
test('concurrent dashboard reads share a request but completed data is never cached',async()=>{
  const original=globalThis.fetch;let calls=0,release;
  globalThis.fetch=async()=>{calls++;return new Promise(resolve=>{release=()=>resolve(Response.json({count:calls}));});};
  try{
    const first=adminApi('test-read'),second=adminApi('test-read');assert.equal(calls,1);
    release();assert.deepEqual(await first,await second);
    const fresh=adminApi('test-read');assert.equal(calls,2);release();assert.equal((await fresh).count,2);
  }finally{globalThis.fetch=original;}
});
test('writes are not shared and invalidate any pending read for a subsequent refresh',async()=>{
  const original=globalThis.fetch;let reads=0,writes=0,release;
  globalThis.fetch=async(_,options)=>{
    if(options.method==='PUT'){writes++;return Response.json({ok:true});}
    reads++;if(reads===1)return new Promise(resolve=>{release=()=>resolve(Response.json({version:'old'}));});
    return Response.json({version:'new'});
  };
  try{
    const old=adminApi('test-mutation');await Promise.all([adminApi('test-mutation',jsonRequest('PUT',{})),adminApi('test-mutation',jsonRequest('PUT',{}))]);
    assert.equal(writes,2);assert.equal((await adminApi('test-mutation')).version,'new');assert.equal(reads,2);release();await old;
  }finally{globalThis.fetch=original;}
});
test('failed requests preserve the server message and can be retried',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>++calls===1?Response.json({message:'Temporary outage'},{status:503}):Response.json({ok:true});
  try{await assert.rejects(adminApi('test-error'),/Temporary outage/);assert.deepEqual(await adminApi('test-error'),{ok:true});}finally{globalThis.fetch=original;}
});
