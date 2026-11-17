import {admin} from '../../../../lib/auth.mjs';
import {handle} from '../../../../lib/db.mjs';
import {listLeads} from '../../../../lib/workspace-crm.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){return handle(async()=>{
  await admin();
  return Response.json(await listLeads(new URL(request.url)),{headers:{'Cache-Control':'no-store'}});
});}
