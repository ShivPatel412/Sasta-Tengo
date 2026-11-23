import {after} from 'next/server.js';
import {handle} from '../../../lib/db.mjs';
import {deliver} from '../../../lib/mail.mjs';
import {submitRsvp} from '../../../lib/rsvp.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request){
  return handle(async()=>{
    const receipt=await submitRsvp(request);
    after(async()=>{
      try{await deliver();}
      catch{console.error('RSVP notification remains queued for retry.');}
    });
    return Response.json(receipt,{status:202,headers:{'Cache-Control':'no-store'}});
  });
}
