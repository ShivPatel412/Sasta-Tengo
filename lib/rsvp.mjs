import {z} from 'zod';
import {sameOrigin,rateLimit} from './auth.mjs';
import {assertWritable,body,query,transaction,HttpError} from './db.mjs';
import {enqueue} from './mail.mjs';

const choice=z.string().trim().min(1).max(160);
const optional=z.string().trim().max(500).default('');
const link=z.union([z.literal(''),z.url().max(2048).refine(value=>{
  const url=new URL(value);
  return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;
},'Use an HTTP or HTTPS link without credentials.')]).default('');
export const rsvpSchema=z.object({
  request_id:z.uuid(),activities:z.array(choice).min(1).max(8),
  dinner:optional,dessert:optional,bottle:choice,
  wishlistPlace:z.object({name:z.string().trim().max(200).default(''),link,notes:z.string().trim().max(2000).default('')}).strict().default({name:'',link:'',notes:''}),
  answers:z.object({blackoutPrediction:optional}).strict().default({blackoutPrediction:''})
}).strict();

export async function submitRsvp(request,{atomic=transaction,run=query,limit=rateLimit}={}){
  sameOrigin(request);assertWritable();
  const data=rsvpSchema.parse(await body(request,12000));
  await limit(request,'rsvp');
  return atomic(async connection=>{
    const payload=JSON.stringify(data);
    const inserted=await run('INSERT IGNORE INTO next_rsvps (request_id,payload,created_at,updated_at) VALUES (?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())',[data.request_id,payload],connection);
    const [saved]=await run('SELECT id,payload FROM next_rsvps WHERE request_id=? FOR UPDATE',[data.request_id],connection);
    if(!saved)throw new Error('RSVP persistence was not confirmed');
    const previous=typeof saved.payload==='string'?JSON.parse(saved.payload):saved.payload;
    if(JSON.stringify(rsvpSchema.parse(previous))!==payload)throw new HttpError(409,'This request was already saved with different answers. Refresh to start a new response.');
    if(inserted.affectedRows)await enqueue('rsvp',String(saved.id),connection);
    return {accepted:true,request_id:data.request_id,duplicate:!inserted.affectedRows};
  });
}
