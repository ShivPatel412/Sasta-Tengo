import sharp from 'sharp';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {put,get,del,list,issueSignedToken,presignUrl} from '@vercel/blob';
import {HttpError} from './db.mjs';
import {isLocalMaster} from './master-dashboard.mjs';
const directory=()=>resolve('.local/instagram-media');
export const uploadLimit=()=>Math.min(50_000_000,Math.max(100000,Number(process.env.STUDIO_UPLOAD_BYTES)||50_000_000));
export function stagedPhotoPath(owner,key){
 if(!/^\d+$/.test(String(owner)))throw new HttpError(422,'Invalid upload owner.');
 const prefix=`instagram-staging/${owner}/`;
 if(typeof key!=='string'||!key.startsWith(prefix)||!/^\d{13}-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(key.slice(prefix.length)))throw new HttpError(422,'Invalid upload path.');
 return key;
}
export async function photoUploadURL(owner){
 const pathname=stagedPhotoPath(owner,`instagram-staging/${owner}/${Date.now()}-${randomUUID()}`);
 const constraints={pathname,operations:['put'],validUntil:Date.now()+15*60000,maximumSizeInBytes:uploadLimit(),allowedContentTypes:['application/octet-stream']};
 const token=await issueSignedToken({...studioStorageOptions(),...constraints});
 const {presignedUrl}=await presignUrl(token,{...constraints,operation:'put',access:'private',allowOverwrite:false,addRandomSuffix:false});
 return {pathname,url:presignedUrl};
}
export async function stagedPhotoBytes(owner,key){
 const result=await get(stagedPhotoPath(owner,key),{access:'private',useCache:false,...studioStorageOptions()});
 if(!result||result.statusCode!==200)throw new HttpError(404,'Upload is unavailable. Retry this photo.');
 return boundedBytes(result.stream);
}
export async function discardStagedPhoto(owner,key){await del(stagedPhotoPath(owner,key),studioStorageOptions());}
export async function cleanupStagedPhotos(apply=false){
 if(isLocalMaster()||!studioStorageReady())return 0;
 let cursor,eligible=0;
 do{
  const page=await list({prefix:'instagram-staging/',cursor,...studioStorageOptions()});
  for(const blob of page.blobs){
   const owner=blob.pathname.split('/')[1];stagedPhotoPath(owner,blob.pathname);
   if(Date.now()-new Date(blob.uploadedAt).getTime()<86400000)continue;
   eligible++;if(apply)await discardStagedPhoto(owner,blob.pathname);
  }
  cursor=page.hasMore?page.cursor:undefined;
 }while(cursor);
 return eligible;
}
export function studioStorageReady(env=process.env){return !!env.STUDIO_BLOB_READ_WRITE_TOKEN||/^store_[a-zA-Z0-9]+$/.test(env.STUDIO_BLOB_STORE_ID||'');}
export function studioStorageOptions(env=process.env){
 if(!studioStorageReady(env))throw new HttpError(503,'Private Studio storage is not configured.');
 // Vercel supplies runtime OIDC through request context; the Blob SDK resolves it.
 return /^store_[a-zA-Z0-9]+$/.test(env.STUDIO_BLOB_STORE_ID||'')?{storeId:env.STUDIO_BLOB_STORE_ID}:{token:env.STUDIO_BLOB_READ_WRITE_TOKEN};
}
export async function boundedBytes(stream,max=uploadLimit()){
 if(!stream)throw new HttpError(400,'Image required.');const reader=stream.getReader(),chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HttpError(413,`Use an image under ${Math.floor(max/1000000)} MB.`);}chunks.push(value);}
 return Buffer.concat(chunks);
}
export async function normalizePhoto(bytes){
 if(!bytes.length||bytes.length>uploadLimit())throw new HttpError(413,'Photo exceeds the upload limit.');
 try{
  const image=sharp(bytes,{limitInputPixels:40_000_000,failOn:'warning'}),meta=await image.metadata();
  if(!['jpeg','png','webp','heif'].includes(meta.format)||meta.pages>1||Math.min(meta.width||0,meta.height||0)<320)throw Error('Unsupported image');
  const normalized=await image.rotate().flatten({background:'#fff'}).resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:86}).toBuffer({resolveWithObject:true});
  if(normalized.data.length>4_000_000)throw new HttpError(413,'The decoded photo is too large. Export a smaller JPEG and retry.');
  const pixels=await sharp(normalized.data).resize(9,8,{fit:'fill'}).greyscale().raw().toBuffer();let hash=0n;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++)hash=(hash<<1n)|BigInt(pixels[y*9+x]>pixels[y*9+x+1]);
  return {bytes:normalized.data,sha256:createHash('sha256').update(bytes).digest('hex'),dhash:hash.toString(16).padStart(16,'0'),width:normalized.info.width,height:normalized.info.height,size:normalized.data.length};
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(422,'Use a valid, single JPEG, PNG or WebP photo, at least 320 pixels on each side and under 40 megapixels. Export HEIC as JPEG if this server cannot decode it.');}
}
export async function storePhoto(owner,id,bytes){
 if(isLocalMaster()){
  const key=`${owner}-${id}.jpg`;await mkdir(directory(),{recursive:true});await writeFile(resolve(directory(),key),bytes,{flag:'wx'});return key;
 }
 const result=await put(`instagram/${owner}/${id}.jpg`,bytes,{access:'private',contentType:'image/jpeg',addRandomSuffix:false,...studioStorageOptions()});return result.url;
}
export async function photoBytes(key){
 if(/^\d+-[a-f0-9-]{36}\.jpg$/.test(key)){
  if(!isLocalMaster())throw new HttpError(503,'Local photo storage is unavailable on this server.');
  try{return await readFile(resolve(directory(),key));}catch{throw new HttpError(404,'Photo is unavailable.');}
 }
 const result=await get(key,{access:'private',...studioStorageOptions()});
 if(!result||result.statusCode!==200)throw new HttpError(404,'Photo is unavailable.');
 return boundedBytes(result.stream,4_000_000);
}
export async function removePhotoBytes(key){
 if(/^\d+-[a-f0-9-]{36}\.jpg$/.test(key)){if(!isLocalMaster())throw new HttpError(503,'Local storage unavailable.');await unlink(resolve(directory(),key)).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 else await del(key,studioStorageOptions());
}
export async function analysisImage(key){return sharp(await photoBytes(key)).resize({width:768,height:768,fit:'inside',withoutEnlargement:true}).jpeg({quality:65}).toBuffer();}
