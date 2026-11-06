'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tab=['drafts','projects','contacts','appointments'].includes(new URLSearchParams(location.search).get('tab'))?new URLSearchParams(location.search).get('tab'):'drafts',page=1,rows=[],categories=[],readOnly=true,busy=false,dirty=false;
const safeURL=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j.error||j.message||'Request failed.');return j;}
function media(url,label){const safe=safeURL(url);return safe?`<figure><img src="${esc(safe)}" alt="${esc(label)}" loading="lazy"><figcaption>${esc(label)}</figcaption></figure>`:'';}
function render(){
  $('#records').innerHTML=rows.length?rows.map(row=>{
    if(tab!=='drafts')return `<article class="panel project-record"><h2>${esc(row.title||row.name||row.client_name)}</h2><p>${esc(row.email||row.client_email||'')}</p><pre>${esc(row.description||row.message||row.notes||'')}</pre><p>${esc(row.status||row.lead_status||'')}</p><a href="https://www.shivpatel.in/dashboard/${tab}/${encodeURIComponent(row.id)}">Open existing editor ↗</a></article>`;
    const p=row.payload,proof=row.provenance,pending=row.status==='pending',repo=safeURL(p.github_url),live=safeURL(p.live_url);
    return `<article class="panel project-record" data-id="${esc(row.id)}"><p class="eyebrow">${esc(row.status)} ${row.project_id?'· UPDATE TO LIVE PROJECT':'· NEW PROJECT'}</p><h2>${esc(p.title)}</h2><p class="revision">${esc(row.repository)} · revision ${esc(row.revision.slice(0,12))}</p><p>${repo?`<a href="${esc(repo)}" target="_blank" rel="noopener">GitHub ↗</a>`:''} ${live?` · <a href="${esc(live)}" target="_blank" rel="noopener">Live website ↗</a>`:''}</p><div class="media-grid">${media(p.poster,'AI-designed cover · '+proof.image_model)}${(p.gallery||[]).map(url=>media(url,proof.captured_at?'Real browser capture · '+proof.captured_at:'Gallery image')).join('')}</div>${proof.warnings.map(w=>`<p class="warning">${esc(w)}</p>`).join('')}${pending?`<label>Project title<input name="title" maxlength="255" value="${esc(p.title)}"></label><label>Description<textarea name="description" maxlength="10000">${esc(p.description)}</textarea></label><label>Project type<select name="category">${categories.map(c=>`<option value="${esc(c.category)}" ${c.category===p.category?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>Technologies (one per line)<textarea name="technologies">${esc(p.technologies.join('\n'))}</textarea></label><div class="actions"><button class="secondary" data-action="save" ${readOnly?'disabled':''}>Save draft</button><button class="primary" data-action="publish" ${readOnly?'disabled':''}>Approve & publish${row.project_id?' update':''}</button><button class="secondary" data-action="reject" ${readOnly?'disabled':''}>Reject</button></div>`:`<p>${row.status==='published'?'Published to your existing portfolio.':'Rejected. A changed repository can create a new review.'}</p>`}</article>`;
  }).join(''):'<div class="panel empty">'+(tab==='drafts'?'No project drafts yet. Check the worker configuration, then scan GitHub.':'No records on this page.')+'</div>';
  $('#pagination').innerHTML=tab==='drafts'?'':`<button data-page="${page-1}" ${page===1?'disabled':''}>Previous</button><span>Page ${page}</span><button data-page="${page+1}" ${rows.length<20?'disabled':''}>Next</button>`;
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));
}
async function load(){
  if(busy)return;busy=true;$('#reload').disabled=true;$('#message').textContent='';
  try{
    const [session,types,result]=await Promise.all([api('/api/website/session'),api('/api/website/categories'),api(tab==='drafts'?'/api/project-drafts':'/api/website/'+tab+'?page='+page)]);
    readOnly=session.readOnly;categories=types;rows=result.data;dirty=false;render();
    if(readOnly)$('#message').textContent='Portfolio writes are disabled in review mode.';
  }catch(e){$('#message').textContent=e.message;}finally{busy=false;$('#reload').disabled=false;}
  try{const w=await api('/api/project-worker');$('#worker').textContent=(w.running?'Processing GitHub…':w.message||'Ready')+(w.finished_at?' · Last scan '+w.finished_at:'');$('#run').disabled=w.running||readOnly||!w.configured;}catch(e){$('#worker').textContent=e.message;$('#run').disabled=true;}
}
document.querySelector('.project-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;if(dirty&&!confirm('Discard unsaved draft edits?'))return;tab=b.dataset.tab;page=1;load();});
$('#pagination').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){page=Number(b.dataset.page);load();}});
$('#reload').onclick=()=>{if(!dirty||confirm('Discard unsaved draft edits?'))load();};
$('#run').onclick=async()=>{if(busy)return;$('#run').disabled=true;try{await api('/api/project-worker/run',{});$('#message').textContent='Scan queued. Refresh to see progress and new drafts.';}catch(e){$('#message').textContent=e.message;$('#run').disabled=false;}};
$('#records').addEventListener('input',()=>{dirty=true;});
$('#records').addEventListener('click',async e=>{
  const b=e.target.closest('[data-action]');if(!b||busy)return;
  const card=b.closest('[data-id]'),row=rows.find(r=>String(r.id)===card.dataset.id),action=b.dataset.action;
  if(action==='publish'&&!confirm('Publish these reviewed details and media to shivpatel.in?'))return;
  const project={...row.payload,title:card.querySelector('[name=title]').value,description:card.querySelector('[name=description]').value,category:card.querySelector('[name=category]').value,technologies:card.querySelector('[name=technologies]').value.split('\n').map(s=>s.trim()).filter(Boolean)};
  busy=true;card.querySelectorAll('button').forEach(x=>{x.disabled=true;});
  try{await api('/api/project-drafts/'+row.id,{revision:row.revision,action,project});dirty=false;busy=false;await load();$('#message').textContent=action==='publish'?'Published to your portfolio.':action==='reject'?'Draft rejected.':'Draft saved.';}catch(error){$('#message').textContent=error.message;card.querySelectorAll('button').forEach(x=>{x.disabled=readOnly;});}finally{busy=false;}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load();
