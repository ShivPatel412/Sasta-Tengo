'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import dynamic from 'next/dynamic';
import {useDashboardPreferences} from '../preferences';
import {adminApi as api,jsonRequest} from '../../../lib/dashboard-client.mjs';
import {ArrowRight,ArrowUpRight,Briefcase,ChevronRight,FileText,Folder,Inbox,Layers3,LayoutDashboard,LogOut,Plus,RefreshCw,Settings,ShieldCheck,Workflow,Bot,Cloud,Server,Gamepad2,List,X} from './dashboard-icons';
import {draftPayload,sections as websiteSections,textValue} from '../../../lib/dashboard.mjs';
import {Badge,Collection,Overview,RecordEditor} from './workspace-panels';
import {appearanceVariables} from '../../../lib/dashboard-appearance.mjs';
import './workspace.css';
import './glass.css';
import './master.css';
import './master-design.css';
import './project-approvals.css';
import {controlSections} from '../../../lib/master-dashboard.mjs';

const AppearanceSettings=dynamic(()=>import('./appearance-settings'));
const ControlPanels=dynamic(()=>import('./control-panels'));
const ProjectApprovals=dynamic(()=>import('./project-approvals'));
const InstagramStudio=dynamic(()=>import('./instagram-studio'));

const icons={overview:LayoutDashboard,contacts:Inbox,appointments:FileText,projects:Folder,experiences:Briefcase,types:Layers3,settings:Settings,workflows:Workflow,agents:Bot,cloud:Cloud,services:Server,approvals:ShieldCheck,instagram:Folder};
function Login({credentials,setCredentials,busy,error,onSubmit,appearance,master}){
  return <main className={`workspace-login glass-login${master?' master-login':''}`} style={appearanceVariables(appearance)}><section className="login-story"><Link href="/" className="workspace-brand"><span className="brand-monogram">sp<span/></span>SHIV / WORKSPACE</Link><div><span className="mini-label">BEHIND THE WORK</span><h1>{master?'Your whole ecosystem.':'Your portfolio.'}<br/>One workspace.</h1><p>{master?'Projects, conversations, workflows, AI agents and your 3D café. One private home.':'A place for new conversations, your latest projects and the story you’re building.'}</p><div className="login-story-tags"><span><Inbox size={16}/>Inquiries</span><span><Folder size={16}/>Projects</span><span><Briefcase size={16}/>Experience</span></div></div><p className="login-story-foot">Thoughtful work starts with a little clarity.</p><span className="login-orbit"/></section><section className="login-form-side"><form onSubmit={onSubmit}><div className="login-lock"><ShieldCheck size={23}/></div><span className="mini-label">YOUR PRIVATE WORKSPACE</span><h2>Welcome back.</h2><p>{master?'Sign in once to your projects, automation and personal workspace.':'Sign in to manage your website and new opportunities.'}</p><label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="username" required placeholder="you@example.com" value={credentials.email} onChange={e=>setCredentials({...credentials,email:e.target.value})}/><label htmlFor="login-password">Password</label><input id="login-password" type="password" autoComplete="current-password" required value={credentials.password} onChange={e=>setCredentials({...credentials,password:e.target.value})}/>{error&&<p role="alert" className="feedback error">{error}</p>}<button className="button primary" disabled={busy}>{busy?'Signing in…':<>Sign in to workspace <ArrowRight size={17}/></>}</button>{!master&&<a className="login-back" href="https://dashboard.shivpatel.in">Open control room <ArrowUpRight size={14}/></a>}<a className="login-back" href={master?'https://www.shivpatel.in':'/'}>Back to website <ArrowUpRight size={14}/></a></form></section></main>;
}
export default function Dashboard({section,recordId,master=false}){
  const studio=section==='instagram';
  const sections=master?{instagram:{label:'Instagram Studio',description:'Your private photo library, AI recommendations and Instagram drafts.'},...websiteSections,...controlSections,approvals:{label:'Project approvals',description:'Review GitHub projects, generated covers and real website captures.'}}:websiteSections;
  const control=master&&Boolean(controlSections[section]);
  const approvals=master&&section==='approvals';
  const router=useRouter();
  const [menuOpen,setMenuOpen]=useState(false);
  const sidebarRef=useRef(null),menuRef=useRef(null);
  useEffect(()=>{
    if(!master||!menuOpen)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    sidebarRef.current?.querySelector('button,a')?.focus();
    function trap(event){
      if(event.key==='Escape'){setMenuOpen(false);return;}
      if(event.key!=='Tab')return;
      const items=[...sidebarRef.current.querySelectorAll('a,button')].filter(el=>!el.disabled);
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    document.addEventListener('keydown',trap);
    return()=>{document.body.style.overflow=previous;document.removeEventListener('keydown',trap);menuRef.current?.focus();};
  },[master,menuOpen]);
  const {appearance,setAppearance,commitAppearance,session,ready,error:preferencesError,refreshSession,clear}=useDashboardPreferences();
  const [rows,setRows]=useState([]),[total,setTotal]=useState(0),[page,setPage]=useState(1);
  const [draft,setDraft]=useState(null),[detail,setDetail]=useState(null),[editorSection,setEditorSection]=useState(null),[dirty,setDirty]=useState(false),[categories,setCategories]=useState([]);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const [stats,setStats]=useState(null),[refresh,setRefresh]=useState(0);
  const [search,setSearch]=useState(''),[searchInput,setSearchInput]=useState(''),[filter,setFilter]=useState(''),[kind,setKind]=useState('');
  const [credentials,setCredentials]=useState({email:'',password:''});
  const readOnly=!ready||session.readOnly;
  const activeError=error||preferencesError;
  useEffect(()=>{
    if(section==='login'||!sections[section])return;
    if(section==='settings'||control||approvals||studio){setLoaded(true);return;}
    let active=true;setLoaded(false);setError('');
    (async()=>{
      try{
        const path=section==='overview'?'stats':`${section}${recordId?'/'+recordId:''}?page=${page}&search=${encodeURIComponent(search)}&filter=${encodeURIComponent(filter)}&kind=${encodeURIComponent(kind)}`;
        const [data,types]=await Promise.all([api(path),section==='projects'?api('categories'):Promise.resolve(null)]);
        if(!active)return;
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
  },[section,recordId,page,refresh,search,filter,kind,control,approvals,studio]);
  async function login(event){event.preventDefault();setBusy(true);setError('');try{await api('login',jsonRequest('POST',credentials));window.location.assign('/dashboard');}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function startNew(target=section){
    setError('');setNotice('');setBusy(true);
    try{
      const types=target==='projects'?(section==='projects'||categories.length?categories:await api('categories')):categories;if(target==='projects')setCategories(types);
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
  function closeEditor(){
    if(busy)return;
    if(dirty&&!window.confirm('Discard the unsaved changes in this editor?'))return;
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
  async function saveAppearance(event){
    event.preventDefault();if(readOnly)return;
    setBusy(true);setError('');setNotice('');
    try{const saved=await api('appearance',jsonRequest('PUT',appearance));commitAppearance(saved);setNotice('Appearance saved. Your dashboard style now follows your account.');}catch(e){setError(e.message);}finally{setBusy(false);}
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
  if(section==='login')return <Login credentials={credentials} setCredentials={setCredentials} busy={busy} error={error} onSubmit={login} appearance={appearance} master={master}/>;
  if(!sections[section])return <main className="workspace-not-found"><h1>Page not found</h1><Link href="/dashboard">Back to workspace</Link></main>;
  const description=sections[section],creative=['projects','experiences','types'].includes(section);
  return <div className={`workspace glass-workspace${master?' master-workspace'+(menuOpen?' menu-open':''):''}`} style={appearanceVariables(appearance)}>{master&&<a className="master-skip" href="#workspace-content">Skip to content</a>}<aside id="master-sidebar" ref={sidebarRef} className="workspace-sidebar" role={menuOpen?'dialog':undefined} aria-modal={menuOpen?true:undefined} aria-label="Workspace navigation">{master&&<button className="master-menu-close" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}><X size={24}/></button>}<Link className="workspace-brand" href="/dashboard"><span className="brand-monogram">s<span/></span><span>SHIV<span className="brand-subtitle">{master?'Master dashboard':'Portfolio workspace'}</span></span></Link><nav aria-label="Dashboard" onClick={event=>{if(event.target.closest('a'))setMenuOpen(false);}}>{master?[['Workspace',['overview','projects','contacts','appointments','experiences','types']],['Automation',['instagram','approvals','workflows','agents']],['Infrastructure',['cloud','services']]].map(([group,keys])=><div className="master-nav-group" key={group}><span className="sidebar-label caption-3">{group}</span>{keys.map(key=>{const Icon=icons[key];return <Link href={key==='overview'?'/dashboard':'/dashboard/'+key} key={key} aria-current={section===key?'page':undefined}><Icon size={20} aria-hidden="true"/><span>{sections[key].label}</span></Link>;})}</div>):Object.entries(sections).map(([key,{label}])=>{const Icon=icons[key];return <Link href={key==='overview'?'/dashboard':'/dashboard/'+key} key={key} aria-current={section===key?'page':undefined}><Icon size={18} aria-hidden="true"/><span>{label}</span>{section===key&&<i/>}</Link>;})}{master&&<div className="master-nav-group"><span className="sidebar-label caption-3">Tools</span><a href="/dashboard/3d"><Gamepad2 size={20} aria-hidden="true"/><span>3D gaming café</span></a><a href="/dashboard/photos"><Folder size={20} aria-hidden="true"/><span>Instagram photos</span></a><Link href="/dashboard/settings" aria-current={section==='settings'?'page':undefined}><Settings size={20} aria-hidden="true"/><span>Settings</span></Link></div>}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span><i/>{master?'ONE CONNECTED WORKSPACE':'ONE CONNECTED WEBSITE'}</span><p>A little clarity for<br/>your next big thing.</p><a href={master?'https://www.shivpatel.in':'/'} target="_blank" rel="noopener noreferrer">Visit your website <ArrowUpRight size={15}/></a></div><div className="owner-card"><span className="owner-avatar">SP</span><div><strong>{session.user?.name||'Shiv Patel'}</strong><small>{master?'Personal workspace':'Website owner'}</small></div><button title="Sign out" aria-label="Sign out" onClick={async()=>{try{await api('logout',{method:'POST'});clear();window.location.assign('/dashboard/login');}catch(e){setError(e.message);}}}><LogOut size={17}/></button></div></div></aside>
    <div className="workspace-body" inert={master&&menuOpen?true:undefined}><div className="workspace-topbar"><div>{master&&<button className="master-menu-toggle" ref={menuRef} aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="master-sidebar" onClick={()=>setMenuOpen(true)}><List size={24}/></button>}<span>Workspace</span><ChevronRight size={13}/><strong>{description.label}</strong></div><div className="workspace-topbar-actions">{master?<span className="master-local-label">Master workspace</span>:<nav className="dashboard-switcher" aria-label="Dashboard switcher"><a href="https://dashboard.shivpatel.in">Control room</a><Link href="/dashboard" aria-current="page">Website</Link></nav>}<a className="website-preview-link" href={master?'https://www.shivpatel.in':'/'} target="_blank" rel="noopener noreferrer">View website <ArrowUpRight size={14}/></a></div></div><main className="workspace-main" id="workspace-content" tabIndex={-1}><header className="workspace-heading"><div><p className="mini-label">{master?'YOUR PERSONAL WORKSPACE':section==='overview'?'YOUR CONTROL CENTER':'MANAGE YOUR WEBSITE'}</p><h1>{description.label}{section==='overview'&&<span className="heading-period">.</span>}</h1><p>{description.description}</p></div><div className="heading-actions"><button className="button secondary" aria-label="Refresh workspace" disabled={!loaded||!ready||busy} onClick={()=>{refreshSession();setRefresh(n=>n+1);}}><RefreshCw size={15} className={!loaded?'spinning':''}/><span>Refresh</span></button>{creative&&<button className="button primary" disabled={!loaded||!ready||busy} onClick={()=>startNew()}><Plus size={17}/>{section==='projects'?'Add project':section==='experiences'?'Add experience':'Add type'}</button>}</div></header>
      <div className="workspace-status"><span><i className={activeError?'status-error':''}/>{!loaded||!ready?'Connecting to your workspace…':activeError?'Attention needed':'Connected to your website'}</span><Badge>{readOnly?'Review mode':'Editing enabled'}</Badge></div>
      {master&&process.env.NODE_ENV==='development'&&!readOnly&&loaded&&ready&&<div className="review-banner"><ShieldCheck size={18}/><div><strong>Local portfolio copy</strong><span>Edits and approvals stay in the isolated local database. Your public website is unchanged.</span></div></div>}
      {readOnly&&loaded&&ready&&<div className="review-banner"><ShieldCheck size={18}/><div><strong>Review mode. Your live content stays protected.</strong><span>Browse your projects and inquiries. Publishing and changes are paused in this preview.</span></div></div>}
      {activeError&&!draft&&<p className="feedback error" role="alert">{activeError}</p>}{notice&&!draft&&<p className="feedback notice" role="status">{notice}</p>}
      {(!loaded||!ready)&&<div className="workspace-loading" role="status" aria-busy="true"><div className="master-loading-bars" aria-hidden="true"><i/><i/><i/></div><span>Loading your workspace…</span></div>}
      {loaded&&ready&&section==='overview'&&stats&&<Overview stats={stats} onNew={startNew}/>}
      {loaded&&ready&&studio&&<InstagramStudio readOnly={readOnly}/>}
      {loaded&&ready&&approvals&&<ProjectApprovals readOnly={readOnly}/>}
      {loaded&&ready&&master&&(section==='overview'||control)&&<ControlPanels section={section} refresh={refresh}/>}
      {loaded&&ready&&section==='settings'&&<AppearanceSettings value={appearance} onChange={value=>{setAppearance(value);setNotice('');setError('');}} onSave={saveAppearance} busy={busy} readOnly={readOnly}/>}
      {loaded&&ready&&section!=='overview'&&section!=='settings'&&!control&&!approvals&&!studio&&(!error||rows.length>0)&&<Collection section={section} rows={rows} total={total} page={page} setPage={setPage} searchInput={searchInput} setSearchInput={setSearchInput} onSearch={e=>{e.preventDefault();setPage(1);setSearch(searchInput.trim());}} filter={filter} setFilter={value=>{setPage(1);setFilter(value);}} kind={kind} setKind={value=>{setPage(1);setKind(value);}} loaded={loaded} busy={busy} readOnly={readOnly} onOpen={openRecord} onDelete={remove} onNew={startNew}/>}
      <footer className="workspace-footer"><span>SHIV / WORKSPACE</span><span>Your work. Your conversations. One place.</span></footer>
    </main></div>
    {draft&&editorSection&&<RecordEditor key={editorSection+(draft.id||'new')} section={editorSection} draft={draft} detail={detail} onField={onField} onSave={save} onClose={closeEditor} onUpload={upload} onNewType={newType} onImport={importProject} categories={categories} readOnly={readOnly} uploadsEnabled={session.uploadsEnabled} busy={busy} error={error} notice={notice} dirty={dirty}/>}
  </div>;
}
