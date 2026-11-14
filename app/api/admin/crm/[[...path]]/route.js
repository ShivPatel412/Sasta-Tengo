import {admin,sameOrigin} from '../../../../../lib/auth.mjs';
import {assertWritable,body,handle,HttpError} from '../../../../../lib/db.mjs';
import {listLeads,moveLead} from '../../../../../lib/workspace-crm.mjs';
export const runtime='nodejs';
const json=value=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
export async function GET(request,context){return handle(async()=>{
  await admin();const {path=[]}=await context.params;
  if(path.length)throw new HttpError(404,'Not found.');
  return json(await listLeads(new URL(request.url)));
});}
export async function PATCH(request,context){return handle(async()=>{
  await admin();sameOrigin(request);assertWritable();
  const {path=[]}=await context.params;
  if(path.length!==2)throw new HttpError(404,'Not found.');
  return json(await moveLead(path[0],path[1],await body(request,1000)));
});}
