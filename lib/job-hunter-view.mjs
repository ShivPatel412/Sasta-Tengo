export const JOB_PAGE_SIZE = 6;
export const JOB_STATUSES = ['discovered','scored','draft_ready','approved','applied','interview','offer','rejected','archived'];
export function localDateInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export const jobLabel = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
export function jobScore(job) {
  const score = Array.isArray(job?.scores) ? job.scores[0] : job?.scores;
  return score && typeof score.score === 'number' && Number.isFinite(score.score) ? score : null;
}
export function jobUrl(value) {
  try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function jobsQuery({page=1,search='',source='',status='',match=''}) {
  const params = new URLSearchParams({page:String(page),limit:String(JOB_PAGE_SIZE)});
  if(search.trim()) params.set('search',search.trim());
  if(source && source !== 'all') params.set('source',source);
  if(status) params.set('status',status);
  if(match==='high') params.set('score_min','80');
  if(match==='moderate') { params.set('score_min','60'); params.set('score_max','79'); }
  if(match==='low') params.set('score_max','59');
  return `jobs?${params}`;
}
export function draftText(draft) {
  return `${jobLabel(draft.kind)} draft — review before use\n\n${Object.entries(draft.content || {}).filter(([key])=>key!=='review_required').map(([key,value])=>`${jobLabel(key)}\n${typeof value==='string'?value:JSON.stringify(value,null,2)}`).join('\n\n')}`;
}
export function jobActivity(job) {
  if(!job) return [];
  return [
    {id:'discovered',title:'Job discovered',at:job.created_at},
    {id:'applied',title:'Marked as applied',at:job.applied_at},
    ...(job.scores || []).map((s,i)=>({id:`score-${s.id || i}`,title:'Match analysis saved',at:s.updated_at||s.created_at})),
    ...(job.drafts || []).map(d=>({id:`draft-${d.id}`,title:`${jobLabel(d.kind)} draft created`,at:d.created_at})),
    ...(job.reminders || []).map(r=>({id:`reminder-${r.id}`,title:'Follow-up reminder saved',at:r.created_at}))
  ].filter(e=>e.at && Number.isFinite(Date.parse(e.at))).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
