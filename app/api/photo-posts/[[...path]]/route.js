import {admin,sameOrigin} from '../../../../lib/auth.mjs';
import {handle,HttpError} from '../../../../lib/db.mjs';
import {requireLocalMaster} from '../../../../lib/control-room.mjs';
export const runtime='nodejs';
export async function GET(request,context){
  return handle(async()=>{
    requireLocalMaster();await admin();const {path=[]}=await context.params;const route=path.join('/');
    let target;
    if(!route)target='/drafts';
    else if(route==='inventory')target='/inventory';
    else if(/^thumb\/[a-f0-9]{64}$/.test(route))target='/'+route;
    else if(/^[a-f0-9]{24}\/pack$/.test(route))target='/drafts/'+route;
    else throw new HttpError(404,'Not found.');
    if(!process.env.PHOTO_WORKER_TOKEN)throw new HttpError(503,'The local photo worker is not connected yet.');
    const response=await fetch('http://127.0.0.1:8792'+target,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(25000),headers:{Authorization:'Bearer '+process.env.PHOTO_WORKER_TOKEN}});
    if(!response.ok)throw new HttpError(503,'The photo service could not load this item.');
    const reader=response.body.getReader(),chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>30000000){await reader.cancel();throw new HttpError(503,'Photo response too large.');}chunks.push(value);}
    return new Response(Buffer.concat(chunks),{headers:{'Content-Type':response.headers.get('content-type')||'application/octet-stream','Cache-Control':'no-store','Content-Disposition':target.endsWith('/pack')?'attachment; filename="instagram-post.zip"':'inline'}});
  });
}
export async function POST(request){return handle(async()=>{requireLocalMaster();sameOrigin(request);await admin();throw new HttpError(503,'Photo generation and publishing are disabled in the local preview.');});}
