import test from 'node:test';
import assert from 'node:assert/strict';
import {contactSchema,appointmentSchema} from '../lib/validation.mjs';
import {authorizeLeadWorker,conversationUpdate,dispatchLeads,enqueueLead,getConversation,leadWebhook,updateConversation} from '../lib/lead-conversations.mjs';
const id='11111111-1111-4111-8111-111111111111';
const env={LEADS_N8N_WEBHOOK_URL:'https://n8n.shivpatel.in/webhook/shiv-leads-whatsapp',LEADS_N8N_WEBHOOK_KEY:'x'.repeat(32)};
const base={name:'Test',email:'test@example.test',subject:'Inquiry',message:'Hello'};

test('WhatsApp is optional; explicit consent requires a country code and boolean',()=>{
  assert(contactSchema.safeParse(base).success);
  assert(contactSchema.safeParse({...base,whatsapp_consent:false}).success);
  for(const extra of [{whatsapp_consent:'true'},{whatsapp_consent:true},{whatsapp_consent:true,phone:'9876543210'},{whatsapp_consent:true,phone:'+0000000000'}])assert(!contactSchema.safeParse({...base,...extra}).success);
  assert(contactSchema.safeParse({...base,phone:'+91 98765 43210',whatsapp_consent:true}).success);
  assert(appointmentSchema.safeParse({service_id:1,client_name:'Test',client_email:base.email,client_phone:'+919876543210',appointment_date:new Date(Date.now()+86400000).toISOString(),whatsapp_consent:true}).success);
});
test('no consent queues nothing; consent stores server timestamp, version, normalized phone in submission transaction',async()=>{
  const old=process.env.NEXT_PUBLIC_LEADS_ENABLED;let saved;
  const connection={transaction:true};
  await enqueueLead('contacts','42',{},connection,async()=>{throw new Error('Must not access database');});
  try{
    process.env.NEXT_PUBLIC_LEADS_ENABLED='0';
    await assert.rejects(()=>enqueueLead('contacts','42',{whatsapp_consent:true,phone:'+919876543210'},connection),e=>e.status===503);
    process.env.NEXT_PUBLIC_LEADS_ENABLED='1';
    await enqueueLead('contacts','42',{whatsapp_consent:true,phone:'+91 98765 43210'},connection,async(sql,values,c)=>{saved={sql,values,c};});
    assert.equal(saved.c,connection);assert.equal(saved.values[3],'+919876543210');assert.equal(saved.values[4],'whatsapp-followup-v1');assert.match(saved.sql,/UTC_TIMESTAMP\(\),'queued'/);
  }finally{old===undefined?delete process.env.NEXT_PUBLIC_LEADS_ENABLED:process.env.NEXT_PUBLIC_LEADS_ENABLED=old;}
});
test('webhook destination and authentication are restricted',()=>{
  assert.equal(leadWebhook({}),null);assert.equal(leadWebhook(env),env.LEADS_N8N_WEBHOOK_URL);
  for(const url of ['http://n8n.shivpatel.in/webhook/x','https://evil.test/webhook/x','https://n8n.shivpatel.in.evil.test/webhook/x','https://x@n8n.shivpatel.in/webhook/x','https://n8n.shivpatel.in/webhook/x?token=1','https://n8n.shivpatel.in/webhook-test/x'])assert.throws(()=>leadWebhook({...env,LEADS_N8N_WEBHOOK_URL:url}));
  const old=process.env.LEADS_CALLBACK_KEY;process.env.LEADS_CALLBACK_KEY='s'.repeat(32);
  try{
    assert.doesNotThrow(()=>authorizeLeadWorker(new Request('https://example.test',{headers:{Authorization:'Bearer '+'s'.repeat(32)}}),'LEADS_CALLBACK_KEY'));
    for(const actual of ['', 'Bearer '+'z'.repeat(32),'Bearer '+'é'.repeat(32)])assert.throws(()=>authorizeLeadWorker(new Request('https://example.test',{headers:{Authorization:actual}}),'LEADS_CALLBACK_KEY'),e=>e.status===401);
  }finally{old===undefined?delete process.env.LEADS_CALLBACK_KEY:process.env.LEADS_CALLBACK_KEY=old;}
});
test('unconfigured dispatch leaves durable queued leads untouched',async()=>{
  assert.deepEqual(await dispatchLeads({env:{},run:async()=>{throw Error('no SQL');}}),{dispatched:0,waiting_configuration:true});
});
test('dispatch claims atomically, sends only an ID, and treats lost acknowledgements as uncertain without retries',async()=>{
  for(const mode of ['accepted','timeout','rejected','claimed']){
    const calls=[];let sent=0;
    const run=async(sql,values)=>{calls.push({sql,values});if(sql.startsWith('SELECT'))return [{id,version:1}];return {affectedRows:mode==='claimed'?0:1};};
    const result=await dispatchLeads({env,run,send:async(url,options)=>{
      sent++;assert.equal(url,env.LEADS_N8N_WEBHOOK_URL);assert.equal(options.redirect,'error');assert.equal(options.headers['Idempotency-Key'],id);
      assert.deepEqual(JSON.parse(options.body),{conversation_id:id,source:'website-lead'});
      if(mode==='timeout')throw Error('network');return new Response('{}',{status:mode==='rejected'?401:200});
    }});
    assert.equal(sent,mode==='claimed'?0:1);assert.equal(result.dispatched,mode==='accepted'?1:0);
    if(mode!=='claimed')assert.equal(calls.at(-1).values[0],mode==='timeout'?'uncertain':mode==='rejected'?'error':'accepted');
    assert.match(calls[0].sql,/state='uncertain'/);assert.match(calls[2].sql,/version=\? AND state='queued'/);
  }
});
test('call preference needs a future instant and valid time zone; request never confirms an appointment',()=>{
  const preferred_call_at=new Date(Date.now()+86400000).toISOString();
  assert(conversationUpdate.safeParse({version:1,state:'appointment_requested',preferred_call_at,timezone:'Asia/Kolkata'}).success);
  for(const extra of [{state:'confirmed'},{state:'appointment_requested'},{state:'appointment_requested',preferred_call_at:'2000-01-01T00:00:00Z',timezone:'UTC'},{state:'appointment_requested',preferred_call_at,timezone:'guess'},{state:'collecting',preferred_call_at}])assert(!conversationUpdate.safeParse({version:1,...extra}).success);
});
test('stale updates cannot override takeover or opt-out; stopping queued leads is allowed',async()=>{
  const atomic=work=>work({}),calls=[];
  for(const state of ['human_takeover','opted_out','queued','uncertain']){
    await assert.rejects(()=>updateConversation(id,{version:3,state:'collecting'},{atomic,run:async()=>[{state,version:3}]}),e=>e.status===409);
  }
  await assert.rejects(()=>updateConversation(id,{version:2,state:'human_takeover'},{atomic,run:async()=>[{state:'collecting',version:3}]}),e=>e.status===409);
  const result=await updateConversation(id,{version:3,state:'human_takeover'},{atomic,run:async(sql,values)=>{calls.push({sql,values});return sql.startsWith('SELECT')?[{state:'queued',version:3}]:{affectedRows:1};}});
  assert.equal(result.version,4);assert.match(calls[0].sql,/FOR UPDATE/);assert.equal(calls[1].values[0],'human_takeover');
});
test('workers must read current state and may not message a deleted lead',async()=>{
  const row={id,resource:'contacts',record_id:'42',state:'opted_out',version:4};
  const result=await getConversation(id,async sql=>sql.includes('next_lead')?[row]:[{name:'Test'}]);
  assert.equal(result.can_message,false);
  await assert.rejects(()=>getConversation(id,async sql=>sql.includes('next_lead')?[row]:[]),e=>e.status===404);
});
