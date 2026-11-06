import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {query,database} from '../lib/db.mjs';

if(process.env.DB_HOST!=='127.0.0.1'||process.env.DB_PORT!=='3307'||process.env.DB_NAME!=='shiv_master_local')throw new Error('This integration test runs only against the isolated local database.');
const base='http://localhost:3001',token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex');
const repository=process.env.PROJECT_GITHUB_OWNER+'/local-integration-'+randomBytes(6).toString('hex');
let draftId,projectId;
async function api(path,{body,auth=true,machine=false,origin=base,raw=false}={}){
  const headers={Origin:origin};
  if(machine)headers.Authorization='Bearer '+process.env.PROJECT_AUTOMATION_KEY;
  else if(auth)headers.Cookie='shiv_admin='+token;
  if(body!==undefined)headers['Content-Type']=raw?'application/octet-stream':'application/json';
  const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:raw?body:JSON.stringify(body),redirect:'manual'});
  return {status:r.status,data:(r.headers.get('content-type')||'').includes('application/json')?await r.json():Buffer.from(await r.arrayBuffer())};
}
try{
  const [owner]=await query('SELECT id FROM users WHERE email=?',[process.env.ADMIN_EMAIL]);assert(owner);
  await query('INSERT INTO next_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE))',[hash,owner.id]);
  const before=Number((await query('SELECT COUNT(*) AS n FROM projects'))[0].n);
  const session=await api('/api/admin/session');assert.equal(session.status,200);assert.equal(session.data.readOnly,false);
  const collector=await api('/api/admin/control-room');assert.equal(collector.status,200);assert(collector.data.n8n.workflows.length>=120);
  const photos=await api('/api/photo-posts/inventory');assert.equal(photos.status,200);
  const worker=await api('/api/admin/project-worker');assert.equal(worker.status,200);assert.equal(worker.data.configured,true);assert.equal(worker.data.schedule_enabled,true);
  assert.equal((await api('/api/admin/project-worker',{auth:false})).status,401);
  const privateApi=await api('/api/admin/project-drafts',{auth:false});assert.equal(privateApi.status,401);
  const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJVoAAAAASUVORK5CYII=','base64');
  const uploaded=await api('/api/jobs/projects',{body:image,machine:true,raw:true});assert.equal(uploaded.status,200);
  assert.equal((await api(uploaded.data.url,{auth:false})).status,401);assert.equal((await api(uploaded.data.url)).status,200);
  const project={title:'Isolated integration test',description:'Temporary local test, not a portfolio claim.',technologies:['Test'],category:'Web Development',github_url:'https://github.com/'+repository,live_url:null,poster:uploaded.data.url,gallery:[],is_featured:false,order:0};
  const input={repository,revision:'c'.repeat(64),project,provenance:{generated_at:new Date().toISOString(),text_model:'integration-test',image_model:'integration-test',screenshot_url:null,captured_at:null,warnings:['Temporary integration fixture.']}};
  const ingested=await api('/api/jobs/projects',{body:input,machine:true});assert.equal(ingested.status,200);draftId=ingested.data.id;
  assert.equal((await api('/api/jobs/projects',{body:input,machine:true})).data.unchanged,true);
  assert.equal((await api('/api/admin/project-drafts/'+draftId,{body:{revision:input.revision,action:'publish'},origin:'https://untrusted.example'})).status,403);
  const published=await api('/api/admin/project-drafts/'+draftId,{body:{revision:input.revision,action:'publish'}});assert.equal(published.status,200);projectId=published.data.project_id;
  const repeated=await api('/api/admin/project-drafts/'+draftId,{body:{revision:input.revision,action:'publish'}});assert.equal(repeated.data.unchanged,true);
  assert.equal(Number((await query('SELECT COUNT(*) AS n FROM projects'))[0].n),before+1);
  const next={...input,revision:'d'.repeat(64)};assert.equal((await api('/api/jobs/projects',{body:next,machine:true})).status,200);
  await query('UPDATE projects SET title=?,updated_at=DATE_ADD(updated_at,INTERVAL 1 SECOND) WHERE id=?',['Manual local test edit',projectId]);
  assert.equal((await api('/api/admin/project-drafts/'+draftId,{body:{revision:next.revision,action:'publish'}})).status,409);
  assert.equal((await api('/api/admin/project-drafts/'+draftId,{body:{revision:next.revision,action:'reject'}})).status,200);
  assert.equal((await api('/api/jobs/projects',{body:next,machine:true})).data.status,'rejected');
  console.log('PASS: authenticated live collector and photo inventory; private media; draft ingestion; duplicate prevention; origin protection; approve/publish; stale-update conflict; rejection.');
}finally{
  if(draftId)await query('DELETE FROM project_automation_drafts WHERE id=? AND repository=?',[draftId,repository.toLowerCase()]);
  if(projectId)await query('DELETE FROM projects WHERE id=? AND github_url=?',[projectId,'https://github.com/'+repository]);
  await query('DELETE FROM next_sessions WHERE token_hash=?',[hash]);
  await database().end();
}
