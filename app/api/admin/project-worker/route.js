import {admin,sameOrigin,rateLimit} from '../../../../lib/auth.mjs';
import {handle,HttpError,body} from '../../../../lib/db.mjs';
import {z} from 'zod';
import {requireLocalMaster} from '../../../../lib/control-room.mjs';
export const runtime='nodejs';
async function worker(method,action='scan'){
  if(!process.env.PROJECT_WORKER_TOKEN)throw new HttpError(503,'The project worker is not configured.');
  const r=await fetch('http://127.0.0.1:8793/'+(method==='POST'?(action==='retry-covers'?'retry-covers':'run'):'status'),{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.PROJECT_WORKER_TOKEN,'Content-Type':'application/json'},body:method==='POST'?'{}':undefined});
  const data=await r.json();if(!r.ok)throw new HttpError(r.status,data.error||'The project worker is unavailable.');
  return Response.json(data,{status:r.status,headers:{'Cache-Control':'no-store'}});
}
export async function GET(){return handle(async()=>{requireLocalMaster();await admin();return worker('GET');});}
export async function POST(request){return handle(async()=>{requireLocalMaster();sameOrigin(request);const owner=await admin();const input=z.object({action:z.enum(['scan','retry-covers']).default('scan')}).strict().parse(await body(request,1000));await rateLimit(request,'project-scan',String(owner.id));return worker('POST',input.action);});}
