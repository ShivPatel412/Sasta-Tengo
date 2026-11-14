// Loopback-only UI fixture proxy. No database, live authentication or n8n calls.
// Start Next on 127.0.0.1:3012, then run this file and browse port 3013.
import http from 'node:http';
import {defaultAppearance} from '../lib/dashboard-appearance.mjs';
import {taskSchema,taskEditSchema,taskMoveSchema} from '../lib/workspace-tasks.mjs';
import {leadStageSchema} from '../lib/workspace-crm.mjs';
const tasks=[{id:'1',title:'Sample website launch',description:'Sample task for UI verification.',project_name:'Sample client project',status:'todo',priority:'high',due_date:'2026-11-20',version:1}];
const leads=[{id:'1',resource:'contacts',name:'Sample contact',email:'contact@example.test',phone:'',summary:'Sample contact inquiry',lead_status:'new',created_at:'2026-11-14 10:00:00'},
  {id:'1',resource:'appointments',name:'Sample service lead',email:'service@example.test',phone:'',summary:'Sample website project',lead_status:'qualified',created_at:'2026-11-14 11:00:00'}];
const runs=[];
let nextId=2;
const server=http.createServer(async(req,res)=>{
  if(!req.url.startsWith('/api/admin/')){
    const port=Number(process.env.WORKSPACE_PREVIEW_NEXT_PORT||3012);
    const upstream=http.request({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${port}`}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end('Start the local Next server on port 3012.');});req.pipe(upstream);return;
  }
  const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
    const url=new URL(req.url,'http://127.0.0.1:3013'),path=url.pathname.slice('/api/admin/'.length),parts=path.split('/');
    let data={};
    if(req.method!=='GET'){let input='';for await(const chunk of req){input+=chunk;if(input.length>20000)throw new Error('Fixture body too large');}data=JSON.parse(input||'{}');}
    if(path==='session')return json({readOnly:false,uploadsEnabled:false,user:{name:'UI test · sample data',email:'ui@example.test'},appearance:defaultAppearance});
    if(parts[0]==='tasks'){
      if(req.method==='GET'){
        if(parts[1])return json({data:tasks.filter(row=>row.id===parts[1])});
        const search=(url.searchParams.get('search')||'').toLowerCase(),rows=tasks.filter(row=>(row.title+' '+row.project_name).toLowerCase().includes(search));
        return json({data:rows,count:rows.length,page:1});
      }
      if(req.method==='POST'){const row={...taskSchema.parse(data),id:String(nextId++),version:1};tasks.unshift(row);return json({id:row.id});}
      const row=tasks.find(row=>row.id===parts[1]);if(!row)return json({message:'Task not found.'},404);
      const parsed=(req.method==='PATCH'?taskMoveSchema:taskEditSchema).parse(data);
      if(parsed.version!==row.version)return json({message:'This task changed on another device. Refresh it before saving.'},409);
      Object.assign(row,parsed,{version:row.version+1});return json({ok:true});
    }
    if(parts[0]==='crm'){
      if(req.method==='GET'){
        const search=(url.searchParams.get('search')||'').toLowerCase(),rows=leads.filter(row=>(row.name+' '+row.email).toLowerCase().includes(search));
        return json({data:rows,count:rows.length,page:1});
      }
      const row=leads.find(row=>row.resource===parts[1]&&row.id===parts[2]);if(!row)return json({message:'Lead not found.'},404);
      Object.assign(row,leadStageSchema.parse(data));return json({ok:true});
    }
    if(['contacts','appointments'].includes(parts[0])){
      const row=leads.find(row=>row.resource===parts[0]&&row.id===parts[1]);if(!row)return json({message:'Lead not found.'},404);
      if(req.method==='PUT'){Object.assign(row,data);return json({ok:true});}
      return json({data:[{...row,client_name:row.name,client_email:row.email,client_phone:'',subject:row.summary,message:'Sample original form answer.',notes:'Sample project request.',is_read:row.is_read||false,status:row.status||'pending',admin_notes:row.admin_notes||'',request_data:parts[0]==='appointments'?{service:'Web development',budget:'Sample budget'}:null}],count:1,page:1});
    }
    if(parts[0]==='workflows'){
      if(req.method==='GET')return json({data:[{id:'sample',name:'Sample workflow (mock)',runnable:true},{id:'offline',name:'Unconnected sample workflow',runnable:false}],runs});
      const duplicate=runs.some(row=>row.request_id===data.requestId);
      if(!duplicate)runs.unshift({request_id:data.requestId,workflow_id:'sample',state:'accepted',created_at:'2026-11-14 12:00:00'});
      return json({requestId:data.requestId,state:'accepted',duplicate});
    }
    return json({message:'This fixture only implements workspace management.'},404);
  }catch(error){return json({message:error.name==='ZodError'?'Please check your details.':'Fixture request failed.'},422);}
});
server.listen(3013,'127.0.0.1',()=>console.log('Synthetic workspace UI fixtures: http://127.0.0.1:3013/dashboard/tasks'));
