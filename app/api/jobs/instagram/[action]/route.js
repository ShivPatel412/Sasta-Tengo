import {z} from 'zod';
import {handle,body,query,assertWritable,HttpError} from '../../../../../lib/db.mjs';
import {completeJob,dispatchJob} from '../../../../../lib/instagram-jobs.mjs';
import {idSchema,verifyBearer,secret} from '../../../../../lib/instagram-core.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request,context){return handle(async()=>{
 const {action}=await context.params;
 if(action==='callback'){
  const input=z.object({job_id:idSchema,attempt:z.number().int().min(1).max(3),result:z.unknown().optional(),error:z.boolean().optional()}).strict().refine(v=>v.error||v.result,'Result or error required.').parse(await body(request,180000));
  assertWritable();return Response.json(await completeJob(request,input));
 }
 if(action==='recover'){
  verifyBearer(request,secret('STUDIO_DISPATCH_KEY'));assertWritable();z.object({}).strict().parse(await body(request,1000));
  const jobs=await query("SELECT id,owner_id FROM studio_jobs WHERE state IN ('pending','waiting_for_n8n') AND attempt<3 AND deadline_ms>? ORDER BY created_at LIMIT 1",[Date.now()]);
  for(const job of jobs)await dispatchJob(job.owner_id,job.id);return Response.json({dispatched:jobs.length});
 }
 throw new HttpError(404,'Not found.');
});}
