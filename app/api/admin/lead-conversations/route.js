import {admin,sameOrigin} from '../../../../lib/auth.mjs';
import {assertWritable,body,handle,HttpError,query} from '../../../../lib/db.mjs';
import {requireLeadIntegration,updateConversation} from '../../../../lib/lead-conversations.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return handle(async()=>{
  await admin();requireLeadIntegration();
  return Response.json({data:await query('SELECT * FROM next_lead_conversations ORDER BY updated_at DESC LIMIT 100')},{headers:{'Cache-Control':'no-store'}});
});}
export async function PATCH(request){return handle(async()=>{
  await admin();sameOrigin(request);requireLeadIntegration();assertWritable();
  const {id,version,state,...extra}=await body(request,1000);
  if(Object.keys(extra).length||!['human_takeover','opted_out'].includes(state))throw new HttpError(422,'Choose human takeover or opt out.');
  return Response.json(await updateConversation(id,{version,state}),{headers:{'Cache-Control':'no-store'}});
});}
