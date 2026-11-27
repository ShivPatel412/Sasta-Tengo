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
test('V7 reports attempted, corrected, unresolved and approved as distinct receipt counts',()=>{
 const data={...input,upstream:{analysis_total:219,analysis_complete:219,reviews_flagged:61,
  reviews_attempted:61,reviews_corrected:13,reviews_unresolved:48,context_proposals:131,
  approved_candidates:null,export_gate:'WAITING_EXPORT'},
  publishing:{real:{instagram:{DRAFT:1,upload_session:'secret'},youtube:{PROCESSING:2}}},
  candidate_import:{status:'WAITING_EXPORT',handoff:'/private/receipt'}};
 const result=gamingV7(data,now);
 assert.equal(result.upstream.reviews_attempted,61);
 assert.equal(result.upstream.reviews_corrected,13);
 assert.equal(result.upstream.reviews_unresolved,48);
 assert.equal(result.upstream.approved_candidates,null);
 assert.equal(result.publishing.real.youtube.PROCESSING,2);
 assert.equal(result.publishing.real.instagram.upload_session,undefined);
 assert.equal(result.candidate_import.handoff,undefined);
 assert.deepEqual(gamingV7(result,now),result);
});
test('V7 retains cancellation and exact QA lifecycle while ignoring invalid counts',()=>{
 const result=gamingV7({...input, jobs:[{...input.jobs[0],status:'CANCELLED',
  stage:'production_qa_started',quality_status:'NOT_REPORTED'}],
  upstream:{reviews_attempted:-1,approved_candidates:1.5}},now);
 assert.equal(result.jobs[0].status,'CANCELLED');
 assert.equal(result.jobs[0].stage,'production_qa_started');
 assert.equal(result.upstream.reviews_attempted,null);
 assert.equal(result.upstream.approved_candidates,null);
 assert.equal(result.counts.mock.complete,0);
});

