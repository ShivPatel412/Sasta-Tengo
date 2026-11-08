import assert from 'node:assert/strict';
import {randomBytes,createHash,createHmac,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import sharp from 'sharp';
import {query,database} from '../lib/db.mjs';
import {ownedPhoto,decode} from '../lib/instagram-store.mjs';
import {defaultWeights,signature} from '../lib/instagram-core.mjs';
import {newStudioDraft} from '../lib/instagram-editor.mjs';
import {removePhotoBytes} from '../lib/instagram-media.mjs';
import {createJob} from '../lib/instagram-jobs.mjs';
import {saveDraft} from '../lib/instagram-store.mjs';
if(process.env.DB_HOST!=='127.0.0.1'||process.env.DB_PORT!=='3307'||process.env.DB_NAME!=='shiv_master_local')throw Error('This test uses only the isolated local database.');
const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex'),photos=[],drafts=[],jobs=[],albums=[];let owner;
const origin='http://localhost:3001';
async function api(path,{method='GET',body,auth=true,callback,raw=false,sourceOrigin=origin}={}){
 const headers={Origin:sourceOrigin};if(auth)headers.Cookie='shiv_admin='+token;if(callback)headers.Authorization='Bearer '+callback;
 if(body!==undefined)headers['Content-Type']=raw?'application/octet-stream':'application/json';
 const r=await fetch(origin+path,{method,headers,body:body===undefined?undefined:raw?body:JSON.stringify(body),redirect:'manual'});
 const json=r.headers.get('content-type')?.includes('application/json');return {status:r.status,data:json?await r.json():new Uint8Array(await r.arrayBuffer())};
}
try{
 [owner]=await query('SELECT id FROM users WHERE email=?',[process.env.ADMIN_EMAIL]);assert(owner);
 // Studio-only development test counters; the exact isolated database guard above
 // prevents this reset from reaching production or existing login limits.
 for(const kind of ['analysis','edit','upload']){const bucket=createHmac('sha256',process.env.RATE_LIMIT_SECRET).update(`studio:${kind}:${owner.id}:${Math.floor(Date.now()/600000)}`).digest('hex');await query('DELETE FROM next_rate_limits WHERE bucket=?',[bucket]);}
 await query('INSERT INTO next_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE))',[hash,owner.id]);
 assert.equal((await api('/api/admin/instagram',{auth:false})).status,401);
 assert.equal((await api('/api/admin/control-room')).status,200);
 for(let i=0;i<2;i++){
  const bytes=await sharp({create:{width:640,height:800,channels:3,background:i?'#678921':'#987643'}}).png().toBuffer();
  if(i===0){await mkdir('.local',{recursive:true});await writeFile('.local/studio-upload-test.png',bytes);}
  const response=await api('/api/admin/instagram/photos?source='+(i?'phone':'local'),{method:'POST',body:bytes,raw:true});assert.equal(response.status,200,JSON.stringify(response.data));photos.push(response.data.photo.id);
  const repeat=await api('/api/admin/instagram/photos',{method:'POST',body:bytes,raw:true});assert.equal(repeat.data.duplicate,true);assert.equal(repeat.data.photo.id,photos[i]);
 }
 assert.equal((await api('/api/admin/instagram/media/'+photos[0],{auth:false})).status,401);
 assert.equal((await api('/api/admin/instagram/media/'+photos[0])).status,200);
 await assert.rejects(ownedPhoto(999999,photos[0]),/not found/);
 assert.equal((await api('/api/admin/instagram/photos',{method:'POST',body:Buffer.from('<svg/>'),raw:true})).status,422);
 const a=await api('/api/admin/instagram/albums',{method:'POST',body:{name:'Studio integration test'}});assert.equal(a.status,200);albums.push(a.data.id);
 assert.equal((await api('/api/admin/instagram/albums/'+a.data.id,{method:'POST',body:{photo_ids:photos}})).status,200);
 const data=newStudioDraft(photos);data.overrides={[photos[0]]:'lock'};data.caption='Manual caption';
 const saved=await api('/api/admin/instagram/drafts',{method:'POST',body:{project:data}});assert.equal(saved.status,200,JSON.stringify(saved.data));drafts.push(saved.data.id);let draft=saved.data;
 assert.equal((await api('/api/admin/instagram/drafts/'+draft.id,{method:'POST',sourceOrigin:'https://untrusted.example',body:{project:data,revision:draft.revision}})).status,403);
 assert.equal((await api('/api/admin/instagram/drafts/'+draft.id,{method:'POST',body:{project:data,revision:1000}})).status,409);
 const created=await api('/api/admin/instagram/jobs',{method:'POST',body:{draft_id:draft.id}});assert.equal(created.status,200,JSON.stringify(created.data));jobs.push(created.data.id);assert.equal(created.data.state,'waiting_for_n8n');
 const repeat=await api('/api/admin/instagram/jobs',{method:'POST',body:{draft_id:draft.id}});assert.equal(repeat.data.id,created.data.id);
 // Simulated n8n result exercises the real callback; no private photo is sent to AI.
 await query("UPDATE studio_jobs SET attempt=1,state='processing' WHERE id=?",[created.data.id]);
 const result={photos:photos.map(id=>({id,...Object.fromEntries(Object.keys(defaultWeights).map(k=>[k,75])),explanation:'Synthetic fixture, not live AI',description:'Synthetic image',category:'Nature',cover_suitability:80,suggested_crop:'4:5',alt_text:'Synthetic test image',tags:['test']})),order:[...photos].reverse(),captions:['One','Two','Three'],hashtags:['#Test'],music:['Cinematic']};
 const callback={job_id:created.data.id,attempt:1,result},key=signature('STUDIO_CALLBACK_KEY',created.data.id+':1');
 assert.equal((await api('/api/jobs/instagram/callback',{method:'POST',auth:false,body:callback})).status,401);
 const complete=await api('/api/jobs/instagram/callback',{method:'POST',auth:false,callback:key,body:callback});assert.equal(complete.status,200,JSON.stringify(complete.data));assert.equal(complete.data.applied,true);
 assert.equal((await api('/api/jobs/instagram/callback',{method:'POST',auth:false,callback:key,body:callback})).data.unchanged,true);
 let root=(await api('/api/admin/instagram')).data;draft=root.drafts.find(d=>d.id===draft.id);assert.equal(draft.payload.selected[0],photos[0]);assert.equal(draft.payload.caption,'Manual caption');assert.equal(draft.payload.captions.length,3);
 const stale=await api('/api/admin/instagram/jobs',{method:'POST',body:{draft_id:draft.id}});jobs.push(stale.data.id);await query("UPDATE studio_jobs SET attempt=1,state='processing' WHERE id=?",[stale.data.id]);
 const edited=await api('/api/admin/instagram/drafts/'+draft.id,{method:'POST',body:{project:{...draft.payload,caption:'New manual edit'},revision:draft.revision}});assert.equal(edited.status,200);draft=edited.data;
 const late=await api('/api/jobs/instagram/callback',{method:'POST',auth:false,callback:signature('STUDIO_CALLBACK_KEY',stale.data.id+':1'),body:{job_id:stale.data.id,attempt:1,result}});assert.equal(late.data.applied,false);
 const cancelled=await api('/api/admin/instagram/jobs',{method:'POST',body:{draft_id:draft.id}});jobs.push(cancelled.data.id);await query("UPDATE studio_jobs SET attempt=1,state='processing' WHERE id=?",[cancelled.data.id]);
 assert.equal((await api('/api/admin/instagram/jobs/'+cancelled.data.id+'/cancel',{method:'POST',body:{}})).data.state,'cancelled');
 assert.equal((await api('/api/jobs/instagram/callback',{method:'POST',auth:false,callback:signature('STUDIO_CALLBACK_KEY',cancelled.data.id+':1'),body:{job_id:cancelled.data.id,attempt:1,result}})).status,409);
 const approved=await api('/api/admin/instagram/drafts/'+draft.id+'/approve',{method:'POST',body:{revision:draft.revision}});assert.equal(approved.data.status,'approved');
 root=(await api('/api/admin/instagram')).data;assert.equal(root.history.length,0);assert.equal(root.publishing_enabled,false);
 if(process.argv.includes('--browser')){
  const r=spawnSync(resolve('.local/project-worker-venv/Scripts/python.exe'),['scripts/test-instagram-browser.py'],{encoding:'utf8',windowsHide:true,env:{...process.env,STUDIO_TEST_SESSION:token,STUDIO_TEST_DRAFT:draft.id,PLAYWRIGHT_BROWSERS_PATH:resolve('.local/browsers'),PYTHONUTF8:'1'}});console.log(r.stdout);assert.equal(r.status,0,r.stderr);
 }
 // Exercise actual HTTP dispatch and the real callback with a local mock n8n.
 // This proves the transport contract, not Gemini's output quality or credentials.
 const isolated=await saveDraft(owner.id,null,newStudioDraft(photos));drafts.push(isolated.id);
 const previousURL=process.env.STUDIO_N8N_WEBHOOK_URL,previousKey=process.env.STUDIO_N8N_WEBHOOK_KEY;
 process.env.STUDIO_N8N_WEBHOOK_URL='http://127.0.0.1:8794';process.env.STUDIO_N8N_WEBHOOK_KEY=randomBytes(32).toString('hex');
 let finish,fail;const delivered=new Promise((resolve,reject)=>{finish=resolve;fail=reject;});
 const server=createServer(async(req,res)=>{try{
  assert.equal(req.headers.authorization,'Bearer '+process.env.STUDIO_N8N_WEBHOOK_KEY);const parts=[];for await(const chunk of req)parts.push(chunk);const job=JSON.parse(Buffer.concat(parts));assert.equal(job.photos.length,2);
  for(const p of job.photos){const image=await sharp(Buffer.from(p.inline_data.data,'base64')).metadata();assert.equal(image.exif,undefined);assert(Math.max(image.width,image.height)<=768);}
  res.writeHead(202,{'Content-Type':'application/json'});res.end('{"accepted":true}');
  const returned=await api('/api/jobs/instagram/callback',{method:'POST',auth:false,callback:job.callback_token,body:{job_id:job.job_id,attempt:job.attempt,result}});assert.equal(returned.status,200,JSON.stringify(returned.data));finish();
 }catch(e){res.end();fail(e);}});
 await new Promise(resolve=>server.listen(8794,'127.0.0.1',resolve));
 try{const started=await createJob(owner.id,isolated.id);jobs.push(started.id);await delivered;const [completed]=await query('SELECT state FROM studio_jobs WHERE id=?',[started.id]);assert.equal(completed.state,'completed');console.log('PASS: real HTTP dispatch to a loopback mock n8n, normalized previews, immediate acknowledgement and protected callback persistence.');}
 finally{await new Promise(resolve=>server.close(resolve));previousURL===undefined?delete process.env.STUDIO_N8N_WEBHOOK_URL:process.env.STUDIO_N8N_WEBHOOK_URL=previousURL;previousKey===undefined?delete process.env.STUDIO_N8N_WEBHOOK_KEY:process.env.STUDIO_N8N_WEBHOOK_KEY=previousKey;}
 const batch=[...photos];
 for(let i=0;i<28;i++){
  const bytes=await sharp({create:{width:640,height:800,channels:3,background:{r:20+i*5,g:70+i,b:130-i}}}).png().toBuffer();
  const uploaded=await api('/api/admin/instagram/photos',{method:'POST',raw:true,body:bytes});assert.equal(uploaded.status,200);photos.push(uploaded.data.photo.id);batch.push(uploaded.data.photo.id);
 }
 const batchDraft=await saveDraft(owner.id,null,newStudioDraft(batch));drafts.push(batchDraft.id);assert.equal(batchDraft.payload.photo_ids.length,30);
 const batchJob=await api('/api/admin/instagram/jobs',{method:'POST',body:{draft_id:batchDraft.id}});assert.equal(batchJob.status,200);jobs.push(batchJob.data.id);
 await query("UPDATE studio_jobs SET attempt=2,state='processing' WHERE id=?",[batchJob.data.id]);
 assert.equal((await api('/api/jobs/instagram/callback',{method:'POST',auth:false,callback:signature('STUDIO_CALLBACK_KEY',batchJob.data.id+':1'),body:{job_id:batchJob.data.id,attempt:1,error:true}})).status,409);
 assert.equal((await api('/api/jobs/instagram/callback',{method:'POST',auth:false,callback:signature('STUDIO_CALLBACK_KEY',batchJob.data.id+':2'),body:{job_id:batchJob.data.id,attempt:2,error:true}})).status,200);
 const [failed]=await query('SELECT state FROM studio_jobs WHERE id=?',[batchJob.data.id]);assert.equal(failed.state,'failed');
 assert.equal((await api('/api/admin/instagram/photos',{method:'POST',raw:true,body:Buffer.alloc(4000001)})).status,413);
 console.log('PASS: 30-photo persisted batch, oversized-upload rejection, provider failure callback and old-attempt rejection.');
 console.log('PASS: local and phone uploads, hash dedupe, private media, ownership, album membership, revision/origin protection, durable offline jobs, idempotent callbacks, locked positions, stale result protection, cancellation and approval without publishing. AI results in this test were synthetic.');
}finally{
 for(const id of jobs){await query('DELETE FROM studio_job_events WHERE job_id=?',[id]);await query('DELETE FROM studio_jobs WHERE id=? AND owner_id=?',[id,owner.id]);}
 for(const id of drafts)await query('DELETE FROM studio_drafts WHERE id=? AND owner_id=?',[id,owner.id]);
 for(const id of albums){await query('DELETE FROM studio_album_photos WHERE album_id=?',[id]);await query('DELETE FROM studio_albums WHERE id=? AND owner_id=?',[id,owner.id]);}
 for(const id of photos){const [r]=await query('SELECT storage_key FROM studio_photos WHERE id=? AND owner_id=?',[id,owner.id]);if(r)await removePhotoBytes(r.storage_key);await query('DELETE FROM studio_photos WHERE id=? AND owner_id=?',[id,owner.id]);}
 await query('DELETE FROM next_sessions WHERE token_hash=?',[hash]);await database().end();
}
