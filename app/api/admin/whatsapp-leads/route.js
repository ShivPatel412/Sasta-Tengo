import {admin,sameOrigin} from '../../../../lib/auth.mjs';
import {assertWritable,body,handle} from '../../../../lib/db.mjs';
import {listWhatsappLeads,updateWhatsappLead} from '../../../../lib/shiv-whatsapp-leads.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){return handle(async()=>{
 await admin();
 return Response.json(await listWhatsappLeads(new URL(request.url)),{headers:{'Cache-Control':'no-store'}});
});}
export async function PATCH(request){return handle(async()=>{
 await admin();sameOrigin(request);assertWritable();
 return Response.json(await updateWhatsappLead(await body(request,2048)),{headers:{'Cache-Control':'no-store'}});
});}
