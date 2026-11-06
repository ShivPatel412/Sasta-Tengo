import { admin } from '../../../../lib/auth.mjs';
import { handle } from '../../../../lib/db.mjs';
import { controlSnapshot,requireMaster } from '../../../../lib/control-room.mjs';
export const runtime='nodejs';
export async function GET(){return handle(async()=>{requireMaster();await admin();return Response.json(await controlSnapshot(),{headers:{'Cache-Control':'no-store'}});});}
