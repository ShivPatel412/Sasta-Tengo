import {assertWritable,body,handle,HttpError} from '../../../../../lib/db.mjs';
import {authorizeLeadWorker,dispatchLeads,getConversation,requireLeadIntegration,updateConversation} from '../../../../../lib/lead-conversations.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=value=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
export async function POST(request,context){return handle(async()=>{
  authorizeLeadWorker(request,'LEADS_DISPATCH_KEY');requireLeadIntegration();assertWritable();
  const {path=[]}=await context.params;
  if(path.length)throw new HttpError(404,'Not found.');
  return json(await dispatchLeads());
});}
export async function GET(request,context){return handle(async()=>{
  authorizeLeadWorker(request,'LEADS_CALLBACK_KEY');requireLeadIntegration();
  const {path=[]}=await context.params;
  if(path.length!==1)throw new HttpError(404,'Not found.');
  return json(await getConversation(path[0]));
});}
export async function PATCH(request,context){return handle(async()=>{
  authorizeLeadWorker(request,'LEADS_CALLBACK_KEY');requireLeadIntegration();assertWritable();
  const {path=[]}=await context.params;
  if(path.length!==1)throw new HttpError(404,'Not found.');
  return json(await updateConversation(path[0],await body(request,2000)));
});}
