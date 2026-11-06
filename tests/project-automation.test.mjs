import test from 'node:test';
import assert from 'node:assert/strict';
import { automationAuth, automationDraft, ingestDraft, reviewDraft, ingestAutomation } from '../lib/project-automation.mjs';

process.env.PROJECT_GITHUB_OWNER='octocat';
const project={title:'Example',description:'A real description',technologies:['JavaScript'],category:'web',github_url:'https://github.com/octocat/example',live_url:null,poster:'https://media.example/cover.jpg',gallery:[],order:0,is_featured:false};
const input={repository:'octocat/example',revision:'a'.repeat(64),project,provenance:{generated_at:'2026-11-05T12:00:00Z',text_model:'configured-text',image_model:'configured-image',screenshot_url:null,captured_at:null,warnings:[]}};
function db(handler){const calls=[];return {calls,run:work=>work({execute:async(sql,values)=>{calls.push({sql,values});return [await handler(sql,values)];}})};}

test('machine auth fails closed; signed key does not imply a user publishing session',()=>{
  delete process.env.PROJECT_AUTOMATION_KEY;
  assert.throws(()=>automationAuth(new Request('https://example.com')),/not configured/);
  process.env.PROJECT_AUTOMATION_KEY='x'.repeat(40);
  assert.throws(()=>automationAuth(new Request('https://example.com',{headers:{authorization:'Bearer bad'}})),/Unauthorized/);
  assert.doesNotThrow(()=>automationAuth(new Request('https://example.com',{headers:{authorization:'Bearer '+'x'.repeat(40)}})));
});
test('draft evidence binds the configured repository and real capture metadata',()=>{
  assert(automationDraft.safeParse(input).success);
  assert(!automationDraft.safeParse({...input,repository:'other/example'}).success);
  assert(!automationDraft.safeParse({...input,provenance:{...input.provenance,screenshot_url:'https://example.com'}}).success);
  assert(!automationDraft.safeParse({...input,project:{...project,poster:null}}).success);
});
test('duplicate callbacks do not reset a published or rejected draft',async()=>{
  for(const status of ['published','rejected','pending']){
    const store=db(sql=>sql.startsWith('SELECT')?[{id:2,status,revision:input.revision}]:{});
    assert.equal((await ingestDraft(input,store.run)).unchanged,true);
    assert(!store.calls.some(c=>c.sql.startsWith('UPDATE')));
  }
});
test('changed revision stages an update without touching live projects',async()=>{
  const store=db(sql=>sql.includes('FROM project_automation_drafts')?[{id:2,status:'published',revision:'b'.repeat(64),project_id:7}]:sql.includes('SELECT updated_at')?[{updated_at:'2026-11-05 12:00:00'}]:{});
  assert.equal((await ingestDraft(input,store.run)).status,'pending');
  assert(store.calls.some(c=>c.sql.includes("status='pending'")));
  assert(!store.calls.some(c=>c.sql.startsWith('UPDATE projects')||c.sql.startsWith('INSERT INTO `projects`')));
});
test('stale approvals and edited live projects fail before changing project data',async()=>{
  const stale=db(()=>[{revision:'b'.repeat(64)}]);
  await assert.rejects(reviewDraft('2',{action:'publish',revision:input.revision},{id:1},stale.run),/newer repository/);
  const changed=db(sql=>sql.includes('FROM project_automation_drafts')?[{revision:input.revision,payload:JSON.stringify(project),status:'pending',project_id:7,project_updated_at:'old'}]:sql.includes('FROM projects WHERE id')?[{updated_at:'new'}]:[{id:1}]);
  await assert.rejects(reviewDraft('2',{action:'publish',revision:input.revision},{id:1},changed.run),/live project changed/);
  assert(!changed.calls.some(c=>c.sql.startsWith('UPDATE projects')));
});
test('approved update preserves featured position and manually added media',async()=>{
  const store=db(sql=>sql.includes('FROM project_automation_drafts')?[{revision:input.revision,payload:JSON.stringify(project),status:'pending',project_id:7,project_updated_at:'same'}]:sql.includes('FROM projects WHERE id')?[{updated_at:'same',is_featured:1,order:8,gallery:'["projects/manual.jpg"]'}]:[{id:1}]);
  const result=await reviewDraft('2',{action:'publish',revision:input.revision},{id:1},store.run);
  assert.equal(result.project_id,'7');
  const update=store.calls.find(c=>c.sql.startsWith('UPDATE projects'));
  assert(update.values.includes(8));assert(update.values.includes(true));assert(update.values.includes('["projects/manual.jpg"]'));
});
test('rejecting and repeating publish never insert a second project',async()=>{
  const published=db(()=>[{revision:input.revision,status:'published',project_id:7}]);
  assert.equal((await reviewDraft('2',{action:'publish',revision:input.revision},{id:1},published.run)).unchanged,true);
  assert.equal(published.calls.length,1);
  const rejected=db(sql=>sql.startsWith('SELECT')?[{revision:input.revision,status:'pending',payload:JSON.stringify(project)}]:{});
  await reviewDraft('2',{action:'reject',revision:input.revision},{id:1},rejected.run);
  assert(!rejected.calls.some(c=>c.sql.includes('INSERT INTO `projects`')));
});

test('private local cover URLs are accepted only in explicit local development',()=>{
  const before={NODE_ENV:process.env.NODE_ENV,MASTER_DASHBOARD_LOCAL:process.env.MASTER_DASHBOARD_LOCAL};
  const local={...input,project:{...project,poster:'/api/admin/project-media/'+'a'.repeat(64)+'.jpg'}};
  try{
    process.env.NODE_ENV='development';process.env.MASTER_DASHBOARD_LOCAL='1';assert(automationDraft.safeParse(local).success);
    process.env.NODE_ENV='production';assert(!automationDraft.safeParse(local).success);
  }finally{for(const [k,v] of Object.entries(before))v===undefined?delete process.env[k]:process.env[k]=v;}
});

test('a project with a missing AI cover cannot be approved',async()=>{
  const store=db(()=>[{revision:input.revision,status:'pending',payload:JSON.stringify(project),provenance:JSON.stringify({cover_status:'unavailable'})}]);
  await assert.rejects(reviewDraft('2',{action:'publish',revision:input.revision},{id:1},store.run),/AI cover generation is pending/);
  assert.equal(store.calls.length,1);
});

test('automatic publishing requires explicit configuration and real screenshot evidence',async()=>{
  let reviews=0;
  const dependencies={ingest:async()=>({id:'2',status:'pending'}),review:async()=>{reviews++;return {project_id:'7'};},lookup:async()=>[{id:1}],env:{ADMIN_EMAIL:'owner@example.com'}};
  assert.equal((await ingestAutomation(input,dependencies)).status,'pending');
  dependencies.env.PROJECT_AUTOMATION_AUTO_PUBLISH='1';
  assert.equal((await ingestAutomation(input,dependencies)).waiting_for_screenshot,true);
  assert.equal(reviews,0);
  const captured={...input,project:{...project,live_url:'https://example.com',gallery:['https://media.example/screen.jpg']},provenance:{...input.provenance,screenshot_url:'https://example.com',captured_at:input.provenance.generated_at}};
  assert.equal((await ingestAutomation(captured,dependencies)).status,'published');
  assert.equal(reviews,1);
  dependencies.ingest=async()=>({id:'2',status:'rejected'});
  assert.equal((await ingestAutomation(captured,dependencies)).status,'rejected');
  assert.equal(reviews,1);
  dependencies.ingest=async()=>({id:'2',status:'pending'});dependencies.lookup=async()=>[];
  await assert.rejects(ingestAutomation(captured,dependencies),/administrator does not exist/);
});

test('a successful screenshot retry updates pending evidence while preserving edited text',async()=>{
  const captured={...input,project:{...project,live_url:'https://example.com',gallery:['https://media.example/screen.jpg']},provenance:{...input.provenance,screenshot_url:'https://example.com',captured_at:input.provenance.generated_at}};
  const store=db(sql=>sql.startsWith('SELECT')?[{id:2,status:'pending',revision:input.revision,payload:JSON.stringify({...project,title:'Edited title',live_url:'https://example.com'})}]:{});
  await ingestDraft(captured,store.run);
  const update=store.calls.find(c=>c.sql.startsWith('UPDATE'));
  assert.equal(JSON.parse(update.values[0]).title,'Edited title');
  assert.deepEqual(JSON.parse(update.values[0]).gallery,captured.project.gallery);
});

test('a recovered AI cover upgrades a pending draft without a live website',async()=>{
  const store=db(sql=>sql.startsWith('SELECT')?[{id:2,status:'pending',revision:input.revision,payload:JSON.stringify({...project,title:'Edited title'}),provenance:JSON.stringify({...input.provenance,cover_status:'unavailable'})}]:{});
  await ingestDraft(input,store.run);
  const update=store.calls.find(c=>c.sql.startsWith('UPDATE'));
  assert.equal(JSON.parse(update.values[0]).title,'Edited title');
  assert.equal(JSON.parse(update.values[0]).poster,project.poster);
  assert.equal(JSON.parse(update.values[1]).cover_status,'generated');
});
