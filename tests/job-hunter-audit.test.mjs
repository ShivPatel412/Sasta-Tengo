import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {getDashboardJobs,getDashboardJobDetails,getDashboardStats,getDashboardTasks,updateJobStatus,updateJobDraft} from '../lib/job-hunter.mjs';
import {resume,verificationJobId} from './fixtures/job-hunter.mjs';

function configured(t){
 const before={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY};
 process.env.SUPABASE_URL='https://audit-fixture.supabase.co';process.env.SUPABASE_SECRET_KEY='fixture-server-key';
 t.after(()=>{for(const[key,value]of Object.entries(before))value===undefined?delete process.env[key]:process.env[key]=value;});
}

test('successful PostgREST empty PATCH responses do not become dashboard failures',async t=>{
 configured(t);
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  calls.push({url,options});
  return options.method==='PATCH'?new Response(null,{status:204}):Response.json([{id:verificationJobId,kind:'resume'}]);
 });
 assert.equal((await updateJobStatus(verificationJobId,'approved')).success,true);
 assert.equal((await updateJobDraft(verificationJobId,resume)).success,true);
 const patch=calls.at(-1),saved=JSON.parse(patch.options.body);
 assert.equal(saved.review_required,true);assert.equal(saved.content.review_required,true);
 assert.equal(saved.content_hash,createHash('sha256').update(JSON.stringify(saved.content)).digest('hex'));
});

test('edited job documents retain review gates and validate against their stored kind',async t=>{
 configured(t);let patches=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  if(options.method==='PATCH'){patches++;return Response.json([{id:verificationJobId}]);}
  return Response.json([{id:verificationJobId,kind:'resume'}]);
 });
 await assert.rejects(updateJobDraft(verificationJobId,{cover_letter:'wrong document kind'}));
 assert.equal(patches,0);
 await updateJobDraft(verificationJobId,{...resume,review_required:false});assert.equal(patches,1);
 globalThis.fetch.mock.mockImplementation(async()=>Response.json([]));
 await assert.rejects(updateJobDraft(verificationJobId,resume),/Draft not found/);
});

test('jobs pagination preserves exact totals and normalizes the one-to-one score relationship',async t=>{
 configured(t);let requested;
 t.mock.method(globalThis,'fetch',async(url)=>{requested=new URL(url);return Response.json([{id:verificationJobId,scores:{score:85}}],{headers:{'Content-Range':'25-25/101'}});});
 const result=await getDashboardJobs({page:2,limit:25});
 assert.equal(result.total,101);assert.equal(result.jobs.length,1);assert.equal(result.jobs[0].scores[0].score,85);
 assert.equal(requested.searchParams.get('offset'),'25');
 const details=await getDashboardJobDetails(verificationJobId);assert.equal(details.job.scores[0].score,85);
});

test('score bands filter joined scores before pagination without dropping either bound',async t=>{
 configured(t);let requested;
 t.mock.method(globalThis,'fetch',async url=>{requested=new URL(url);return Response.json([],{headers:{'Content-Range':'*/0'}});});
 const result=await getDashboardJobs({score_min:60,score_max:79,search:'Acme, Inc'});
 assert.equal(result.total,0);assert.equal(requested.searchParams.get('scores.and'),'(score.gte.60,score.lte.79)');
 assert.equal(requested.searchParams.has('overall_score'),false);
 assert.match(requested.searchParams.get('select'),/scores:job_hunter_scores!inner/);
 assert.equal(requested.searchParams.get('or'),'(title.ilike."*Acme, Inc*",company.ilike."*Acme, Inc*",location.ilike."*Acme, Inc*")');
 await assert.rejects(getDashboardJobs({score_min:80,score_max:50}),/Score bounds/);
 await assert.rejects(getDashboardJobs({score_min:NaN}),/Score bounds/);
});

test('Job Hunter storage failures remain unavailable rather than becoming empty successful stats or tasks',async t=>{
 configured(t);
 t.mock.method(globalThis,'fetch',async()=>Response.json({message:'private upstream failure'},{status:503}));
 await assert.rejects(getDashboardStats(),/could not save or read/);
 await assert.rejects(getDashboardTasks(),/could not save or read/);
});
