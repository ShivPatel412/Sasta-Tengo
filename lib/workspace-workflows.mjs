import {z} from 'zod';
import {HttpError,query} from './db.mjs';

const configuration=z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),name:z.string().trim().min(1).max(255),
  url:z.url(),key:z.string().min(32).max(1024).regex(/^[^\x00-\x20\x7f]+$/)}).strict()).max(50);
export const workflowRunSchema=z.object({requestId:z.uuid()}).strict();
export function configuredWorkflows(env=process.env){
  if(!env.WORKSPACE_N8N_WORKFLOWS)return [];
  try{
    const rows=configuration.parse(JSON.parse(env.WORKSPACE_N8N_WORKFLOWS));
    if(new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error();
    for(const row of rows){
      const url=new URL(row.url);
      if(url.protocol!=='https:'||url.hostname!=='n8n.shivpatel.in'||url.port||url.username||url.password||url.search||url.hash||!/^\/webhook\/[a-zA-Z0-9_/-]+$/.test(url.pathname))throw new Error();
    }
    return rows;
  }catch{throw new HttpError(503,'Workflow execution configuration needs attention.');}
}

export function workflowList(snapshot,env=process.env){
  const configured=configuredWorkflows(env),byId=new Map(configured.map(row=>[row.id,row]));
  const rows=(snapshot?.n8n?.workflows||[]).map(row=>({id:String(row.id),name:String(row.name),active:row.active==null?null:Boolean(row.active),agent_count:Number(row.agent_count)||0,updated_at:row.updated_at||null,folder_id:row.folder_id==null?null:String(row.folder_id),runnable:byId.has(String(row.id))}));
  for(const row of configured)if(!snapshot?.n8n?.scope&&!rows.some(item=>item.id===row.id))rows.push({id:row.id,name:row.name,runnable:true});
  return rows;
}

export async function executeWorkflow(owner,id,input,{env=process.env,run=query,send=fetch}={}){
  const {requestId}=workflowRunSchema.parse(input);
  const workflow=configuredWorkflows(env).find(row=>row.id===id);
  if(!workflow)throw new HttpError(409,'Connect an authenticated production webhook before running this workflow.');
  // A durable request ID prevents duplicate dispatch after a timeout or a double click.
  const inserted=await run("INSERT IGNORE INTO next_workflow_runs (request_id,owner_id,workflow_id,state,created_at) VALUES (?,?,?,'dispatching',UTC_TIMESTAMP())",[requestId,owner,id]);
  if(!inserted.affectedRows){
    const [existing]=await run('SELECT workflow_id,state FROM next_workflow_runs WHERE request_id=? AND owner_id=?',[requestId,owner]);
    if(!existing||existing.workflow_id!==id)throw new HttpError(409,'This execution request belongs to another workflow.');
    return {requestId,state:existing.state,duplicate:true};
  }
  let state='uncertain';
  try{
    const response=await send(workflow.url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),
      headers:{'Content-Type':'application/json','X-Workspace-Key':workflow.key,'Idempotency-Key':requestId},
      body:JSON.stringify({requestId,source:'shiv-dashboard'})});
    // An acknowledgement means accepted, not that the workflow finished successfully.
    state=response.ok?'accepted':[401,403,404,405].includes(response.status)?'rejected':'uncertain';
    await response.body?.cancel();
  }catch{ /* A lost acknowledgement may still mean n8n started the workflow. Never retry automatically. */ }
  await run('UPDATE next_workflow_runs SET state=? WHERE request_id=? AND owner_id=?',[state,requestId,owner]);
  return {requestId,state,duplicate:false};
}
