import {randomUUID} from 'node:crypto';
import {query,transaction,HttpError} from './db.mjs';
import {draftSchema,similar,settingsSchema,defaultWeights,idSchema} from './instagram-core.mjs';
import {normalizePhoto,storePhoto,removePhotoBytes} from './instagram-media.mjs';
export const decode=v=>typeof v==='string'?JSON.parse(v):v;
export function photoView(row){return {id:row.id,...decode(row.metadata),sha256:row.sha256,dhash:row.dhash,created_at:row.created_at,url:'/api/admin/instagram/media/'+row.id};}
export async function ownedPhoto(owner,id,connection,lock=false){idSchema.parse(id);const [row]=await query('SELECT * FROM studio_photos WHERE id=? AND owner_id=?'+(lock?' FOR UPDATE':''),[id,owner],connection);if(!row)throw new HttpError(404,'Photo not found.');return row;}
export async function ownedDraft(owner,id,connection,lock=false){idSchema.parse(id);const [row]=await query('SELECT * FROM studio_drafts WHERE id=? AND owner_id=?'+(lock?' FOR UPDATE':''),[id,owner],connection);if(!row)throw new HttpError(404,'Draft not found.');return {...row,payload:decode(row.payload)};}
export async function checkPhotos(owner,ids,connection){for(const id of [...ids].sort())await ownedPhoto(owner,id,connection,!!connection);}
export async function settings(owner){const [row]=await query('SELECT payload FROM studio_settings WHERE owner_id=?',[owner]);return row?settingsSchema.parse(decode(row.payload)):{weights:defaultWeights,retention_days:30};}
export async function savePhoto(owner,bytes,{name='Photo',source='local'}={}){
 const image=await normalizePhoto(bytes);
 const [existing]=await query('SELECT * FROM studio_photos WHERE owner_id=? AND sha256=?',[owner,image.sha256]);
 if(existing)return {photo:photoView(existing),duplicate:true};
 const id=randomUUID(),storage=await storePhoto(owner,id,image.bytes);
 const metadata={name:name.slice(0,200),source,width:image.width,height:image.height,bytes:image.size,tags:[],favorite:false,description:''};
 try{await query('INSERT INTO studio_photos (id,owner_id,sha256,dhash,storage_key,metadata) VALUES (?,?,?,?,?,?)',[id,owner,image.sha256,image.dhash,storage,JSON.stringify(metadata)]);}
 catch(error){await removePhotoBytes(storage);if(error.code==='ER_DUP_ENTRY'){const [row]=await query('SELECT * FROM studio_photos WHERE owner_id=? AND sha256=?',[owner,image.sha256]);if(row)return {photo:photoView(row),duplicate:true};}throw error;}
 const others=await query('SELECT id,dhash FROM studio_photos WHERE owner_id=? AND id<>? ORDER BY created_at DESC LIMIT 1000',[owner,id]);
 return {photo:photoView({id,metadata,sha256:image.sha256,dhash:image.dhash,created_at:new Date().toISOString()}),duplicate:false,similar_to:others.filter(p=>similar(p.dhash,image.dhash)).map(p=>p.id)};
}
export async function saveDraft(owner,id,input,revision){
 const data=draftSchema.parse(input);
 return transaction(async c=>{
  const row=id?await ownedDraft(owner,id,c,true):null;
  await checkPhotos(owner,data.photo_ids,c);
  if(!id){id=randomUUID();await query('INSERT INTO studio_drafts (id,owner_id,payload) VALUES (?,?,?)',[id,owner,JSON.stringify(data)],c);}
  else{if(row.revision!==revision)throw new HttpError(409,'This draft changed. Reopen it before saving.');if(row.status==='published')throw new HttpError(409,'Published drafts cannot be edited.');await query("UPDATE studio_drafts SET payload=?,revision=revision+1,status='draft',updated_at=UTC_TIMESTAMP() WHERE id=?",[JSON.stringify(data),id],c);}
  return ownedDraft(owner,id,c);
 });
}
export async function approveDraft(owner,id,revision){
 return transaction(async c=>{
  const row=await ownedDraft(owner,id,c,true);
  if(row.revision!==revision)throw new HttpError(409,'This draft changed. Reopen it before approval.');
  if(!row.payload.selected.length||!row.payload.caption.trim())throw new HttpError(422,'Choose photos and a caption before approving.');
  if([row.payload.caption,row.payload.hashtags.join(' ')].filter(Boolean).join('\n\n').length>2200)throw new HttpError(422,'Keep the caption and hashtags together within 2200 characters.');
  if(row.status==='published')throw new HttpError(409,'Already published.');
  await query("UPDATE studio_drafts SET status='approved',updated_at=UTC_TIMESTAMP() WHERE id=?",[id],c);
  return {...row,status:'approved'};
 });
}
