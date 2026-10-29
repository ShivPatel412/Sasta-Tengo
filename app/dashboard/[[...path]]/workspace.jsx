'use client';
import { useEffect, useState } from 'react';
import './workspace.css';
const sections = ['overview','contacts','appointments','projects','experiences','types'];
const fields = {
  contacts: [['admin_notes','Notes','textarea'],['is_read','Read','checkbox'],['lead_status','Lead stage','lead']],
  appointments: [['status','Request status','status'],['admin_notes','Notes','textarea'],['lead_status','Lead stage','lead']],
  projects: [['title','Title'],['description','Description','textarea'],['category','Project type','category'],['image','Legacy cover image'],['poster','Poster path or URL','upload'],['gallery','Gallery paths or URLs (one per line)','uploads'],['technologies','Technologies (one per line)','lines'],['github_url','GitHub URL','url'],['live_url','Live URL','url'],['is_featured','Featured','checkbox'],['order','Display order','number']],
  experiences: [['title','Job title'],['company','Company'],['logo','Logo path or URL'],['website','Website','url'],['location','Location'],['start_date','Start date','date'],['end_date','End date','date'],['is_current','Current role','checkbox'],['description','Description','textarea'],['summary','Summary','textarea'],['highlights','Highlights (one per line)','lines'],['technologies','Technologies (one per line)','lines'],['order','Display order','number']],
  types: [['name','Display name']]
};
async function api(path, options) {
  const response = await fetch(`/api/admin/${path}`, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== 'login') window.location.assign('/dashboard/login');
    throw new Error(data.message + (data.errors ? ' ' + Object.entries(data.errors).map(([k,v]) => `${k}: ${v.join(', ')}`).join('; ') : ''));
  }
  return data;
}
function textValue(value) { return Array.isArray(value) ? value.join('\n') : value ?? ''; }
export default function Dashboard({ section, recordId }) {
  const [rows,setRows] = useState([]), [total,setTotal] = useState(0), [page,setPage] = useState(1);
  const [draft,setDraft] = useState(null), [detail,setDetail] = useState(null), [categories,setCategories] = useState([]);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false), [loaded,setLoaded] = useState(false);
  const [readOnly,setReadOnly] = useState(true), [stats,setStats] = useState(null), [refresh,setRefresh] = useState(0);
  const [search,setSearch] = useState(''), [filter,setFilter] = useState('');
  const [credentials,setCredentials] = useState({ email: '', password: '' });
  useEffect(() => {
    if (section === 'login' || !sections.includes(section)) return;
    let active = true; setLoaded(false); setError('');
    (async () => {
      try {
        const session = await api('session'); if (!active) return; setReadOnly(session.readOnly);
        if (section === 'overview') { const data = await api('stats'); if (active) setStats(data); }
        else {
          const data = await api(`${section}${recordId ? '/' + recordId : ''}?page=${page}&search=${encodeURIComponent(search)}&filter=${encodeURIComponent(filter)}`);
          if (!active) return; setRows(data.data); setTotal(Number(data.count));
          if (recordId) { setDetail(data.data[0]); setDraft(data.data[0]); }
          if (section === 'projects') { const data = await api('categories'); if (active) setCategories(data); }
        }
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoaded(true); }
    })();
    return () => { active = false; };
  }, [section,recordId,page,refresh,search,filter]);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) }); window.location.assign('/dashboard'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = {};
      for (const [key,,kind] of fields[section]) {
        const value = draft[key];
        data[key] = ['lines','uploads'].includes(kind) ? textValue(value).split(/\r?\n/).map(s => s.trim()).filter(Boolean) : kind === 'checkbox' ? Boolean(value) : kind === 'number' ? Number(value || 0) : value || null;
      }
      const id = draft.id;
      await api(section + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      setDraft(null); setNotice('Saved successfully.'); setRefresh(n => n+1);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete record #${row.id}? This removes it from the database. Media files are retained.`)) return;
    setBusy(true); setError('');
    try { await api(`${section}/${row.id}`, { method: 'DELETE' }); setRefresh(n => n+1); setNotice('Record deleted.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function upload(event, key, multiple) {
    const files = Array.from(event.target.files || []); if (!files.length) return;
    setBusy(true); setError('');
    try {
      const urls = [];
      for (const file of files) {
        if (file.size > 4000000) throw new Error('Choose an image under 4 MB.');
        const response = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
        const data = await response.json(); if (!response.ok) throw new Error(data.message); urls.push(data.url);
      }
      setDraft(d => ({ ...d, [key]: multiple ? [textValue(d[key]),...urls].filter(Boolean).join('\n') : urls[0] }));
      setNotice('Uploaded. Save the record to attach these images.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (section === 'login') return <main className="admin login"><form onSubmit={login}><p className="eyebrow">SHIV PATEL</p><h1>Dashboard sign in</h1><label>Email<input type="email" autoComplete="username" required value={credentials.email} onChange={e => setCredentials({ ...credentials,email: e.target.value })} /></label><label>Password<input type="password" autoComplete="current-password" required value={credentials.password} onChange={e => setCredentials({ ...credentials,password: e.target.value })} /></label>{error && <p role="alert">{error}</p>}<button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><p><a href="/">Back to website</a></p></form></main>;
  if (!sections.includes(section)) return <main className="admin"><h1>Page not found</h1><a href="/dashboard">Dashboard</a></main>;
  const newRecord = () => { setDetail(null); setDraft({ order: 0, is_read: false, lead_status: 'new', is_featured: false, is_current: false, category: categories[0]?.category || '' }); setError(''); };
  return <div className="admin"><aside><a className="brand" href="/dashboard">SP / Dashboard</a><nav aria-label="Dashboard">{sections.map(s => <a key={s} href={s === 'overview' ? '/dashboard' : `/dashboard/${s}`} aria-current={s === section ? 'page' : undefined}>{s === 'types' ? 'Project types' : s}</a>)}</nav><a href="/">View website ↗</a><button onClick={async () => { try { await api('logout',{ method: 'POST' }); window.location.assign('/dashboard/login'); } catch(e) { setError(e.message); } }}>Sign out</button></aside>
    <main><header><div><p className="eyebrow">WORKSPACE</p><h1>{section === 'types' ? 'Project types' : section}</h1></div>{['projects','experiences','types'].includes(section) && <button disabled={!loaded || readOnly || busy} onClick={newRecord}>Add {section === 'types' ? 'type' : section === 'projects' ? 'project' : 'experience'}</button>}</header>
      {readOnly && <p className="banner">Migration review mode — data changes and uploads are disabled.</p>}
      {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="notice">{notice}</p>}
      {!loaded && <p>Loading…</p>}
      {section === 'overview' && stats && <><div className="metrics">{Object.entries(stats.counts).map(([k,v]) => <article key={k}><strong>{v}</strong><span>{k.replaceAll('_',' ')}</span></article>)}</div><h2>Lead pipeline</h2><div className="metrics">{stats.pipeline.map(row => <article key={row.lead_status}><strong>{row.total}</strong><span>{row.lead_status}</span></article>)}</div><h2>Last 7 days (UTC)</h2><ul>{stats.activity.map(row => <li key={row.day}>{row.day}: {row.total} submissions</li>)}</ul></>}
      {section !== 'overview' && <><div className="tools"><label>Search<input type="search" value={search} onChange={e => { setPage(1); setSearch(e.target.value); }} placeholder="Search records" /></label>{['contacts','appointments'].includes(section) && <label>Filter<select value={filter} onChange={e => {setFilter(e.target.value);setPage(1);}}><option value="">All</option>{(section === 'contacts' ? ['unread'] : ['pending','confirmed','completed','cancelled']).map(value => <option key={value}>{value}</option>)}</select></label>}</div><p>{total} records</p><div className="table"><table><thead><tr><th>ID</th><th>Name / title</th><th>Status / category</th><th>Actions</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.id}</td><td><strong>{row.title || row.name || row.client_name}</strong><small>{row.email || row.client_email || row.company}</small></td><td>{row.status || row.category || row.lead_status || (row.is_current ? 'Current' : '')}</td><td><button onClick={() => { setDetail(row); setDraft(row); setError(''); }}>Open</button>{section !== 'appointments' && <button className="danger" disabled={readOnly || busy} onClick={() => remove(row)}>Delete</button>}</td></tr>)}</tbody></table></div>{loaded && !rows.length && !error && <p>No matching records.</p>}<div className="tools"><button disabled={page <= 1 || busy} onClick={() => setPage(n => n-1)}>Previous</button><span>Page {page}</span><button disabled={page*20 >= total || busy} onClick={() => setPage(n => n+1)}>Next</button></div></>}
      {draft && <section className="editor"><header><h2>{draft.id ? `Record #${draft.id}` : 'New record'}</h2><button onClick={() => {setDraft(null);setDetail(null);}}>Close</button></header>
        {detail && ['contacts','appointments'].includes(section) && <dl>{Object.entries(detail).map(([k,v]) => <div key={k}><dt>{k.replaceAll('_',' ')}</dt><dd>{v && typeof v === 'object' ? <pre>{JSON.stringify(v,null,2)}</pre> : String(v ?? '—')}</dd></div>)}</dl>}
        <form onSubmit={save}><fieldset disabled={readOnly || busy}>{fields[section].map(([key,label,kind]) => <label key={key}>{label}{kind === 'checkbox' ? <input type="checkbox" checked={Boolean(draft[key])} onChange={e => setDraft({...draft,[key]:e.target.checked})} /> : ['status','lead','category'].includes(kind) ? <select value={draft[key] || ''} onChange={e => setDraft({...draft,[key]:e.target.value})}><option value="">Choose…</option>{(kind === 'status' ? ['pending','confirmed','completed','cancelled'] : kind === 'lead' ? ['new','contacted','qualified','closed'] : [...new Set([...categories.map(c => c.category),draft.category].filter(Boolean))]).map(v => <option key={v} value={v}>{kind === 'category' ? categories.find(c => c.category === v)?.name || v : v}</option>)}</select> : ['textarea','lines','uploads'].includes(kind) ? <textarea rows={4} value={textValue(draft[key])} onChange={e => setDraft({...draft,[key]:e.target.value})} /> : <input type={kind === 'upload' ? 'text' : kind || 'text'} value={draft[key] ?? ''} onChange={e => setDraft({...draft,[key]:e.target.value})} />}{['upload','uploads'].includes(kind) && <input aria-label={`Upload ${label}`} type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple={kind === 'uploads'} onChange={e => upload(e,key,kind === 'uploads')} />}</label>)}<button type="submit">{busy ? 'Working…' : 'Save changes'}</button></fieldset></form></section>}
    </main></div>;
}
