import test from 'node:test';
import assert from 'node:assert/strict';
import { submitReelJob, reelConnection, reelSubmission, reelWorkerReady } from '../lib/reel-dispatch.mjs';
import { reelStepStates } from '../lib/funny-reels-tracking.mjs';
const id='12345678-1234-4234-8234-123456789abc';
const input={request_id:id,youtube_url:'https://youtu.be/l-oEKLu4Y3w',max_clips:10,rights_confirmed:true};
const env={REELS_N8N_WEBHOOK_URL:'https://n8n.shivpatel.in/webhook/shiv-os-media-jobs-v1',REELS_N8N_WEBHOOK_AUTH:'fixture-authorization-key-with-more-than-32-characters'};
test('reel submissions require explicit rights, valid source and one to ten clips',async()=>{
  assert.equal(reelSubmission.parse(input).max_clips,10);
  for(const value of [0,11,1.5]) assert.throws(()=>reelSubmission.parse({...input,max_clips:value}));
  assert.throws(()=>reelSubmission.parse({...input,rights_confirmed:false}));
  await assert.rejects(submitReelJob(1,{...input,youtube_url:'https://example.com/'},{env}),/YouTube/);
  assert.equal(reelConnection({...env,REELS_N8N_WEBHOOK_URL:'https://attacker.invalid/'}),null);
});
test('submission accepts only a matching durable worker receipt',async()=>{
  const queries=[];
  const result=await submitReelJob(1,input,{env,run:async(sql,params)=>{queries.push([sql,params]);return {affectedRows:1};},send:async(url,options)=>{
    assert.equal(JSON.parse(options.body).max_clips,10);
    assert.equal(JSON.parse(options.body).job_id,id);
    assert.equal(JSON.parse(options.body).auto_publish,true);
    assert.equal(options.headers.Authorization,env.REELS_N8N_WEBHOOK_AUTH);
    assert.equal(options.redirect,'error');
    return Response.json({accepted:true,job_id:id},{status:202});
  }});
  assert.equal(result.state,'accepted');assert.equal(queries.at(-1)[1][0],'accepted');
});
test('lost acknowledgement is uncertain and the same request never dispatches twice',async()=>{
  let calls=0,inserted=false,state;
  const run=async(sql,params)=>{
    if(sql.startsWith('INSERT')){if(inserted)return {affectedRows:0};inserted=true;return {affectedRows:1};}
    if(sql.startsWith('UPDATE')){state=params[0];return {};}
    return [{workflow_id:'OAlcoDTP5kNRFgrp',state}];
  };
  const send=async()=>{calls++;throw Error('lost receipt');};
  assert.equal((await submitReelJob(1,input,{env,run,send})).state,'uncertain');
  assert.equal((await submitReelJob(1,input,{env,run,send})).duplicate,true);
  assert.equal(calls,1);
});
test('worker requires fresh status, active entry points and the verified clips destination',()=>{
  const snapshot={updated_at:new Date().toISOString(),source_updated_at:{n8n:new Date().toISOString(),automations:new Date().toISOString()},n8n:{workflows:['OAlcoDTP5kNRFgrp','0DlqKnBRQPvkwknF'].map(id=>({id,active:true}))},automations:{funny_reels:{accounts:{instagram:{verified_username:'sastatengo.clips'}}}}};
  assert.equal(reelWorkerReady(snapshot,env),true);
  snapshot.automations.funny_reels.accounts.instagram.verified_username='sastatengo';
  assert.equal(reelWorkerReady(snapshot,env),false);
});
test('timeline marks only recorded milestones, not every step as ready',()=>{
  const steps=reelStepStates({job_id:id,stage:'ANALYZING',events:[{stage:'DOWNLOADING'},{stage:'DOWNLOADED'},{stage:'ANALYZING'}]});
  assert.equal(steps.find(step=>step.key==='DOWNLOADING').status,'Done');
  assert.equal(steps.find(step=>step.key==='ANALYZING').status,'Current step');
  assert.equal(steps.find(step=>step.key==='PUBLISHED').status,'Not reached');
});
