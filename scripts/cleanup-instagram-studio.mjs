import {query,database,transaction} from '../lib/db.mjs';
import {decode} from '../lib/instagram-store.mjs';
import {removePhotoBytes} from '../lib/instagram-media.mjs';
// Only normalized Studio copies are eligible. Originals are never stored here.
const apply=process.argv.includes('--apply');let eligible=0;
try{
 const photos=await query('SELECT p.*,s.payload AS settings FROM studio_photos p LEFT JOIN studio_settings s ON s.owner_id=p.owner_id ORDER BY p.created_at LIMIT 1000');
 for(const photo of photos){
  const days=photo.settings?decode(photo.settings).retention_days:30;
  if(Date.now()-Date.parse(photo.created_at+'Z')<days*86400000)continue;
  await transaction(async c=>{
   const [locked]=await query('SELECT id FROM studio_photos WHERE id=? FOR UPDATE',[photo.id],c);if(!locked)return;
   const [album]=await query('SELECT photo_id FROM studio_album_photos WHERE photo_id=? LIMIT 1',[photo.id],c);
   const drafts=await query('SELECT payload FROM studio_drafts WHERE owner_id=?',[photo.owner_id],c);
   const jobs=await query("SELECT request FROM studio_jobs WHERE owner_id=? AND state IN ('pending','waiting_for_n8n','processing') AND deadline_ms>?",[photo.owner_id,Date.now()],c);
   const history=await query('SELECT photo_ids FROM studio_post_history WHERE owner_id=?',[photo.owner_id],c);
   if(album||drafts.some(r=>decode(r.payload).photo_ids.includes(photo.id))||jobs.some(r=>decode(r.request).photo_ids.includes(photo.id))||history.some(r=>decode(r.photo_ids).includes(photo.id))||decode(photo.metadata).favorite)return;
   eligible++;if(!apply)return;
   await removePhotoBytes(photo.storage_key);await query('DELETE FROM studio_photos WHERE id=?',[photo.id],c);
  });
 }
 console.log({eligible,removed:apply?eligible:0,dryRun:!apply});
}finally{await database().end();}
