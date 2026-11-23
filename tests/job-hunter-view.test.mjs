import test from 'node:test';
import assert from 'node:assert/strict';
import {jobScore,jobUrl,jobsQuery,draftText,jobActivity,localDateInput,JOB_PAGE_SIZE} from '../lib/job-hunter-view.mjs';
test('application date follows the local calendar including shortly after midnight',()=>{
 assert.equal(localDateInput(new Date(2026,0,2,0,30)),'2026-01-02');
});
test('job match display preserves zero and accepts both score relationship shapes',()=>{
 assert.equal(jobScore({scores:[{score:0}]}).score,0);
 assert.equal(jobScore({scores:{score:81}}).score,81);
 assert.equal(jobScore({scores:[]}),null);
 assert.equal(jobScore({scores:[{score:'unknown'}]}),null);
});
test('job filters encode search safely and keep server pagination and score bounds',()=>{
 const query=new URL(jobsQuery({page:3,search:' React, remote & UI ',source:'linkedin',status:'interview',match:'moderate'}),'https://test.invalid/');
 assert.equal(query.searchParams.get('search'),'React, remote & UI');assert.equal(query.searchParams.get('limit'),String(JOB_PAGE_SIZE));assert.equal(query.searchParams.get('page'),'3');
 assert.equal(query.searchParams.get('score_min'),'60');assert.equal(query.searchParams.get('score_max'),'79');assert.equal(query.searchParams.get('status'),'interview');
 assert.equal(new URL(jobsQuery({match:'low'}),'https://test.invalid').searchParams.get('score_max'),'59');
});
test('application links reject script and credential URLs',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','https://user:pass@example.com','not a url',null])assert.equal(jobUrl(url),null);
 assert.equal(jobUrl('https://example.com/jobs/123'),'https://example.com/jobs/123');
});
test('download format is truthful plain text and preserves all supplied document fields',()=>{
 const text=draftText({kind:'application',content:{cover_letter:'<script>not executed</script>',screening_answers:[{question:'Location?',draft:'Remote'}],review_required:true}});
 assert.match(text,/review before use/);assert.match(text,/Cover Letter/);assert.match(text,/Location/);assert.match(text,/<script>/);assert.doesNotMatch(text,/Review Required\ntrue/);
});
test('activity uses actual timestamps and never invents status history',()=>{
 const events=jobActivity({created_at:'2026-11-01T12:00:00Z',status:'interview',applied_at:'2026-11-08T12:00:00Z',scores:[{id:'a',created_at:'2026-11-02T12:00:00Z'}],drafts:[{id:'b',kind:'resume',created_at:'invalid'}]});
 assert.equal(events.length,3);assert.equal(events[0].title,'Marked as applied');assert.equal(events[2].title,'Job discovered');assert(!events.some(e=>/Interview/.test(e.title)));
 assert.deepEqual(jobActivity(null),[]);
});
