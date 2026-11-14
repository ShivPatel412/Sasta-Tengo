import {admin,sameOrigin,rateLimit} from '../../../../../lib/auth.mjs';
import {assertWritable,body,handle,HttpError,query} from '../../../../../lib/db.mjs';
import {controlSnapshot} from '../../../../../lib/control-room.mjs';
import {executeWorkflow,workflowList} from '../../../../../lib/workspace-workflows.mjs';
import {snapshotFresh} from '../../../../../lib/master-dashboard.mjs';
export const runtime='nodejs';
const json=value=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
export async function GET(request,context){return handle(async()=>{
  const owner=await admin(),{path=[]}=await context.params;
  if(path.length)throw new HttpError(404,'Not found.');
  let snapshot=null;
  try{snapshot=await controlSnapshot();}catch{ /* Configured workflow buttons remain available when monitoring is offline. */ }
  const runs=await query('SELECT request_id,workflow_id,state,created_at FROM next_workflow_runs WHERE owner_id=? ORDER BY created_at DESC LIMIT 30',[owner.id]);
  return json({data:workflowList(snapshot),runs,collectedAt:snapshot?.updated_at||null,monitoringAvailable:!!snapshot&&snapshotFresh(snapshot)&&!snapshot.errors?.n8n});
});}
export async function POST(request,context){return handle(async()=>{
  const owner=await admin(),{path=[]}=await context.params;
  sameOrigin(request);assertWritable();
  if(path.length!==2||path[1]!=='run'||! /^[a-zA-Z0-9_-]{1,128}$/.test(path[0]))throw new HttpError(404,'Not found.');
  await rateLimit(request,'workflow-run',String(owner.id));
  return json(await executeWorkflow(owner.id,path[0],await body(request,1000)));
});}
