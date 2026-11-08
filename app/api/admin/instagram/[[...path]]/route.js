import {z} from 'zod';
import {createHmac} from 'node:crypto';
import {admin,sameOrigin} from '../../../../../lib/auth.mjs';
import {body,handle,HttpError,assertWritable,query,transaction} from '../../../../../lib/db.mjs';
import {isLocalMaster} from '../../../../../lib/master-dashboard.mjs';
import {idSchema,settingsSchema,categories,similar,defaultWeights} from '../../../../../lib/instagram-core.mjs';
import {decode,photoView,ownedPhoto,ownedDraft,savePhoto,saveDraft,approveDraft,settings,checkPhotos} from '../../../../../lib/instagram-store.mjs';
import {uploadLimit,boundedBytes,photoBytes} from '../../../../../lib/instagram-media.mjs';
import {createJob,retryJob,cancelJob,jobView,processingReady} from '../../../../../lib/instagram-jobs.mjs';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export const maxDuration=60;
const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
async function limit(owner,kind,max){
 const key=process.env.RATE_LIMIT_SECRET;if(!key)throw new HttpError(503,'Rate limiting is not configured.');
 const bucket=createHmac('sha256',key).update(`studio:${kind}:${owner}:${Math.floor(Date.now()/600000)}`).digest('hex');
 await query('INSERT INTO next_rate_limits (bucket,hits,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 20 MINUTE)) ON DUPLICATE KEY UPDATE hits=hits+1',[bucket]);
 const [r]=await query('SELECT hits FROM next_rate_limits WHERE bucket=?',[bucket]);if(Number(r.hits)>max)throw new HttpError(429,'Too many Studio requests. Retry in ten minutes.');
}
export async function GET(request,context){return handle(async()=>{
 const owner=await admin(),{path=[]}=await context.params;
 if(path[0]==='media'&&path.length===2){const row=await ownedPhoto(owner.id,path[1]);return new Response(await photoBytes(row.storage_key),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':new URL(request.url).searchParams.has('download')?'attachment; filename="studio-photo.jpg"':'inline'}});}
 if(path.length)throw new HttpError(404,'Not found.');
 const page=z.coerce.number().int().min(1).max(1000).parse(new URL(request.url).searchParams.get('page')||1);
 const photos=await query(`SELECT * FROM studio_photos WHERE owner_id=? ORDER BY created_at DESC,id LIMIT 200 OFFSET ${(page-1)*200}`,[owner.id]);
 const albums=await query('SELECT a.id,a.name,p.photo_id FROM studio_albums a LEFT JOIN studio_album_photos p ON p.album_id=a.id WHERE a.owner_id=? ORDER BY a.created_at DESC',[owner.id]);
 const drafts=await query('SELECT * FROM studio_drafts WHERE owner_id=? ORDER BY updated_at DESC LIMIT 100',[owner.id]);
 const jobs=await query('SELECT * FROM studio_jobs WHERE owner_id=? ORDER BY created_at DESC LIMIT 50',[owner.id]);
 const history=await query('SELECT id,draft_id,instagram_media_id,photo_ids,published_at FROM studio_post_history WHERE owner_id=? ORDER BY published_at DESC LIMIT 100',[owner.id]);
 const [{total}]=await query('SELECT COUNT(*) AS total FROM studio_photos WHERE owner_id=?',[owner.id]);
 const grouped=Object.values(albums.reduce((all,r)=>{all[r.id]??={id:r.id,name:r.name,photo_ids:[]};if(r.photo_id)all[r.id].photo_ids.push(r.photo_id);return all;},{}));
 const photoUsage=photos.map(row=>{const used=drafts.find(d=>decode(d.payload).selected.includes(row.id));return {...photoView(row),last_used_at:used?.updated_at||null,previously_posted:history.some(h=>decode(h.photo_ids).includes(row.id))};});
 return json({photos:photoUsage,photos_total:Number(total),page,albums:grouped,drafts:drafts.map(r=>({...r,payload:decode(r.payload)})),jobs:jobs.map(jobView),history,settings:await settings(owner.id),categories,
  providers:{storage:isLocalMaster()?'private local storage':process.env.STUDIO_BLOB_READ_WRITE_TOKEN?'private Blob storage':'not configured',processing:!!processingReady(),
   drive:!!process.env.NEXT_PUBLIC_STUDIO_GOOGLE_CLIENT_ID&&!!process.env.NEXT_PUBLIC_STUDIO_GOOGLE_PICKER_KEY&&!!process.env.NEXT_PUBLIC_STUDIO_GOOGLE_APP_ID,cloud:false},limits:{batch:30,carousel:10,upload_bytes:uploadLimit()},publishing_enabled:false});
});}
export async function POST(request,context){return handle(async()=>{
 sameOrigin(request);const owner=await admin();assertWritable();const {path=[]}=await context.params,route=path.join('/');
 await limit(owner.id,route==='photos'||route==='import-drive'?'upload':'edit',route==='photos'||route==='import-drive'?90:120);
 if(route==='photos'){
  const source=z.enum(['local','phone']).parse(new URL(request.url).searchParams.get('source')||'local');
  let name='Photo';try{name=decodeURIComponent(request.headers.get('x-photo-name')||'Photo').slice(0,200);}catch{throw new HttpError(422,'Invalid photo name.');}
  return json(await savePhoto(owner.id,await boundedBytes(request.body),{name,source}));
 }
 const input=await body(request,120000);
 if(route==='import-drive'){
  const {id}=z.object({id:z.string().regex(/^[\w-]{1,200}$/)}).strict().parse(input);
  const token=request.headers.get('x-google-access-token');if(!token||token.length>4096)throw new HttpError(422,'Connect Google Drive again.');
  const headers={Authorization:'Bearer '+token};
  const meta=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,size`,{headers,redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!meta.ok)throw new HttpError(422,'Google Drive permission expired or the selected photo is unavailable.');
  const file=await meta.json();if(!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.mimeType)||Number(file.size)>uploadLimit())throw new HttpError(422,'Select a supported photo within the upload limit.');
  const media=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`,{headers,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!media.ok)throw new HttpError(422,'Google Drive could not download this photo.');
  return json(await savePhoto(owner.id,await boundedBytes(media.body),{name:file.name,source:'drive'}));
 }
 if(route==='albums'){
  const {name}=z.object({name:z.string().trim().min(1).max(100)}).strict().parse(input),id=randomUUID();
  await query('INSERT INTO studio_albums (id,owner_id,name) VALUES (?,?,?)',[id,owner.id,name]);return json({id,name,photo_ids:[]});
 }
 if(path[0]==='albums'&&path.length===2){
  const id=idSchema.parse(path[1]),{photo_ids}=z.object({photo_ids:z.array(idSchema).max(500)}).strict().parse(input);
  await transaction(async c=>{const [album]=await query('SELECT id FROM studio_albums WHERE id=? AND owner_id=? FOR UPDATE',[id,owner.id],c);if(!album)throw new HttpError(404,'Album not found.');await checkPhotos(owner.id,photo_ids,c);await query('DELETE FROM studio_album_photos WHERE album_id=?',[id],c);for(const photo of new Set(photo_ids))await query('INSERT INTO studio_album_photos (album_id,photo_id) VALUES (?,?)',[id,photo],c);});return json({ok:true});
 }
 if(path[0]==='photos'&&path.length===2){
  const patch=z.object({favorite:z.boolean().optional(),tags:z.array(z.string().trim().min(1).max(50)).max(20).optional()}).strict().parse(input);
  await transaction(async c=>{const row=await ownedPhoto(owner.id,path[1],c,true);await query('UPDATE studio_photos SET metadata=? WHERE id=? AND owner_id=?',[JSON.stringify({...decode(row.metadata),...patch}),row.id,owner.id],c);});return json({ok:true});
 }
 if(route==='drafts')return json(await saveDraft(owner.id,null,z.object({project:z.unknown()}).strict().parse(input).project));
 if(path[0]==='drafts'&&path.length===2){const {project,revision}=z.object({project:z.unknown(),revision:z.number().int().positive()}).strict().parse(input);return json(await saveDraft(owner.id,path[1],project,revision));}
 if(path[0]==='drafts'&&path[2]==='approve'&&path.length===3){const {revision}=z.object({revision:z.number().int().positive()}).strict().parse(input);return json(await approveDraft(owner.id,path[1],revision));}
 if(route==='jobs'){await limit(owner.id,'analysis',10);const {draft_id}=z.object({draft_id:idSchema}).strict().parse(input);return json(jobView(await createJob(owner.id,draft_id)));}
 if(path[0]==='jobs'&&path.length===3&&['retry','cancel'].includes(path[2])){z.object({}).strict().parse(input);await limit(owner.id,'analysis',10);return json(jobView(await (path[2]==='retry'?retryJob:cancelJob)(owner.id,path[1])));}
 if(route==='settings'){const value=settingsSchema.parse(input);await query('INSERT INTO studio_settings (owner_id,payload) VALUES (?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)',[owner.id,JSON.stringify(value)]);return json(value);}
 throw new HttpError(404,'Not found.');
});}
