import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { admin } from '../../../lib/auth.mjs';
import { handle,HttpError } from '../../../lib/db.mjs';
import { requireMaster } from '../../../lib/control-room.mjs';
export const runtime='nodejs';
export async function GET(request,context){
  return handle(async()=>{
    requireMaster();await admin();const {asset}=await context.params;
    if(!/^(app|chunk-[A-Z0-9]+)\.(js|css)$/.test(asset))throw new HttpError(404,'Not found.');
    let content;try{content=await readFile(resolve('control-room/static/hq',asset));}catch{throw new HttpError(404,'Not found.');}
    return new Response(content,{headers:{'Content-Type':asset.endsWith('.js')?'application/javascript; charset=utf-8':'text/css; charset=utf-8','Cache-Control':'private, no-store'}});
  });
}
