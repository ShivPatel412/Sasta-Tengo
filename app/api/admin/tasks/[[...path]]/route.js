import {admin,sameOrigin} from '../../../../../lib/auth.mjs';
import {assertWritable,body,handle,HttpError,query} from '../../../../../lib/db.mjs';
import {createTask,listTasks,updateTask,validId} from '../../../../../lib/workspace-tasks.mjs';
export const runtime='nodejs';
const json=value=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
async function route(request,context){
  return handle(async()=>{
    const owner=await admin(),{path=[]}=await context.params;
    if(path.length>1||(path[0]&&!validId(path[0])))throw new HttpError(404,'Task not found.');
    if(request.method==='GET'){
      if(!path.length)return json(await listTasks(owner.id,new URL(request.url)));
      const data=await query('SELECT id,title,description,project_name,status,priority,due_date,version,created_at,updated_at FROM next_workspace_tasks WHERE id=? AND owner_id=?',[path[0],owner.id]);
      if(!data.length)throw new HttpError(404,'Task not found.');
      return json({data});
    }
    sameOrigin(request);assertWritable();
    if(request.method==='POST'&&!path.length)return json(await createTask(owner.id,await body(request,16000)));
    if(['PUT','PATCH'].includes(request.method)&&path.length===1)return json(await updateTask(owner.id,path[0],await body(request,16000),request.method==='PATCH'));
    throw new HttpError(405,'Method not allowed.');
  });
}
export {route as GET,route as POST,route as PUT,route as PATCH};
