import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { admin } from '../../../lib/auth.mjs';
import { handle,HttpError } from '../../../lib/db.mjs';
import { isMasterDashboard } from '../../../lib/master-dashboard.mjs';
export const runtime='nodejs';
export async function GET(request){
  if(!isMasterDashboard())return Response.redirect('https://dashboard.shivpatel.in/3d',307);
  return handle(async()=>{
    try{await admin();}catch(error){if(error instanceof HttpError&&error.status===401)return Response.redirect(new URL('/dashboard/login',request.url),303);throw error;}
    return new Response(await readFile(resolve('control-room/static/hq.html')),{headers:{
      'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"
    }});
  });
}
