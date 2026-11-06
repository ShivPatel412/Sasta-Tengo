import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {admin} from '../../../lib/auth.mjs';
import {handle,HttpError} from '../../../lib/db.mjs';
import {requireMaster} from '../../../lib/control-room.mjs';
import {isLocalMaster} from '../../../lib/master-dashboard.mjs';
export const runtime='nodejs';
export async function GET(request){
  return handle(async()=>{
    requireMaster();try{await admin();}catch(error){if(error instanceof HttpError&&error.status===401)return Response.redirect(new URL('/dashboard/login',request.url),303);throw error;}
    if(!isLocalMaster())return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Instagram photos</title></head><body><main><h1>Instagram photos</h1><p>The existing photo tool runs on your PC. Its integration into this login is still pending.</p><p><a href="https://dashboard.shivpatel.in/photos">Open existing photo tool</a></p><p><a href="/dashboard">Return to master dashboard</a></p></main></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    const html=(await readFile(resolve('control-room/static/photos.html'),'utf8'))
      .replace('href="/photos.css"','href="/master-assets/photos.css"').replace('src="/photos.js"','src="/master-assets/photos.js"')
      .replace('<body>','<body><p class="note">Local master dashboard · Photo generation and publishing are disabled in this preview.</p>');
    return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  });
}
