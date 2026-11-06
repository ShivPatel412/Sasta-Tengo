import { admin, sameOrigin } from '../../../../../lib/auth.mjs';
import { assertWritable, body, handle, HttpError } from '../../../../../lib/db.mjs';
import { listDrafts, reviewDraft } from '../../../../../lib/project-automation.mjs';
export const runtime='nodejs';
export async function GET() {
  return handle(async()=>{await admin();return Response.json({data:await listDrafts()},{headers:{'Cache-Control':'no-store'}});});
}
export async function POST(request,context) {
  return handle(async()=>{
    sameOrigin(request);const owner=await admin();assertWritable();
    const {path=[]}=await context.params;
    if(path.length!==1||!/^[1-9]\d*$/.test(path[0]))throw new HttpError(404,'Not found.');
    return Response.json(await reviewDraft(path[0],await body(request),owner));
  });
}
