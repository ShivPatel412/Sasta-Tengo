import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {admin} from '../../../lib/auth.mjs';
import {handle,HttpError} from '../../../lib/db.mjs';
import {requireLocalMaster} from '../../../lib/control-room.mjs';
export const runtime='nodejs';
export async function GET(request,context){
  return handle(async()=>{
    requireLocalMaster();await admin();const {asset}=await context.params;
    if(!['photos.css','photos.js'].includes(asset))throw new HttpError(404,'Not found.');
    return new Response(await readFile(resolve('control-room/static',asset)),{headers:{'Content-Type':asset.endsWith('.js')?'application/javascript; charset=utf-8':'text/css; charset=utf-8','Cache-Control':'private, no-store'}});
  });
}
