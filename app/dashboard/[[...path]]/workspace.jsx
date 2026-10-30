'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,ArrowUpRight,Briefcase,ChevronRight,FileText,Folder,Inbox,Layers3,LayoutDashboard,LogOut,Plus,RefreshCw,ShieldCheck} from 'lucide-react';
import {draftPayload,sections,textValue} from '../../../lib/dashboard.mjs';
import {Badge,Collection,Overview,RecordEditor} from './workspace-panels';
import './workspace.css';

const icons={overview:LayoutDashboard,contacts:Inbox,appointments:FileText,projects:Folder,experiences:Briefcase,types:Layers3};
async function api(path,options={}) {
  const response=await fetch(`/api/admin/${path}`,{cache:'no-store',...options});
  let data;
  try{data=await response.json();}catch{throw new Error('The workspace could not load a response. Please try again.');}
  if(!response.ok){
    if(response.status===401&&path!=='login')window.location.assign('/dashboard/login');
    throw new Error((data.message||'Request failed.')+(data.errors?' '+Object.entries(data.errors).map(([key,value])=>`${key}: ${Array.isArray(value)?value.join(', '):value}`).join('; '):''));
  }
  return data;
}
const jsonRequest=(method,data)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function Login({credentials,setCredentials,busy,error,onSubmit}){
  return <main className="workspace-login"><section className="login-story"><Link href="/" className="workspace-brand"><span className="brand-monogram">sp<span/></span>SHIV / WORKSPACE</Link><div><span className="mini-label">BEHIND THE WORK</span><h1>Your portfolio.<br/>One workspace.</h1><p>A place for new conversations, your latest projects and the story you’re building.</p><div className="login-story-tags"><span><Inbox size={16}/>Inquiries</span><span><Folder size={16}/>Projects</span><span><Briefcase size={16}/>Experience</span></div></div><p className="login-story-foot">Thoughtful work starts with a little clarity.</p><span className="login-orbit"/></section><section className="login-form-side"><form onSubmit={onSubmit}><div className="login-lock"><ShieldCheck size={23}/></div><span className="mini-label">YOUR PRIVATE WORKSPACE</span><h2>Welcome back.</h2><p>Sign in to manage your website and new opportunities.</p><label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="username" required placeholder="you@example.com" value={credentials.email} onChange={e=>setCredentials({...credentials,email:e.target.value})}/><label htmlFor="login-password">Password</label><input id="login-password" type="password" autoComplete="current-password" required value={credentials.password} onChange={e=>setCredentials({...credentials,password:e.target.value})}/>{error&&<p role="alert" className="feedback error">{error}</p>}<button className="button primary" disabled={busy}>{busy?'Signing in…':<>Sign in to workspace <ArrowRight size={17}/></>}</button><Link className="login-back" href="/">Back to website <ArrowUpRight size={14}/></Link></form></section></main>;
}
export default function Dashboard({section,recordId}){
  const router=useRouter();
  const [rows,setRows]=useState([]),[total,setTotal]=useState(0),[page,setPage]=useState(1);
  const [draft,setDraft]=useState(null),[detail,setDetail]=useState(null),[editorSection,setEditorSection]=useState(null),[dirty,setDirty]=useState(false),[categories,setCategories]=useState([]);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const [session,setSession]=useState({readOnly:true,uploadsEnabled:false}),[stats,setStats]=useState(null),[refresh,setRefresh]=useState(0);
  const [search,setSearch]=useState(''),[searchInput,setSearchInput]=useState(''),[filter,setFilter]=useState(''),[kind,setKind]=useState('');
  const [credentials,setCredentials]=useState({email:'',password:''});
  const readOnly=session.readOnly;
  useEffect(()=>{
    if(section==='login'||!sections[section])return;
    let active=true;setLoaded(false);setError('');
    (async()=>{
      try{
        const path=section==='overview'?'stats':`${section}${recordId?'/'+recordId:''}?page=${page}&search=${encodeURIComponent(search)}&filter=${encodeURIComponent(filter)}&kind=${encodeURIComponent(kind)}`;
        const [current,data,types]=await Promise.all([api('session'),api(path),section==='projects'?api('categories'):Promise.resolve(null)]);
        if(!active)return;
        setSession(current);
        if(section==='overview')setStats(data);
        else{
          setRows(data.data);setTotal(Number(data.count));
          if(recordId){setDetail(data.data[0]);setDraft(data.data[0]);setEditorSection(section);setDirty(false);}
          if(types)setCategories(types);
        }
      }catch(e){if(active)setError(e.message);}
      finally{if(active)setLoaded(true);}
    })();
    return()=>{active=false;};
  },[section,recordId,page,refresh,search,filter,kind]);
  async function login(event){event.preventDefault();setBusy(true);setError('');try{await api('login',jsonRequest('POST',credentials));window.location.assign('/dashboard');}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function startNew(target=section){
    setError('');setNotice('');setBusy(true);
    try{
      const types=target==='projects'?await api('categories'):categories;if(target==='projects')setCategories(types);
      setDetail(null);setEditorSection(target);setDirty(false);
      setDraft({order:0,is_read:false,lead_status:'new',is_featured:false,is_current:false,category:types[0]?.category||''});
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function openRecord(row){setError('');setNotice('');setEditorSection(section);setDetail(row);setDraft({...row});setDirty(false);}
  function onField(key,value){setDirty(true);setDraft(current=>({...current,[key]:value,...(key==='is_current'&&value?{end_date:null}:{})}));}
  async function importProject(url){
    if((draft.title||draft.description)&&!window.confirm('Replace this draft’s title, description, technologies, GitHub link, live link and cover with the GitHub details? Other fields will be kept.'))return;
    setBusy(true);setError('');setNotice('');
    try{
      const data=await api('github-import',jsonRequest('POST',{url}));
      setDraft(current=>({...current,...data.project}));setDirty(true);
      setNotice(['GitHub details imported. Check the project type and details, then save to publish.',...data.warnings].join(' '));
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function closeEditor(force=false){
    if(busy)return;
    if(!force&&dirty&&!window.confirm('Discard the unsaved changes in this editor?'))return;
    setDraft(null);setDetail(null);setEditorSection(null);setDirty(false);setError('');
    if(recordId)router.push(`/dashboard/${section}`);
  }
  async function save(event){
    event.preventDefault();if(readOnly){setError('Saving is disabled in review mode.');return;}
    setBusy(true);setError('');setNotice('');
    try{
      const id=draft.id,target=editorSection;
      await api(target+(id?'/'+id:''),jsonRequest(id?'PUT':'POST',draftPayload(target,draft)));
      setDraft(null);setDetail(null);setEditorSection(null);setDirty(false);setNotice('Saved successfully. Your website will use the updated details.');
      if(recordId)router.push(`/dashboard/${section}`);else setRefresh(n=>n+1);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function remove(row){
    if(readOnly||!window.confirm(`Delete “${row.title||row.name||row.email||'this record'}”? Saved image files will be retained.`))return;
    setBusy(true);setError('');
    try{await api(`${section}/${row.id}`,{method:'DELETE'});setRefresh(n=>n+1);setNotice('Record deleted.');}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function upload(event,key,multiple){
    const files=Array.from(event.target.files||[]);if(!files.length||readOnly)return;
    setBusy(true);setError('');
    try{
      const urls=[];
      for(const file of files){
        if(file.size>4000000)throw new Error('Choose images under 4 MB each.');
        const response=await fetch('/api/admin/upload',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
        const data=await response.json();if(!response.ok)throw new Error(data.message||'Image upload failed.');urls.push(data.url);
      }
      setDraft(current=>({...current,[key]:multiple?[textValue(current[key]),...urls].filter(Boolean).join('\n'):urls[0]}));setDirty(true);setNotice('Image uploaded. Save the entry to attach it to your website.');
    }catch(e){setError(e.message);}finally{setBusy(false);event.target.value='';}
  }
  async function newType(name){
    if(readOnly)return false;
    setBusy(true);setError('');
    try{await api('types',jsonRequest('POST',{name}));const types=await api('categories');setCategories(types);onField('category',types.find(t=>t.name===name)?.category||name);return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}
  }
  if(section==='login')return <Login credentials={credentials} setCredentials={setCredentials} busy={busy} error={error} onSubmit={login}/>;
  if(!sections[section])return <main className="workspace-not-found"><h1>Page not found</h1><Link href="/dashboard">Back to workspace</Link></main>;
  const description=sections[section],creative=['projects','experiences','types'].includes(section);
  return <div className="workspace"><aside className="workspace-sidebar"><Link className="workspace-brand" href="/dashboard"><span className="brand-monogram">sp<span/></span><span>SHIV<span className="brand-subtitle">Portfolio workspace</span></span></Link><span className="sidebar-label">YOUR WORKSPACE</span><nav aria-label="Dashboard">{Object.entries(sections).map(([key,{label}])=>{const Icon=icons[key];return <Link href={key==='overview'?'/dashboard':`/dashboard/${key}`} key={key} aria-current={section===key?'page':undefined}><Icon size={18}/><span>{label}</span>{section===key&&<i/>}</Link>;})}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span><i/>ONE CONNECTED WEBSITE</span><p>A little clarity for<br/>your next big thing.</p><Link href="/" target="_blank" rel="noopener noreferrer">Visit your website <ArrowUpRight size={15}/></Link></div><div className="owner-card"><span className="owner-avatar">SP</span><div><strong>{session.user?.name||'Shiv Patel'}</strong><small>Website owner</small></div><button title="Sign out" aria-label="Sign out" onClick={async()=>{try{await api('logout',{method:'POST'});window.location.assign('/dashboard/login');}catch(e){setError(e.message);}}}><LogOut size={17}/></button></div></div></aside>
    <div className="workspace-body"><div className="workspace-topbar"><div><span>Workspace</span><ChevronRight size={13}/><strong>{description.label}</strong></div><Link href="/" target="_blank" rel="noopener noreferrer">View website <ArrowUpRight size={14}/></Link></div><main className="workspace-main"><header className="workspace-heading"><div><p className="mini-label">{section==='overview'?'YOUR CONTROL CENTER':'MANAGE YOUR WEBSITE'}</p><h1>{description.label}{section==='overview'&&<span className="heading-period">.</span>}</h1><p>{description.description}</p></div><div className="heading-actions"><button className="button secondary" disabled={!loaded||busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={15} className={!loaded?'spinning':''}/><span>Refresh</span></button>{creative&&<button className="button primary" disabled={!loaded||busy} onClick={()=>startNew()}><Plus size={17}/>{section==='projects'?'Add project':section==='experiences'?'Add experience':'Add type'}</button>}</div></header>
      <div className="workspace-status"><span><i className={error?'status-error':''}/>{!loaded?'Connecting to your workspace…':error?'Attention needed':'Connected to your website'}</span><Badge>{readOnly?'Review mode':'Editing enabled'}</Badge></div>
      {readOnly&&loaded&&<div className="review-banner"><ShieldCheck size={18}/><div><strong>Your workspace is in review mode.</strong><span>You can view every submission and explore the editors. Saving, deleting and uploading are disabled.</span></div></div>}
      {error&&!draft&&<p className="feedback error" role="alert">{error}</p>}{notice&&!draft&&<p className="feedback notice" role="status">{notice}</p>}
      {!loaded&&<div className="workspace-loading" role="status" aria-busy="true"><RefreshCw size={20} className="spinning"/><span>Loading your workspace…</span></div>}
      {loaded&&section==='overview'&&stats&&<Overview stats={stats} onNew={startNew}/>}
      {loaded&&section!=='overview'&&(!error||rows.length>0)&&<Collection section={section} rows={rows} total={total} page={page} setPage={setPage} searchInput={searchInput} setSearchInput={setSearchInput} onSearch={e=>{e.preventDefault();setPage(1);setSearch(searchInput.trim());}} filter={filter} setFilter={value=>{setPage(1);setFilter(value);}} kind={kind} setKind={value=>{setPage(1);setKind(value);}} loaded={loaded} busy={busy} readOnly={readOnly} onOpen={openRecord} onDelete={remove} onNew={startNew}/>}
      <footer className="workspace-footer"><span>SHIV / WORKSPACE</span><span>Your work. Your conversations. One place.</span></footer>
    </main></div>
    {draft&&editorSection&&<RecordEditor key={editorSection+(draft.id||'new')} section={editorSection} draft={draft} detail={detail} onField={onField} onSave={save} onClose={closeEditor} onUpload={upload} onNewType={newType} onImport={importProject} categories={categories} readOnly={readOnly} uploadsEnabled={session.uploadsEnabled} busy={busy} error={error} notice={notice} dirty={dirty}/>}
  </div>;
}
