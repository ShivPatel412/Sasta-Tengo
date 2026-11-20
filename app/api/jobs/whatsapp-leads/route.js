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

export async function GET(request){return handle(async()=>{
 automationAuth(request);
 const {query}=await import('../../../../lib/db.mjs');
 const sender=new URL(request.url).searchParams.get('sender');
 if(sender!==null){
   if(!/^[1-9][0-9]{6,14}$/.test(sender))return Response.json({message:'Invalid sender'},{status:422});
   const [row]=await query('SELECT status FROM shiv_whatsapp_leads WHERE sender=? LIMIT 1',[sender]);
   return Response.json({paused:['human_takeover','opted_out'].includes(row?.status),status:row?.status||'new'},{headers:{'Cache-Control':'no-store'}});
 }
 const rows=await query("SELECT sender,name,service,budget,timeline,status,summary,booking_request,handoff_requested,follow_up_at,updated_at FROM shiv_whatsapp_leads WHERE follow_up_at IS NOT NULL AND follow_up_at<=UTC_TIMESTAMP() AND status NOT IN ('closed','opted_out') ORDER BY follow_up_at LIMIT 100");
 return Response.json({data:rows},{headers:{'Cache-Control':'no-store'}});
});}
