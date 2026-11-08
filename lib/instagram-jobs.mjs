import {randomUUID} from 'node:crypto';
import {query,transaction,HttpError} from './db.mjs';
import {ownedDraft,ownedPhoto,decode,settings} from './instagram-store.mjs';
import {signature,verifyBearer,mergeAnalysis,secret,analysisSchema,idSchema} from './instagram-core.mjs';
import {analysisImage} from './instagram-media.mjs';
const active=['pending','waiting_for_n8n','processing'];
export const jobToken=(id,attempt)=>signature('STUDIO_CALLBACK_KEY',id+':'+attempt);
export function webhookURL(){
 const value=process.env.STUDIO_N8N_WEBHOOK_URL;if(!value)return null;
 const url=new URL(value);
 if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'&&url.hostname==='n8n.shivpatel.in'&&url.pathname.startsWith('/webhook/'))&&!(process.env.NODE_ENV==='development'&&url.origin==='http://127.0.0.1:8794'))throw new HttpError(503,'The Studio webhook target is not allowed.');
 return url.href;
}
export function processingReady(){try{return !!webhookURL()&&process.env.STUDIO_N8N_WEBHOOK_KEY?.length>=32&&process.env.STUDIO_CALLBACK_KEY?.length>=32;}catch{return false;}}
export function callbackOrigin(){
 const url=new URL(process.env.APP_ORIGIN||'https://www.shivpatel.in');
 if(!['https://www.shivpatel.in','https://shivpatel.in'].includes(url.origin)&&!(process.env.NODE_ENV==='development'&&['http://localhost:3001','http://127.0.0.1:3001'].includes(url.origin)))throw new HttpError(503,'Studio callback origin is not allowed.');
 return url.origin;
}
export async function ownedJob(owner,id,c,lock=false){idSchema.parse(id);const [row]=await query('SELECT * FROM studio_jobs WHERE owner_id=? AND id=?'+(lock?' FOR UPDATE':''),[owner,id],c);if(!row)throw new HttpError(404,'Job not found.');return row;}
const event=(id,state,c)=>query('INSERT INTO studio_job_events (job_id,state) VALUES (?,?)',[id,state],c);
export async function createJob(owner,draftId){
 const id=await transaction(async c=>{
  const draft=await ownedDraft(owner,draftId,c,true);if(!draft.payload.photo_ids.length)throw new HttpError(422,'Add photos first.');
  if(draft.status==='published')throw new HttpError(409,'Published drafts cannot be processed.');
  await query("UPDATE studio_jobs SET state='failed',error='Analysis timed out. Retry when n8n is available.' WHERE draft_id=? AND owner_id=? AND state IN ('pending','waiting_for_n8n','processing') AND deadline_ms<?",[draftId,owner,Date.now()],c);
  const [existing]=await query("SELECT id FROM studio_jobs WHERE draft_id=? AND owner_id=? AND state IN ('pending','waiting_for_n8n','processing') LIMIT 1",[draftId,owner],c);
  if(existing)return existing.id;
  const id=randomUUID();await query('INSERT INTO studio_jobs (id,owner_id,draft_id,draft_revision,state,request,deadline_ms) VALUES (?,?,?,?,?,?,?)',[id,owner,draftId,draft.revision,'pending',JSON.stringify(draft.payload),Date.now()+900000],c);await event(id,'pending',c);return id;
 });
 await dispatchJob(owner,id);return ownedJob(owner,id);
}
export async function dispatchJob(owner,id){
 if(!processingReady()){await query("UPDATE studio_jobs SET state='waiting_for_n8n',error='Connect the Studio n8n webhook and independent credentials, then retry.' WHERE id=? AND owner_id=? AND state='pending'",[id,owner]);return;}
 const url=webhookURL();
 secret('STUDIO_N8N_WEBHOOK_KEY');secret('STUDIO_CALLBACK_KEY');callbackOrigin();
 const job=await transaction(async c=>{
  const row=await ownedJob(owner,id,c,true);if(!['pending','waiting_for_n8n'].includes(row.state))return null;
  if(Number(row.deadline_ms)<Date.now())throw new HttpError(409,'This job expired. Retry it to start a new attempt.');
  if(row.attempt>=3)throw new HttpError(409,'Three attempts exhausted. Create a new analysis job.');
  row.attempt++;row.state='processing';await query("UPDATE studio_jobs SET state='processing',attempt=?,error=NULL,updated_at=UTC_TIMESTAMP() WHERE id=?",[row.attempt,id],c);await event(id,'processing',c);return row;
 });
 if(!job)return;
 try{
  const draft=decode(job.request),photos=[];
  for(const id of draft.photo_ids){const row=await ownedPhoto(owner,id);const bytes=await analysisImage(row.storage_key);photos.push({id,inline_data:{mime_type:'image/jpeg',data:bytes.toString('base64')}});}
  const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+secret('STUDIO_N8N_WEBHOOK_KEY')},body:JSON.stringify({job_id:job.id,attempt:job.attempt,photos,theme:draft.theme,confirmed_location:draft.location,max_photos:draft.max_photos,weights:(await settings(owner)).weights,callback_url:callbackOrigin()+'/api/jobs/instagram/callback',callback_token:jobToken(job.id,job.attempt)})});
  if(!response.ok)throw Error('Webhook rejected');
 }catch{
  await query("UPDATE studio_jobs SET state='waiting_for_n8n',error='n8n is unavailable or rejected the request. Retry this job when connected.',updated_at=UTC_TIMESTAMP() WHERE id=? AND attempt=? AND state='processing'",[job.id,job.attempt]);await event(job.id,'waiting_for_n8n');
 }
}
export async function retryJob(owner,id){
 await transaction(async c=>{const row=await ownedJob(owner,id,c,true);if(row.state==='cancelled'||row.state==='completed')throw new HttpError(409,'This job is already finished.');if(row.state==='processing'&&Number(row.deadline_ms)>Date.now())throw new HttpError(409,'Analysis is still running.');if(row.attempt>=3)throw new HttpError(409,'Three attempts exhausted. Start a new analysis.');await query("UPDATE studio_jobs SET state='pending',deadline_ms=?,error=NULL WHERE id=?",[Date.now()+900000,id],c);});
 await dispatchJob(owner,id);return ownedJob(owner,id);
}
export async function cancelJob(owner,id){
 return transaction(async c=>{const row=await ownedJob(owner,id,c,true);if(['completed','cancelled'].includes(row.state))return row;await query("UPDATE studio_jobs SET state='cancelled',updated_at=UTC_TIMESTAMP() WHERE id=?",[id],c);await event(id,'cancelled',c);return {...row,state:'cancelled'};});
}
export async function completeJob(request,input){
 const id=idSchema.parse(input.job_id),attempt=input.attempt;
 if(!Number.isInteger(attempt)||attempt<1||attempt>3)throw new HttpError(422,'Invalid attempt.');
 verifyBearer(request,jobToken(id,attempt));
 return transaction(async c=>{
  const [found]=await query('SELECT * FROM studio_jobs WHERE id=?',[id],c);if(!found)throw new HttpError(404,'Job not found.');
  const draft=await ownedDraft(found.owner_id,found.draft_id,c,true);
  const [job]=await query('SELECT * FROM studio_jobs WHERE id=? FOR UPDATE',[id],c);
  if(job.attempt!==attempt)throw new HttpError(409,'A newer processing attempt exists.');
  if(job.state==='completed')return {ok:true,unchanged:true};
  if(job.state==='cancelled'||job.state==='failed'||Number(job.deadline_ms)<Date.now())throw new HttpError(409,'This job is no longer accepting results.');
  if(input.error){await query("UPDATE studio_jobs SET state='failed',error='AI analysis failed. Check the provider credential or quota and retry.',updated_at=UTC_TIMESTAMP() WHERE id=?",[id],c);await event(id,'failed',c);return {ok:true};}
  const result=analysisSchema.parse(input.result);
  // Always validate results against the requested batch, even if the draft changed meanwhile.
  const [setting]=await query('SELECT payload FROM studio_settings WHERE owner_id=?',[job.owner_id],c);
  const merged=mergeAnalysis(decode(job.request),result,setting?decode(setting.payload).weights:undefined);
  for(const photo of [...result.photos].sort((a,b)=>a.id.localeCompare(b.id))){const row=await ownedPhoto(job.owner_id,photo.id,c,true),meta=decode(row.metadata);await query('UPDATE studio_photos SET metadata=? WHERE id=?',[JSON.stringify({...meta,description:photo.description,suggested_category:photo.category,tags:[...new Set([...(meta.tags||[]),photo.category,...photo.tags])].slice(0,20)}),photo.id],c);}
  const applied=draft.revision===job.draft_revision;
  if(applied){await query("UPDATE studio_drafts SET payload=?,revision=revision+1,status='draft',updated_at=UTC_TIMESTAMP() WHERE id=?",[JSON.stringify(merged),draft.id],c);}
  await query("UPDATE studio_jobs SET state='completed',result=?,error=?,updated_at=UTC_TIMESTAMP() WHERE id=?",[JSON.stringify(result),applied?null:'Saved draft changed during analysis. Results were retained without overwriting your edits.',id],c);await event(id,'completed',c);
  return {ok:true,applied};
 });
}
export function jobView(row){return {id:row.id,draft_id:row.draft_id,attempt:row.attempt,state:active.includes(row.state)&&Number(row.deadline_ms)<Date.now()?'failed':row.state,error:active.includes(row.state)&&Number(row.deadline_ms)<Date.now()?'Analysis timed out. Retry when n8n is available.':row.error,result:row.result?decode(row.result):null,updated_at:row.updated_at};}
