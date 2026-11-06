import {admin} from '../../../../../lib/auth.mjs';
import {handle} from '../../../../../lib/db.mjs';
import {requireLocalMaster} from '../../../../../lib/control-room.mjs';
import {localProjectImage} from '../../../../../lib/project-media.mjs';
export const runtime='nodejs';
export async function GET(request,context){return handle(async()=>{requireLocalMaster();await admin();const {file}=await context.params;const image=await localProjectImage(file);return new Response(image.bytes,{headers:{'Content-Type':image.type,'Cache-Control':'private, no-store'}});});}
