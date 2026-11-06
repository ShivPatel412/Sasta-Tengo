import { put } from '@vercel/blob';
import { createHash } from 'node:crypto';
import { assertWritable, body, handle, HttpError, query } from '../../../../lib/db.mjs';
import { automationAuth, ingestAutomation } from '../../../../lib/project-automation.mjs';
import { imageExtension } from '../../../../lib/media.mjs';
import {isLocalMaster} from '../../../../lib/master-dashboard.mjs';
import {saveLocalProjectImage} from '../../../../lib/project-media.mjs';
export const runtime='nodejs';
export async function GET(request) {
  return handle(async()=>{
    automationAuth(request);
    const rows=await query("SELECT repository,revision,status,JSON_UNQUOTE(JSON_EXTRACT(provenance,'$.cover_status')) AS cover_status FROM project_automation_drafts");
    return Response.json({data:rows},{headers:{'Cache-Control':'no-store'}});
  });
}
export async function POST(request) {
  return handle(async()=>{
    automationAuth(request);assertWritable();
    if(request.headers.get('content-type')==='application/octet-stream') {
      if(!process.env.BLOB_READ_WRITE_TOKEN&&!isLocalMaster())throw new HttpError(503,'Media storage is not configured.');
      const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Image required.');
      const chunks=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4000000){await reader.cancel();throw new HttpError(413,'Images must be under 4 MB.');}chunks.push(value);}
      const bytes=Buffer.concat(chunks),extension=imageExtension(bytes);
      if(!extension)throw new HttpError(422,'Use a real JPEG, PNG, GIF or WebP image.');
      if(isLocalMaster())return Response.json({url:await saveLocalProjectImage(bytes)});
      const blob=await put(`projects/automation/${createHash('sha256').update(bytes).digest('hex')}.${extension}`,bytes,{access:'public',contentType:`image/${extension==='jpg'?'jpeg':extension}`,addRandomSuffix:false,allowOverwrite:true});
      return Response.json({url:blob.url});
    }
    return Response.json(await ingestAutomation(await body(request)));
  });
}
