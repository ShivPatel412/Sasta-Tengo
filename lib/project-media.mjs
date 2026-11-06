import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {HttpError} from './db.mjs';
import {imageExtension} from './media.mjs';

const directory=()=>resolve('.local/project-media');
export async function saveLocalProjectImage(bytes){
  const extension=imageExtension(bytes);
  if(!extension||bytes.length>4_000_000)throw new HttpError(422,'Use an image under 4 MB.');
  const name=createHash('sha256').update(bytes).digest('hex')+'.'+extension;
  await mkdir(directory(),{recursive:true});
  await writeFile(resolve(directory(),name),bytes,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
  return '/api/admin/project-media/'+name;
}
export async function localProjectImage(name){
  if(!/^[a-f0-9]{64}\.(jpg|png|gif|webp)$/.test(name))throw new HttpError(404,'Not found.');
  try{return {bytes:await readFile(resolve(directory(),name)),type:'image/'+(name.endsWith('.jpg')?'jpeg':name.split('.').at(-1))};}
  catch{throw new HttpError(404,'Image not found.');}
}
