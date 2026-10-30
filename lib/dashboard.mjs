export const sections = {
  overview: { label:'Overview', description:'Your inquiries, work and next steps, in one place.' },
  contacts: { label:'Contact inbox', description:'Every message sent through your website contact form.' },
  appointments: { label:'Service inquiries', description:'Project applications and booked calls, with every submitted detail.' },
  projects: { label:'Projects', description:'Manage the work, images and links shown on your portfolio.' },
  experiences: { label:'Experience', description:'Keep your roles, achievements and professional story up to date.' },
  types: { label:'Project types', description:'Organize your portfolio into clear categories.' }
};
export const fields = {
  contacts: [['admin_notes','Internal notes','textarea'],['is_read','Mark as read','checkbox'],['lead_status','Lead stage','lead']],
  appointments: [['status','Request status','status'],['admin_notes','Internal notes','textarea'],['lead_status','Lead stage','lead']],
  projects: [['title','Project title'],['description','Description','textarea'],['category','Project type','category'],['image','Image'],['poster','Cover image','upload'],['gallery','Gallery image URLs','uploads'],['technologies','Technologies','lines'],['github_url','GitHub URL','url'],['live_url','Live website URL','url'],['is_featured','Featured project','checkbox'],['order','Display order','number']],
  experiences: [['title','Job title'],['company','Company'],['logo','Company logo','upload'],['website','Company website','url'],['location','Location'],['start_date','Start date','date'],['end_date','End date','date'],['is_current','I currently work here','checkbox'],['description','Role description','textarea'],['summary','Short summary','textarea'],['highlights','Achievements','lines'],['technologies','Technologies','lines'],['order','Display order','number']],
  types: [['name','Type name']]
};
export const textValue = value => Array.isArray(value) ? value.join('\n') : value ?? '';
export const listValue = value => textValue(value).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
export function draftPayload(section,draft) {
  const data={};
  for(const [key,,kind] of fields[section]) {
    const value=draft[key];
    data[key]=['lines','uploads'].includes(kind)?listValue(value):kind==='checkbox'?Boolean(value):kind==='number'?Number(value||0):value||null;
  }
  if(section==='experiences'&&data.is_current)data.end_date=null;
  return data;
}
export function timestamp(value) {
  if(!value)return null;
  const normalized=/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)?value.replace(' ','T')+'Z':value;
  const date=new Date(normalized);return Number.isNaN(date.getTime())?null:date;
}
export function dateLabel(value,withTime=false) {
  const date=timestamp(value);
  return date?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',...(withTime?{timeStyle:'short'}:{timeZone:'UTC'})}).format(date):'Not provided';
}
export function activitySeries(rows=[],today=new Date()) {
  const end=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()));
  return Array.from({length:7},(_,i)=>{
    const date=new Date(end);date.setUTCDate(end.getUTCDate()-6+i);const day=date.toISOString().slice(0,10);
    return {day,total:Number(rows.find(row=>String(row.day).slice(0,10)===day)?.total||0)};
  });
}
export function recentInquiries(contacts=[],requests=[]) {
  return [...contacts.map(row=>({...row,section:'contacts'})),...requests.map(row=>({...row,section:'appointments'}))]
    .sort((a,b)=>(timestamp(b.created_at)?.getTime()||0)-(timestamp(a.created_at)?.getTime()||0)).slice(0,6);
}
export function imageSource(value) {
  if(typeof value!=='string'||!value||value.includes('..')||/[\\\x00-\x1f]/.test(value))return '';
  if(/^https?:\/\//i.test(value))return value;
  if(value.startsWith('//')||/^[a-z]+:/i.test(value))return '';
  return value.startsWith('/')?value:'/storage/'+value;
}
export function safeLink(value) {return typeof value==='string'&&/^https?:\/\//i.test(value)?value:null;}
