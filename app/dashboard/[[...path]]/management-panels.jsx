'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {adminApi as api,jsonRequest} from '../../../lib/dashboard-client.mjs';
import {dateLabel} from '../../../lib/dashboard.mjs';
import './management.css';

const taskColumns=[['todo','To do'],['in_progress','In progress'],['review','Review'],['done','Done']];
const leadColumns=[['new','New'],['contacted','Contacted'],['qualified','Qualified'],['closed','Closed']];
const taskPayload=row=>Object.fromEntries(['title','description','project_name','status','priority','due_date'].map(key=>[key,key==='due_date'?(row[key]?.slice(0,10)||null):row[key]]));
const recordKey=row=>row.resource?`${row.resource}/${row.id}`:String(row.id);

function useBoard(path,refresh){
  const [rows,setRows]=useState([]),[total,setTotal]=useState(0),[page,setPage]=useState(1);
  const [search,setSearch]=useState(''),[input,setInput]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    api(`${path}?page=${page}&search=${encodeURIComponent(search)}`,{signal:controller.signal}).then(data=>{
      if(controller.signal.aborted)return;
      setRows(current=>page===1?data.data:[...current,...data.data.filter(row=>!current.some(old=>recordKey(old)===recordKey(row)))]);
      setTotal(Number(data.count));
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[path,page,search,refresh,revision]);
  return {rows,total,page,loading,error,setError,input,setInput,
    reload(){setPage(1);setRows([]);setRevision(value=>value+1);},
    more(){setPage(value=>value+1);},
    search(event){event.preventDefault();setPage(1);setRows([]);setSearch(input.trim());setRevision(value=>value+1);}};
}

function BoardTools({board,children}){
  return <div className="management-tools"><form onSubmit={board.search}><label htmlFor="board-search" className="sr-only">Search this board</label><input id="board-search" type="search" placeholder="Search this board" value={board.input} onChange={e=>board.setInput(e.target.value)}/><button className="button secondary" disabled={board.loading}>Search</button></form><button className="button secondary" disabled={board.loading} onClick={board.reload}>Refresh board</button>{children}</div>;
}
function BoardFooter({board}){
  return <div className="board-footer"><span>{board.loading?'Loading…':`Showing ${board.rows.length} of ${board.total}. Column counts reflect loaded cards.`}</span>{board.rows.length<board.total&&<button className="button secondary" disabled={board.loading||Boolean(board.error)} onClick={board.more}>Load more cards</button>}</div>;
}
function Kanban({rows,columns,statusKey,busy,readOnly,onMove,renderCard}){
  return <div className="kanban-board" aria-label="Kanban board">{columns.map(([status,label])=>{
    const cards=rows.filter(row=>(row[statusKey]||columns[0][0])===status);
    return <section className="kanban-column" key={status} aria-label={label} onDragOver={e=>{if(!readOnly&&!busy)e.preventDefault();}} onDrop={e=>{
      e.preventDefault();if(readOnly||busy)return;
      const row=rows.find(item=>recordKey(item)===e.dataTransfer.getData('text/plain'));
      if(row&&row[statusKey]!==status)onMove(row,status);
    }}><header><h2>{label}</h2><span>{cards.length}</span></header><div className="kanban-cards">{cards.map(row=><article className="kanban-card" key={recordKey(row)} draggable={!readOnly&&!busy} onDragStart={e=>e.dataTransfer.setData('text/plain',recordKey(row))}>{renderCard(row)}<label className="kanban-move">Move to<select aria-label={`Move ${row.title||row.name||'lead'}`} value={row[statusKey]||columns[0][0]} disabled={readOnly||busy} onChange={e=>onMove(row,e.target.value)}>{columns.map(([key,title])=><option value={key} key={key}>{title}</option>)}</select></label></article>)}{!cards.length&&<p className="kanban-empty">No loaded cards in this stage.</p>}</div></section>;
  })}</div>;
}

function TaskBoard({readOnly,refresh}){
  const board=useBoard('tasks',refresh),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false);
  async function move(row,status){
    if(readOnly||busy)return;setBusy(true);board.setError('');
    try{await api(`tasks/${row.id}`,jsonRequest('PATCH',{status,version:Number(row.version)}));board.reload();}
    catch(e){board.setError(e.message);}finally{setBusy(false);}
  }
  return <section className="management-panel"><BoardTools board={board}><button className="button primary" disabled={readOnly||busy} onClick={()=>setEditing({title:'',description:'',project_name:'',status:'todo',priority:'normal',due_date:null})}>Add task</button></BoardTools>
    <p className="panel-footnote">Group tasks by project name. Drag cards between columns or use each card’s Move to menu.</p>
    {board.error&&<p className="feedback error" role="alert">{board.error}</p>}
    <Kanban rows={board.rows} columns={taskColumns} statusKey="status" busy={busy||board.loading} readOnly={readOnly} onMove={move} renderCard={row=><><span className={`task-priority priority-${row.priority}`}>{row.priority} priority</span><button className="kanban-title" onClick={()=>setEditing(row)}>{row.title}</button>{row.project_name&&<p className="task-project">{row.project_name}</p>}{row.description&&<p className="task-summary">{row.description}</p>}{row.due_date&&<small>Due {dateLabel(row.due_date)}</small>}</>}/>
    <BoardFooter board={board}/>{editing&&<TaskEditor initial={editing} readOnly={readOnly} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);board.reload();}}/>}
  </section>;
}
function TaskEditor({initial,readOnly,onClose,onSaved}){
  const [draft,setDraft]=useState(()=>({...initial,due_date:initial.due_date?.slice(0,10)||''})),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const dialog=useRef(null),dirty=JSON.stringify(taskPayload(draft))!==JSON.stringify(taskPayload(initial));
  useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();return()=>previous?.focus();},[]);
  function close(){if(!busy&&(!dirty||window.confirm('Discard these unsaved task changes?')))onClose();}
  function field(key,value){setDraft(current=>({...current,[key]:value}));}
  async function save(event){
    event.preventDefault();if(readOnly||busy)return;setBusy(true);setError('');
    try{await api('tasks'+(draft.id?'/'+draft.id:''),jsonRequest(draft.id?'PUT':'POST',{...taskPayload(draft),...(draft.id?{version:Number(draft.version)}:{})}));onSaved();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <dialog ref={dialog} className="management-dialog" aria-labelledby="task-editor-title" onCancel={e=>{e.preventDefault();close();}}><form onSubmit={save}><h2 id="task-editor-title">{draft.id?'Edit task':'Add task'}</h2>{error&&<p className="feedback error" role="alert">{error}</p>}<fieldset disabled={busy||readOnly}>
    <label>Task title<input autoFocus required maxLength={255} value={draft.title} onChange={e=>field('title',e.target.value)}/></label>
    <label>Project name<input maxLength={255} placeholder="e.g. Client website" value={draft.project_name} onChange={e=>field('project_name',e.target.value)}/></label>
    <label>Description<textarea rows={5} maxLength={10000} value={draft.description} onChange={e=>field('description',e.target.value)}/></label>
    <label>Stage<select value={draft.status} onChange={e=>field('status',e.target.value)}>{taskColumns.map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label>
    <label>Priority<select value={draft.priority} onChange={e=>field('priority',e.target.value)}>{['low','normal','high'].map(value=><option key={value}>{value}</option>)}</select></label>
    <label>Due date<input type="date" value={draft.due_date} onChange={e=>field('due_date',e.target.value)}/></label>
  </fieldset><footer><button className="button secondary" type="button" disabled={busy} onClick={close}>Cancel</button><button className="button primary" disabled={busy||readOnly}>{busy?'Saving…':'Save task'}</button></footer></form></dialog>;
}

function CRMBoard({readOnly,refresh}){
  const board=useBoard('crm',refresh),[busy,setBusy]=useState(false);
  async function move(row,lead_status){
    if(readOnly||busy)return;setBusy(true);board.setError('');
    try{await api(`crm/${row.resource}/${row.id}`,jsonRequest('PATCH',{lead_status}));board.reload();}
    catch(e){board.setError(e.message);}finally{setBusy(false);}
  }
  return <section className="management-panel"><BoardTools board={board}/><p className="panel-footnote">Contact messages and service inquiries share this pipeline. Open a lead to edit its stage, internal notes, read state or request status. Original form answers are preserved.</p>{board.error&&<p className="feedback error" role="alert">{board.error}</p>}
    <Kanban rows={board.rows} columns={leadColumns} statusKey="lead_status" busy={busy||board.loading} readOnly={readOnly} onMove={move} renderCard={row=><><span className="task-priority">{row.resource==='contacts'?'Contact form':'Service inquiry / booking'}</span><Link className="kanban-title" href={`/dashboard/${row.resource}/${row.id}`}>{row.name}</Link><p>{row.email}</p>{row.phone&&<p>{row.phone}</p>}{row.summary&&<p className="task-summary">{row.summary}</p>}<small>{dateLabel(row.created_at,true)}</small></>}/><BoardFooter board={board}/>
  </section>;
}

const runMessage={accepted:'n8n accepted this execution request. Check n8n for completion.',rejected:'n8n rejected this execution request. Check the webhook configuration.',uncertain:'The acknowledgement is uncertain. Check n8n before starting another run.',dispatching:'The execution request is being dispatched. Check n8n before starting another run.'};
function Workflows({readOnly,refresh}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[pending,setPending]=useState(null);
  useEffect(()=>{
    let active=true,timer;
    async function load(){
      try{const value=await api('workflows');if(active){setData(value);setError('');}}
      catch(e){if(active)setError(e.message);}
      if(active)timer=setTimeout(load,30000);
    }
    load();return()=>{active=false;clearTimeout(timer);};
  },[refresh,revision]);
  async function execute(workflow,retry=null){
    if(busy||readOnly)return;
    if(!retry&&!window.confirm(`Run “${workflow.name}” now? This executes its configured actions in n8n.`))return;
    const requestId=retry||crypto.randomUUID();setPending({workflow,requestId});setBusy(true);setError('');setNotice('');
    try{const result=await api(`workflows/${encodeURIComponent(workflow.id)}/run`,jsonRequest('POST',{requestId}));setNotice(runMessage[result.state]||'Check the execution in n8n.');setPending(null);setRevision(value=>value+1);}
    catch(e){setError(e.message+' Use “Check last request” to safely repeat the same request ID.');}
    finally{setBusy(false);}
  }
  return <section className="management-panel">{error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback notice" role="status">{notice}</p>}
    {data&&(!data.monitoringAvailable||error)&&<p className="panel-footnote">Live workflow monitoring is unavailable. Showing the last synced list and configured execution hooks.</p>}
    <div className="management-tools"><button className="button secondary" onClick={()=>setRevision(value=>value+1)} disabled={busy}>Refresh workflows</button>{pending&&<button className="button secondary" disabled={busy||readOnly} onClick={()=>execute(pending.workflow,pending.requestId)}>Check last request</button>}<a className="button secondary" href="https://n8n.shivpatel.in" target="_blank" rel="noopener noreferrer">Open n8n ↗</a></div>
    {!data&&!error&&<p role="status">Loading workflows…</p>}
    {data?.data.length===0&&<div className="workspace-panel"><h2>No connected execution webhooks yet</h2><p>Your workflows will appear from the collector or the server’s workflow configuration. Connect each workflow’s authenticated production webhook to enable its Run button.</p></div>}
    {data&&<section className="workspace-panel"><h2>Recent n8n executions</h2><p className="panel-footnote">{!error&&data.monitoringAvailable?`${data.today?.total??'—'} runs today · refreshes every 30 seconds`:'Last-known execution history; live counts are unavailable.'}</p><div className="workflow-history">{(data.executions||[]).map(run=><div key={run.id}><a href={'https://n8n.shivpatel.in/workflow/'+encodeURIComponent(run.workflow_id)+'/executions/'+encodeURIComponent(run.id)} target="_blank" rel="noopener noreferrer">{run.name||data.data.find(row=>row.id===String(run.workflow_id))?.name||'Workflow'} · #{run.id}</a><span>{run.status}</span><small>{dateLabel(run.started_at,true)}</small></div>)}</div>{!data.executions?.length&&<p className="panel-footnote">No execution history is available yet.</p>}</section>}
    <div className="workflow-cards">{data?.data.map(workflow=><article className="workspace-panel" key={workflow.id}><h2>{workflow.name}</h2><p>{workflow.active==null?'Status unavailable':workflow.active?'Published':'Draft'} · {workflow.agent_count||0} AI nodes</p><p>{workflow.runnable?'Execution webhook connected.':'Connect its execution webhook to enable running.'}</p><button className="button primary" disabled={busy||readOnly||!workflow.runnable||pending!==null} onClick={()=>execute(workflow)}>{busy?'Sending…':'Run workflow'}</button><a href={'https://n8n.shivpatel.in/workflow/'+encodeURIComponent(workflow.id)} target="_blank" rel="noopener noreferrer">View in n8n ↗</a></article>)}</div>
    {data?.runs.length>0&&<section className="workspace-panel"><h2>Recent execution requests</h2><p className="panel-footnote">Accepted means n8n acknowledged the trigger. It does not confirm the workflow completed.</p><div className="workflow-history">{data.runs.map(run=><div key={run.request_id}><strong>{data.data.find(row=>row.id===run.workflow_id)?.name||run.workflow_id}</strong><span>{run.state}</span><small>{dateLabel(run.created_at,true)}</small></div>)}</div></section>}
  </section>;
}
export default function ManagementPanels({section,...props}){
  if(section==='tasks')return <TaskBoard {...props}/>;
  if(section==='crm')return <CRMBoard {...props}/>;
  return <Workflows {...props}/>;
}
