import {z} from 'zod';
import {query,transaction,HttpError} from './db.mjs';

const senderSchema=z.string().regex(/^[1-9][0-9]{6,14}$/);
const claimSchema=z.object({action:z.literal('claim'),message_id:z.string().min(8).max(191),sender:senderSchema}).strict();
const leadSchema=z.object({
  action:z.literal('upsert'),sender:senderSchema,
  name:z.string().max(255).optional(),service:z.string().max(255).optional(),
  budget:z.string().max(255).optional(),timeline:z.string().max(255).optional(),
  status:z.enum(['new','contacted','qualified','human_takeover','booking_requested','closed','opted_out']).optional(),
  summary:z.string().max(3000).optional(),booking_request:z.string().max(3000).optional(),
  handoff_requested:z.boolean().optional(),follow_up_at:z.iso.datetime().nullable().optional(),
  message_id:z.string().min(8).max(191)
}).strict();
export const whatsappInput=z.discriminatedUnion('action',[claimSchema,leadSchema]);

export async function ingestWhatsapp(input,{atomic=transaction,run=query}={}){
 const data=whatsappInput.parse(input);
 if(data.action==='claim'){
  return atomic(async connection=>{
   const result=await run('INSERT IGNORE INTO shiv_whatsapp_message_claims (message_id,sender) VALUES (?,?)',[data.message_id,data.sender],connection);
   return {accepted:Boolean(result.affectedRows),message_id:data.message_id};
  });
 }
 const timestamp=data.follow_up_at?new Date(data.follow_up_at).toISOString().slice(0,19).replace('T',' '):null;
 return atomic(async connection=>{
  await run('INSERT IGNORE INTO shiv_whatsapp_leads (sender,created_at,updated_at) VALUES (?,UTC_TIMESTAMP(),UTC_TIMESTAMP())',[data.sender],connection);
  const [row]=await run('SELECT * FROM shiv_whatsapp_leads WHERE sender=? FOR UPDATE',[data.sender],connection);
  if(!row)throw new HttpError(503,'Lead storage unavailable.');
  // Replaying the same inbound event must never move the lead backwards.
  if(row.last_message_id===data.message_id)return {ok:true,unchanged:true};
  const use=(key)=>data[key]?.trim()||row[key]||'';
  const statuses=['new','contacted','qualified','human_takeover','booking_requested','closed','opted_out'];
  const old=String(row.status||'new');
  const next=data.status||old;
  const status=next==='opted_out'?'opted_out':
   ['closed','opted_out'].includes(old)?old:
   old==='human_takeover'&&next!=='opted_out'?old:
   ['human_takeover','booking_requested'].includes(next)?next:
   (old!=='new'&&next==='new'?old:statuses.includes(next)?next:old);
  await run(`UPDATE shiv_whatsapp_leads SET name=?,service=?,budget=?,timeline=?,status=?,summary=?,booking_request=?,handoff_requested=?,follow_up_at=COALESCE(?,follow_up_at),last_message_id=?,updated_at=UTC_TIMESTAMP() WHERE sender=?`,[
   use('name'),use('service'),use('budget'),use('timeline'),status,use('summary'),use('booking_request'),
   Boolean(data.handoff_requested||row.handoff_requested),timestamp,data.message_id,data.sender
  ],connection);
  return {ok:true,updated:true,status};
 });
}

export async function listWhatsappLeads(url,{run=query}={}){
 const page=Math.min(500,Math.max(1,Number.parseInt(url.searchParams.get('page')||'1',10)||1));
 const limit=40;
 const search=(url.searchParams.get('search')||'').slice(0,100);
 const filter=url.searchParams.get('status')||'';
 const filters=[],args=[];
 if(filter){if(!['new','contacted','qualified','human_takeover','booking_requested','closed','opted_out'].includes(filter))throw new HttpError(422,'Invalid lead filter');filters.push('status=?');args.push(filter);}
 if(search){filters.push('(sender LIKE ? OR name LIKE ? OR service LIKE ?)');args.push(...Array(3).fill('%'+search+'%'));}
 const where=filters.length?' WHERE '+filters.join(' AND '):'';
 const [rows,[count]]=await Promise.all([
  run('SELECT sender,name,service,budget,timeline,status,source,summary,booking_request,handoff_requested,follow_up_at,created_at,updated_at FROM shiv_whatsapp_leads'+where+' ORDER BY updated_at DESC LIMIT '+limit+' OFFSET '+((page-1)*limit),args),
  run('SELECT COUNT(*) AS count FROM shiv_whatsapp_leads'+where,args)]);
 return {data:rows,count:Number(count.count),page};
}

const updateSchema=z.object({sender:senderSchema,status:z.enum(['new','contacted','qualified','human_takeover','booking_requested','closed','opted_out']),follow_up_at:z.iso.datetime().nullable().optional()}).strict();
export async function updateWhatsappLead(input,{run=query}={}){
 const data=updateSchema.parse(input);
 const due=data.follow_up_at?new Date(data.follow_up_at).toISOString().slice(0,19).replace('T',' '):null;
 const result=await run('UPDATE shiv_whatsapp_leads SET status=?,follow_up_at=?,updated_at=UTC_TIMESTAMP() WHERE sender=?',[data.status,due,data.sender]);
 if(!result.affectedRows)throw new HttpError(404,'Lead not found');
 return {ok:true};
}
