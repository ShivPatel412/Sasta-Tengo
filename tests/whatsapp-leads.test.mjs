import test from 'node:test';
import assert from 'node:assert/strict';
import {ingestWhatsapp,listWhatsappLeads} from '../lib/shiv-whatsapp-leads.mjs';

test('concurrent incoming events claim a message only once',async()=>{
 const seen=new Set();
 const run=async(sql,args)=>{
   if(!sql.startsWith('INSERT IGNORE INTO shiv_whatsapp_message_claims'))throw new Error(sql);
   if(seen.has(args[0]))return {affectedRows:0};
   seen.add(args[0]);return {affectedRows:1};
 };
 const atomic=async fn=>fn({});
 const input={action:'claim',message_id:'wamid.test.12345',sender:'919876543210'};
 const first=await ingestWhatsapp(input,{run,atomic});
 const second=await ingestWhatsapp(input,{run,atomic});
 assert.equal(first.accepted,true);
 assert.equal(second.accepted,false);
});

test('lead upsert preserves existing data and stopped state',async()=>{
 const calls=[];
 const old={sender:'919876543210',name:'Client',service:'WordPress',budget:'5000 INR',timeline:'next month',status:'human_takeover',summary:'Old message',booking_request:'',handoff_requested:1,follow_up_at:null,last_message_id:'wamid.previous'};
 const run=async(sql,args)=>{
   calls.push({sql,args});
   if(sql.startsWith('INSERT IGNORE INTO shiv_whatsapp_leads'))return {affectedRows:0};
   if(sql.startsWith('SELECT * FROM shiv_whatsapp_leads'))return [old];
   if(sql.startsWith('UPDATE shiv_whatsapp_leads'))return {affectedRows:1};
   throw new Error(sql);
 };
 const input={action:'upsert',sender:old.sender,message_id:'wamid.test.next',status:'new',summary:'New enquiry'};
 const output=await ingestWhatsapp(input,{run,atomic:async fn=>fn({})});
 assert.equal(output.status,'human_takeover');
 const update=calls.find(x=>x.sql.startsWith('UPDATE'));
 assert.equal(update.args[0],'Client');
 assert.equal(update.args[1],'WordPress');
 assert.equal(update.args[4],'human_takeover');
});

test('same WhatsApp message cannot update a lead twice',async()=>{
 let updates=0;
 const run=async(sql)=>{
   if(sql.startsWith('INSERT IGNORE INTO'))return {affectedRows:0};
   if(sql.startsWith('SELECT * FROM'))return [{sender:'919876543210',last_message_id:'wamid.test.same',status:'new'}];
   if(sql.startsWith('UPDATE'))updates++;
   return {affectedRows:1};
 };
 const r=await ingestWhatsapp({action:'upsert',sender:'919876543210',message_id:'wamid.test.same'},{run,atomic:async fn=>fn({})});
 assert.equal(r.unchanged,true);
 assert.equal(updates,0);
});

test('invalid sender and status are rejected',async()=>{
 await assert.rejects(()=>ingestWhatsapp({action:'claim',message_id:'wamid.test.123',sender:'123'}));
 await assert.rejects(()=>ingestWhatsapp({action:'upsert',sender:'919876543210',message_id:'wamid.test.456',status:'spam'}));
});
