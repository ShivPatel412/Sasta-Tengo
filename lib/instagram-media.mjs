import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {put,get,del} from '@vercel/blob';
import {HttpError} from './db.mjs';
import {isLocalMaster} from './master-dashboard.mjs';
const directory=()=>resolve('.local/instagram-media');
export const uploadLimit=()=>Math.min(4_000_000,Math.max(100000,Number(process.env.STUDIO_UPLOAD_BYTES)||4_000_000));
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
 if(!process.env.STUDIO_BLOB_READ_WRITE_TOKEN)throw new HttpError(503,'Private Studio storage is not configured.');
 const result=await put(`instagram/${owner}/${id}.jpg`,bytes,{access:'private',contentType:'image/jpeg',addRandomSuffix:false,token:process.env.STUDIO_BLOB_READ_WRITE_TOKEN});return result.url;
}
export async function photoBytes(key){
 if(/^\d+-[a-f0-9-]{36}\.jpg$/.test(key)){
  if(!isLocalMaster())throw new HttpError(503,'Local photo storage is unavailable on this server.');
  try{return await readFile(resolve(directory(),key));}catch{throw new HttpError(404,'Photo is unavailable.');}
 }
 if(!process.env.STUDIO_BLOB_READ_WRITE_TOKEN)throw new HttpError(503,'Private Studio storage is not configured.');
 const result=await get(key,{access:'private',token:process.env.STUDIO_BLOB_READ_WRITE_TOKEN});
 if(!result||result.statusCode!==200)throw new HttpError(404,'Photo is unavailable.');
 return boundedBytes(result.stream,4_000_000);
}
export async function removePhotoBytes(key){
 if(/^\d+-[a-f0-9-]{36}\.jpg$/.test(key)){if(!isLocalMaster())throw new HttpError(503,'Local storage unavailable.');await unlink(resolve(directory(),key)).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 else await del(key,{token:process.env.STUDIO_BLOB_READ_WRITE_TOKEN});
}
export async function analysisImage(key){return sharp(await photoBytes(key)).resize({width:768,height:768,fit:'inside',withoutEnlargement:true}).jpeg({quality:65}).toBuffer();}
