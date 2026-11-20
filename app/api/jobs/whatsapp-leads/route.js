import {automationAuth} from '../../../../lib/project-automation.mjs';
import {assertWritable,body,handle} from '../../../../lib/db.mjs';
import {ingestWhatsapp} from '../../../../lib/shiv-whatsapp-leads.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request){return handle(async()=>{
 automationAuth(request);assertWritable();
 const input=await body(request,8192);
 return Response.json(await ingestWhatsapp(input),{headers:{'Cache-Control':'no-store'}});
});}
