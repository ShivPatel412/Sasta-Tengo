import {z} from 'zod';
import {HttpError,query} from './db.mjs';
import {validId} from './workspace-tasks.mjs';
export const leadStages=['new','contacted','qualified','closed'];
export const leadStageSchema=z.object({lead_status:z.enum(leadStages)}).strict();
export async function listLeads(url,run=query){
  const page=Math.min(100000,Math.max(1,Number.parseInt(url.searchParams.get('page'),10)||1));
  const search=(url.searchParams.get('search')||'').slice(0,255),stage=url.searchParams.get('stage');
  const clauses=[],values=[];
  if(stage){if(!leadStages.includes(stage))throw new HttpError(422,'Invalid lead stage.');clauses.push('lead_status=?');values.push(stage);}
  if(search){clauses.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR summary LIKE ?)');values.push(...Array(4).fill(`%${search}%`));}
  const union=`(SELECT 'contacts' AS resource,id,name,email,phone,subject AS summary,lead_status,created_at FROM contacts UNION ALL SELECT 'appointments',id,client_name,client_email,client_phone,LEFT(notes,255),lead_status,created_at FROM appointments) leads`;
  const where=clauses.length?' WHERE '+clauses.join(' AND '):'';
  const [data,[count]]=await Promise.all([
    run(`SELECT * FROM ${union}${where} ORDER BY created_at DESC,id DESC,resource LIMIT 100 OFFSET ${(page-1)*100}`,values),
    run(`SELECT COUNT(*) AS total FROM ${union}${where}`,values)
  ]);
  return {data,count:Number(count.total),page};
}
export async function moveLead(resource,id,input,run=query){
  if(!['contacts','appointments'].includes(resource)||!validId(id))throw new HttpError(404,'Lead not found.');
  const {lead_status}=leadStageSchema.parse(input);
  const result=await run(`UPDATE ${resource} SET lead_status=?,updated_at=UTC_TIMESTAMP() WHERE id=?`,[lead_status,id]);
  if(!result.affectedRows)throw new HttpError(404,'Lead not found.');
  return {ok:true};
}
