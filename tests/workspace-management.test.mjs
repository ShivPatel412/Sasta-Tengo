import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {taskSchema,createTask,listTasks,updateTask} from '../lib/workspace-tasks.mjs';
import {leadStageSchema,listLeads,moveLead} from '../lib/workspace-crm.mjs';
import {configuredWorkflows,workflowList,executeWorkflow} from '../lib/workspace-workflows.mjs';

test('task validation bounds input and rejects invalid dates, stages and owner injection',()=>{
  const base={title:'Ship dashboard',project_name:'Website',due_date:'2026-11-20'};
  assert.equal(taskSchema.parse(base).status,'todo');
  for(const extra of [{owner_id:99},{status:'published'},{title:' '},{due_date:'2026-02-31'},{description:'x'.repeat(10001)}])assert.equal(taskSchema.safeParse({...base,...extra}).success,false);
});
test('task create and search always scope queries to the signed-in owner',async()=>{
  let saved;
  const created=await createTask(7,{title:'First task'},async(sql,values)=>{saved={sql,values};return {insertId:'9007199254740993'};});
  assert.equal(created.id,'9007199254740993');assert.equal(saved.values[0],7);assert.match(saved.sql,/INSERT INTO next_workspace_tasks/);
  const calls=[];
  const result=await listTasks(7,new URL('https://example.test/?page=2&search=%27%20OR%201%3D1&status=review'),async(sql,values)=>{calls.push({sql,values});return sql.includes('COUNT(')?[{total:103}]:[{id:'3'}];});
  assert.equal(result.page,2);assert.equal(result.count,103);
  for(const call of calls){assert.match(call.sql,/owner_id=\?/);assert.equal(call.values[0],7);assert(!call.sql.includes("' OR 1=1"));assert.equal(call.values.at(-1),'review');}
  assert.match(calls[0].sql,/OFFSET 100/);
});
test('task moves use optimistic versions and cannot modify another owner’s task',async()=>{
  let mutation;
  const result=await updateTask(7,'42',{status:'done',version:3},true,async(sql,values)=>{mutation={sql,values};return {affectedRows:1};});
  assert.equal(result.version,4);assert.match(mutation.sql,/WHERE id=\? AND owner_id=\? AND version=\?/);assert.deepEqual(mutation.values,['done','42',7,3]);
  await assert.rejects(()=>updateTask(7,'42',{status:'done',version:3},true,async sql=>sql.startsWith('UPDATE')?{affectedRows:0}:[{id:'42'}]),error=>error.status===409);
  await assert.rejects(()=>updateTask(7,'42',{status:'done',version:3},true,async sql=>sql.startsWith('UPDATE')?{affectedRows:0}:[]),error=>error.status===404);
  await assert.rejects(()=>updateTask(7,'42 OR 1=1',{status:'done',version:3},true),error=>error.status===404);
});
test('CRM list includes both form sources and stage moves preserve every original answer',async()=>{
  const calls=[];
  const result=await listLeads(new URL('https://example.test/?stage=qualified&search=hello'),async(sql,values)=>{calls.push({sql,values});return sql.includes('COUNT(')?[{total:1}]:[{id:'2',resource:'contacts'}];});
  assert.equal(result.count,1);assert.match(calls[0].sql,/UNION ALL/);assert.deepEqual(calls[0].values,['qualified','%hello%','%hello%','%hello%','%hello%']);
  let update;
  await moveLead('appointments','42',{lead_status:'contacted'},async(sql,values)=>{update={sql,values};return {affectedRows:1};});
  assert.match(update.sql,/SET lead_status=\?,updated_at/);assert(!update.sql.includes('request_data'));assert.deepEqual(update.values,['contacted','42']);
  assert.equal(leadStageSchema.safeParse({lead_status:'new',request_data:{}}).success,false);
  await assert.rejects(()=>moveLead('users','1',{lead_status:'new'}),error=>error.status===404);
});

const secret='fixture-only-key-'.repeat(3);
const config=url=>({WORKSPACE_N8N_WORKFLOWS:JSON.stringify([{id:'sync',name:'GitHub sync',url,key:secret}])});
test('workflow targets are explicitly configured, authenticated HTTPS production webhooks',()=>{
  const valid=config('https://n8n.shivpatel.in/webhook/github-sync');
  assert.equal(configuredWorkflows(valid).length,1);
  for(const url of ['http://n8n.shivpatel.in/webhook/a','https://evil.test/webhook/a','https://n8n.shivpatel.in.evil/webhook/a','https://key@n8n.shivpatel.in/webhook/a','https://n8n.shivpatel.in/webhook-test/a','https://n8n.shivpatel.in/webhook/a?key=secret','https://n8n.shivpatel.in:999/webhook/a'])assert.throws(()=>configuredWorkflows(config(url)),error=>error.status===503);
  const list=workflowList({n8n:{workflows:[{id:'other',name:'Read only'}]}},valid);
  assert.equal(list.find(row=>row.id==='sync').runnable,true);assert.equal(list.find(row=>row.id==='other').runnable,false);
  assert(!JSON.stringify(list).includes(secret));assert(!JSON.stringify(list).includes('/webhook/'));
});
test('workflow dispatch is authenticated and acknowledges acceptance without claiming completion',async()=>{
  const calls=[],requestId='15308ac8-5ec5-45d6-9951-0b63260b8102';let sent;
  const result=await executeWorkflow(7,'sync',{requestId},{env:config('https://n8n.shivpatel.in/webhook/github-sync'),
    run:async(sql,values)=>{calls.push({sql,values});return {affectedRows:1};},send:async(url,options)=>{sent={url,options};return new Response('{}',{status:202});}});
  assert.equal(result.state,'accepted');assert.equal(result.duplicate,false);assert.equal(sent.options.redirect,'error');
  assert.equal(sent.options.headers['X-Workspace-Key'],secret);assert.equal(sent.options.headers['Idempotency-Key'],requestId);
  assert(!sent.options.body.includes(secret));assert.equal(calls[0].values[1],7);assert.equal(calls.at(-1).values[0],'accepted');
});
test('repeated execution request IDs never re-dispatch, and ambiguous timeouts never auto-retry',async()=>{
  const requestId='15308ac8-5ec5-45d6-9951-0b63260b8102',env=config('https://n8n.shivpatel.in/webhook/github-sync');let sent=0;
  const duplicate=await executeWorkflow(7,'sync',{requestId},{env,run:async sql=>sql.startsWith('INSERT')?{affectedRows:0}:[{workflow_id:'sync',state:'accepted'}],send:async()=>{sent++;}});
  assert.equal(duplicate.duplicate,true);assert.equal(sent,0);
  const timeout=await executeWorkflow(7,'sync',{requestId},{env,run:async()=>({affectedRows:1}),send:async()=>{sent++;throw new Error('private transport information');}});
  assert.equal(timeout.state,'uncertain');assert.equal(sent,1);assert(!JSON.stringify(timeout).includes('private'));
  await assert.rejects(()=>executeWorkflow(7,'not-allowed',{requestId},{env}),error=>error.status===409);
});
test('workspace API routes retain session, exact-origin and read-only gates',async()=>{
  for(const resource of ['tasks','crm','workflows']){
    const source=await readFile(new URL(`../app/api/admin/${resource}/[[...path]]/route.js`,import.meta.url),'utf8');
    assert.match(source,/await admin\(\)/);assert.match(source,/sameOrigin\(request\)/);assert.match(source,/assertWritable\(\)/);assert.match(source,/Cache-Control.*no-store/);
  }
});

test('workflow monitoring preserves publication and AI metadata without leaking source fields',()=>{
 const result=workflowList({n8n:{workflows:[{id:42,name:'Real workflow',active:true,agent_count:'2',updated_at:'2026-11-16T09:00:00Z',nodes:['private']}]}},{});
 assert.deepEqual(result,[{id:'42',name:'Real workflow',active:true,agent_count:2,updated_at:'2026-11-16T09:00:00Z',runnable:false}]);
});

test('configured hooks outside the scoped folder are not appended to dashboard workflows',()=>{
 const snapshot={n8n:{scope:{folder_id:'zgcQe77hWdgdwdQZ'},workflows:[{id:'personal',name:'Personal workflow'}]}};
 assert.deepEqual(workflowList(snapshot,config('https://n8n.shivpatel.in/webhook/github-sync')).map(row=>row.id),['personal']);
});
