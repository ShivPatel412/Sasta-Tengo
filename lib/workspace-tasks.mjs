import {z} from 'zod';
import {HttpError,query} from './db.mjs';

export const taskStages=['todo','in_progress','review','done'];
export const taskSchema=z.object({
  title:z.string().trim().min(1).max(255),
  description:z.string().trim().max(10000).default(''),
  project_name:z.string().trim().max(255).default(''),
  status:z.enum(taskStages).default('todo'),
  priority:z.enum(['low','normal','high']).default('normal'),
  due_date:z.iso.date().nullable().default(null)
}).strict();
export const taskEditSchema=taskSchema.extend({version:z.number().int().positive()});
export const taskMoveSchema=z.object({status:z.enum(taskStages),version:z.number().int().positive()}).strict();
export const validId=id=>typeof id==='string'&&/^[1-9][0-9]{0,19}$/.test(id);

export async function listTasks(owner,url,run=query){
  const page=Math.min(100000,Math.max(1,Number.parseInt(url.searchParams.get('page'),10)||1));
  const search=(url.searchParams.get('search')||'').slice(0,255);
  const status=url.searchParams.get('status');
  const clauses=['owner_id=?'],values=[owner];
  if(search){clauses.push('(title LIKE ? OR project_name LIKE ?)');values.push(`%${search}%`,`%${search}%`);}
  if(status){if(!taskStages.includes(status))throw new HttpError(422,'Invalid task stage.');clauses.push('status=?');values.push(status);}
  const where=clauses.join(' AND ');
  const [data,[count]]=await Promise.all([
    run(`SELECT id,title,description,project_name,status,priority,due_date,version,created_at,updated_at FROM next_workspace_tasks WHERE ${where} ORDER BY id DESC LIMIT 100 OFFSET ${(page-1)*100}`,values),
    run(`SELECT COUNT(*) AS total FROM next_workspace_tasks WHERE ${where}`,values)
  ]);
  return {data,count:Number(count.total),page};
}

export async function createTask(owner,input,run=query){
  const data=taskSchema.parse(input),keys=Object.keys(data);
  const result=await run(`INSERT INTO next_workspace_tasks (owner_id,${keys.join(',')},created_at,updated_at) VALUES (?,${keys.map(()=>'?').join(',')},UTC_TIMESTAMP(),UTC_TIMESTAMP())`,[owner,...Object.values(data)]);
  return {id:String(result.insertId)};
}

export async function updateTask(owner,id,input,move=false,run=query){
  if(!validId(id))throw new HttpError(404,'Task not found.');
  const {version,...data}=(move?taskMoveSchema:taskEditSchema).parse(input),keys=Object.keys(data);
  const result=await run(`UPDATE next_workspace_tasks SET ${keys.map(key=>`${key}=?`).join(',')},version=version+1,updated_at=UTC_TIMESTAMP() WHERE id=? AND owner_id=? AND version=?`,[...Object.values(data),id,owner,version]);
  if(!result.affectedRows){
    const [existing]=await run('SELECT id FROM next_workspace_tasks WHERE id=? AND owner_id=?',[id,owner]);
    throw new HttpError(existing?409:404,existing?'This task changed on another device. Refresh it before saving.':'Task not found.');
  }
  return {ok:true,version:version+1};
}
