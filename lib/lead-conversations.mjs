import {randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {HttpError,query,transaction} from './db.mjs';

export const consentVersion='whatsapp-followup-v1';
export const internationalPhone=value=>/^\+[1-9][0-9]{6,14}$/.test((value||'').replace(/[\s().-]/g,''));
export function requireLeadIntegration(){
  if(process.env.NEXT_PUBLIC_LEADS_ENABLED!=='1')throw new HttpError(503,'WhatsApp follow-up is not available yet. Submit without WhatsApp consent.');
}
export function authorizeLeadWorker(request,keyName){
  const key=process.env[keyName],actual=Buffer.from(request.headers.get('authorization')||'');
  const expected=Buffer.from(`Bearer ${key}`);
  if(!key||key.length<32||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new HttpError(401,'Unauthorized.');
}
export async function enqueueLead(resource,id,data,connection,run=query){
  if(!data.whatsapp_consent)return;
  requireLeadIntegration();
  const phone=data.phone||data.client_phone;
  if(!internationalPhone(phone))throw new HttpError(422,'Include the country code for WhatsApp, for example +91.');
  await run(`INSERT INTO next_lead_conversations
    (id,resource,record_id,phone,consent_version,consented_at,state,created_at,updated_at)
    VALUES (?,?,?,?,?,UTC_TIMESTAMP(),'queued',UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
  [randomUUID(),resource,id,phone.replace(/[\s().-]/g,''),consentVersion],connection);
}
export function leadWebhook(env=process.env){
  if(!env.LEADS_N8N_WEBHOOK_URL)return null;
  let url;
  try{url=new URL(env.LEADS_N8N_WEBHOOK_URL);}catch{throw new HttpError(503,'Lead webhook configuration needs attention.');}
  if(url.protocol!=='https:'||url.hostname!=='n8n.shivpatel.in'||url.port||url.username||url.password||url.search||url.hash||!/^\/webhook\/[a-zA-Z0-9_/-]+$/.test(url.pathname)||!env.LEADS_N8N_WEBHOOK_KEY||!/^\S{32,1024}$/.test(env.LEADS_N8N_WEBHOOK_KEY))throw new HttpError(503,'Lead webhook configuration needs attention.');
  return url.href;
}
export async function dispatchLeads({run=query,send=fetch,env=process.env}={}){
  const url=leadWebhook(env);
  if(!url)return {dispatched:0,waiting_configuration:true};
  // A worker crash or lost response may have started n8n. Never send these rows automatically again.
  await run("UPDATE next_lead_conversations SET state='uncertain',version=version+1,updated_at=UTC_TIMESTAMP() WHERE state='dispatching' AND updated_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 5 MINUTE)");
  const rows=await run("SELECT id,version FROM next_lead_conversations c WHERE state='queued' AND ((resource='contacts' AND EXISTS(SELECT 1 FROM contacts WHERE id=c.record_id)) OR (resource='appointments' AND EXISTS(SELECT 1 FROM appointments WHERE id=c.record_id))) ORDER BY created_at LIMIT 5");
  let dispatched=0;
  for(const row of rows){
    const lock=await run("UPDATE next_lead_conversations SET state='dispatching',version=version+1,updated_at=UTC_TIMESTAMP() WHERE id=? AND version=? AND state='queued'",[row.id,row.version]);
    if(!lock.affectedRows)continue;
    let state='uncertain';
    try{
      const response=await send(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(6000),
        headers:{'Content-Type':'application/json','X-Leads-Key':env.LEADS_N8N_WEBHOOK_KEY,'Idempotency-Key':row.id},
        body:JSON.stringify({conversation_id:row.id,source:'website-lead'})});
      state=response.ok?'accepted':[401,403,404,405,409,422].includes(response.status)?'error':'uncertain';
      await response.body?.cancel();
    }catch{ /* Retain the lead for human reconciliation, without logging personal information. */ }
    await run("UPDATE next_lead_conversations SET state=?,version=version+1,updated_at=UTC_TIMESTAMP() WHERE id=? AND state='dispatching'",[state,row.id]);
    if(state==='accepted')dispatched++;
  }
  return {dispatched,waiting_configuration:false};
}
const conversationId=z.uuid();
const stopped=['human_takeover','opted_out'];
export const conversationUpdate=z.object({
  version:z.number().int().positive(),
  state:z.enum(['collecting','appointment_requested','human_takeover','opted_out','error']),
  preferred_call_at:z.iso.datetime({offset:true}).optional(),
  timezone:z.string().max(80).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true;}catch{return false;}},'Use an IANA time zone').optional()
}).strict().superRefine((value,ctx)=>{
  if(value.state==='appointment_requested'&&(!value.preferred_call_at||!value.timezone||Date.parse(value.preferred_call_at)<=Date.now()))ctx.addIssue({code:'custom',message:'Provide a future call time with a UTC offset and IANA time zone.'});
  if(value.state!=='appointment_requested'&&(value.preferred_call_at||value.timezone))ctx.addIssue({code:'custom',message:'Call preferences require appointment_requested state.'});
});
export async function getConversation(id,run=query){
  conversationId.parse(id);
  const [row]=await run('SELECT * FROM next_lead_conversations WHERE id=?',[id]);
  if(!row)throw new HttpError(404,'Conversation not found.');
  const [lead]=await run(row.resource==='contacts'?'SELECT name,subject,message FROM contacts WHERE id=?':'SELECT client_name AS name,notes AS message FROM appointments WHERE id=?',[row.record_id]);
  if(!lead)throw new HttpError(404,'Lead no longer exists.');
  return {...row,lead,version:Number(row.version),can_message:!stopped.includes(row.state)&&['accepted','collecting','appointment_requested'].includes(row.state)};
}
export async function updateConversation(id,input,{run=query,atomic=transaction}={}){
  conversationId.parse(id);const data=conversationUpdate.parse(input);
  return atomic(async connection=>{
    const [row]=await run('SELECT state,version FROM next_lead_conversations WHERE id=? FOR UPDATE',[id],connection);
    if(!row)throw new HttpError(404,'Conversation not found.');
    if(Number(row.version)!==data.version)throw new HttpError(409,'Conversation changed. Read it again before continuing.');
    if(stopped.includes(row.state)&&!(row.state==='human_takeover'&&data.state==='opted_out'))throw new HttpError(409,'Automatic follow-up is stopped for this conversation.');
    if(!stopped.includes(data.state)&&!['accepted','collecting','appointment_requested'].includes(row.state))throw new HttpError(409,'Conversation is not ready for automatic follow-up.');
    const time=data.preferred_call_at?new Date(data.preferred_call_at).toISOString().slice(0,19).replace('T',' '):null;
    await run(`UPDATE next_lead_conversations SET state=?,preferred_call_at=COALESCE(?,preferred_call_at),timezone=COALESCE(?,timezone),version=version+1,updated_at=UTC_TIMESTAMP() WHERE id=?`,[data.state,time,data.timezone||null,id],connection);
    return {id,state:data.state,version:data.version+1};
  });
}
