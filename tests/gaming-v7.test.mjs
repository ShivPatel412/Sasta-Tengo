import test from 'node:test';
import assert from 'node:assert/strict';
import {gamingV7} from '../lib/gaming-v7.mjs';

const now=Date.now();
const input={schema:'v7-production-progress-v1',updated_utc:new Date(now).toISOString(),
 jobs:[{id:'a'.repeat(64),mode:'mock',status:'SUCCEEDED',attempts:2,active:false,
 expected_frames:3289,completed_frames:3289,upload_session:'secret',path:'/private/asset'}]};
test('V7 status separates mocks and returns only bounded metadata',()=>{
 const result=gamingV7(input,now);
 assert.equal(result.counts.real.complete,0);
 assert.equal(result.counts.mock.complete,1);
 assert.equal(result.jobs[0].upload_session,undefined);
 assert.equal(result.jobs[0].path,undefined);
 assert.equal(result.public_release_enabled,false);
});
test('V7 status marks stale and rejects malformed feed and IDs',()=>{
 assert.equal(gamingV7(input,now+180000).fresh,false);
 assert.equal(gamingV7({...input,schema:'unexpected'},now),null);
 assert.equal(gamingV7({...input,updated_utc:'invalid'},now),null);
 assert.equal(gamingV7({...input,jobs:[{id:'../private',mode:'real'}]},now).jobs.length,0);
});

