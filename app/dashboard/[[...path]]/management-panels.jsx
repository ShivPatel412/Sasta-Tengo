'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {adminApi as api,jsonRequest} from '../../../lib/dashboard-client.mjs';
import {dateLabel} from '../../../lib/dashboard.mjs';
import {formSources} from '../../../lib/form-sources.mjs';
import './management.css';
import WorkflowDashboard from './workflow-dashboard';

const taskColumns=[['todo','To do'],['in_progress','In progress'],['review','Review'],['done','Done']];
const leadColumns=[['new','New'],['contacted','Contacted'],['qualified','Qualified'],['closed','Closed']];
const taskPayload=row=>Object.fromEntries(['title','description','project_name','status','priority','due_date'].map(key=>[key,key==='due_date'?(row[key]?.slice(0,10)||null):row[key]]));
const recordKey=row=>row.resource?`${row.resource}/${row.id}`:String(row.id);

function useBoard(path,refresh,source=''){
  const [rows,setRows]=useState([]),[total,setTotal]=useState(0),[page,setPage]=useState(1);
  const [search,setSearch]=useState(''),[input,setInput]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    api(`${path}?page=${page}&search=${encodeURIComponent(search)}&source=${encodeURIComponent(source)}`,{signal:controller.signal}).then(data=>{
      if(controller.signal.aborted)return;
      setRows(current=>page===1?data.data:[...current,...data.data.filter(row=>!current.some(old=>recordKey(old)===recordKey(row)))]);
      setTotal(Number(data.count));
    }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[path,page,search,refresh,revision,source]);
  return {rows,total,page,loading,error,setError,input,setInput,
    reload(){setPage(1);setRows([]);setRevision(value=>value+1);},
    more(){setPage(value=>value+1);},
    search(event){event.preventDefault();setPage(1);setRows([]);setSearch(input.trim());setRevision(value=>value+1);}};
}

function BoardTools({board,children}){
  return <div className="management-tools"><form onSubmit={board.search}><label htmlFor="board-search" className="sr-only">Search this board</label><input id="board-search" type="search" placeholder="Search this board" value={board.input} onChange={e=>board.setInput(e.target.value)}/><button className="button secondary" disabled={board.loading}>Search</button></form><button className="button secondary" disabled={board.loading} onClick={board.reload}>Refresh board</button>{children}</div>;
}
function BoardFooter({board}){
  return <div className="board-footer"><span>{board.loading?'Loading…':`Showing ${board.rows.length} of ${board.total} records.`}</span>{board.rows.length<board.total&&<button className="button secondary" disabled={board.loading||Boolean(board.error)} onClick={board.more}>Load more cards</button>}</div>;
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
  return <section className="management-panel"><BoardTools board={board}/><p className="panel-footnote">Contact, service and landing page enquiries share this pipeline. Open a lead to edit its stage, internal notes, read state or request status. Original form answers are preserved.</p>{board.error&&<p className="feedback error" role="alert">{board.error}</p>}
    <Kanban rows={board.rows} columns={leadColumns} statusKey="lead_status" busy={busy||board.loading} readOnly={readOnly} onMove={move} renderCard={row=><><span className="task-priority">{formSources[row.form_source]||'Website enquiry'}</span><Link className="kanban-title" href={`/dashboard/${row.resource}/${row.id}`}>{row.name}</Link><p>{row.email}</p>{row.phone&&<p>{row.phone}</p>}{row.summary&&<p className="task-summary">{row.summary}</p>}<small>{dateLabel(row.created_at,true)}</small></>}/><BoardFooter board={board}/>
    {process.env.NEXT_PUBLIC_LEADS_ENABLED==='1'&&<LeadConversations readOnly={readOnly} refresh={refresh}/>}
  </section>;
}

function FormsInbox({refresh,source=''}){
  const board=useBoard('forms',refresh,source);
  return <section className="management-panel">
    <nav className="forms-source-tabs" aria-label="Form source">{[['','All forms'],...Object.entries(formSources)].map(([key,label])=><Link key={key} href={'/dashboard/forms'+(key?'/'+key:'')} aria-current={source===key?'page':undefined}>{label}</Link>)}</nav>
    <section className="workspace-panel"><h2>What happens after someone submits?</h2><p className="panel-footnote">The enquiry is saved here, then an email notification is sent to you and an acknowledgement to the visitor. Open a submission for every original answer, notes and status. Track follow up in <Link href="/dashboard/crm">Lead CRM</Link>.</p></section>
    <BoardTools board={board}/>
    {board.error&&<p className="feedback error" role="alert">{board.error}</p>}
    <div className="records-table" aria-busy={board.loading}><table><thead><tr><th>Form</th><th>Sender</th><th>Subject / project</th><th>Stage</th><th>Received</th><th>Details</th></tr></thead><tbody>{board.rows.map(row=><tr key={recordKey(row)}><td>{formSources[row.form_source]||'Website enquiry'}</td><td><Link className="record-name" href={`/dashboard/${row.resource}/${row.id}`}>{row.name}</Link><small>{row.email}</small>{row.phone&&<small>{row.phone}</small>}</td><td>{row.summary||'Service enquiry'}</td><td>{row.lead_status||'new'}</td><td>{dateLabel(row.created_at,true)}</td><td><Link className="button secondary small" href={`/dashboard/${row.resource}/${row.id}`}>View submission</Link></td></tr>)}</tbody></table></div>
    {!board.rows.length&&!board.loading&&!board.error&&<div className="empty-state"><h3>No submissions yet</h3><p>{source?formSources[source]+' submissions will appear here.':'Submissions from all three website forms will appear here.'}</p></div>}
    <BoardFooter board={board}/>
  </section>;
}

function LeadConversations({readOnly,refresh}){
  const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    api('lead-conversations',{signal:controller.signal}).then(value=>{setRows(value.data);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    return()=>controller.abort();
  },[refresh,revision]);
  async function stop(row,state){
    if(busy||readOnly)return;setBusy(true);setError('');
    try{await api('lead-conversations',jsonRequest('PATCH',{id:row.id,version:Number(row.version),state}));}
    catch(e){setError(e.message);}finally{setBusy(false);setRevision(value=>value+1);}
  }
  return <section className="workspace-panel"><h2>WhatsApp follow-up</h2>
    <p className="panel-footnote">Latest 100 conversations. Accepted means n8n acknowledged the event. Requested call times require a person to confirm availability.</p>
    <button className="button secondary" disabled={busy} onClick={()=>setRevision(value=>value+1)}>Refresh conversations</button>
    {error&&<p className="feedback error" role="alert">{error}</p>}
    {rows.map(row=><article className="kanban-card" key={row.id}>
      <Link href={`/dashboard/${row.resource}/${row.record_id}`}>Lead #{row.record_id}</Link><p>{row.phone} · {row.state.replaceAll('_',' ')}</p>
      {row.preferred_call_at&&<p>Requested: {row.preferred_call_at} UTC · {row.timezone}</p>}
      <button className="button secondary" disabled={readOnly||busy||['human_takeover','opted_out'].includes(row.state)} onClick={()=>stop(row,'human_takeover')}>Take over</button>
      <button className="button secondary" disabled={readOnly||busy||row.state==='opted_out'} onClick={()=>stop(row,'opted_out')}>Stop WhatsApp</button>
    </article>)}
    {!rows.length&&!error&&<p>No WhatsApp follow-up records loaded.</p>}
  </section>;
}

export default function ManagementPanels({section,...props}){
  if(section==='forms')return <FormsInbox {...props}/>;
  if(section==='tasks')return <TaskBoard {...props}/>;
  if(section==='crm')return <CRMBoard {...props}/>;
  return <WorkflowDashboard {...props}/>;
}
