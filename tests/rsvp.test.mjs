import test from 'node:test';
import assert from 'node:assert/strict';
import {submitRsvp} from '../lib/rsvp.mjs';
import {HttpError} from '../lib/db.mjs';
const fixture={request_id:'11111111-1111-4111-8111-111111111111',activities:['Bowling'],bottle:'Host choice',wishlistPlace:{name:'Cafe',link:'https://example.invalid/place',notes:''}};
function setup(t){
 const old={APP_ORIGIN:process.env.APP_ORIGIN,MIGRATION_READ_ONLY:process.env.MIGRATION_READ_ONLY};
 process.env.APP_ORIGIN='https://audit.invalid';process.env.MIGRATION_READ_ONLY='0';
 t.after(()=>{for(const[k,v]of Object.entries(old))v===undefined?delete process.env[k]:process.env[k]=v;});
 const state={rows:new Map(),outbox:[],transactions:0,limits:0,failQueue:false};
 const connection={execute:async(sql,args)=>{
  if(sql.startsWith('INSERT IGNORE INTO next_rsvps')){
   if(state.rows.has(args[0]))return[{affectedRows:0}];
   state.rows.set(args[0],{id:'1',payload:JSON.parse(args[1])});return[{affectedRows:1}];
  }
  if(sql.startsWith('SELECT id,payload FROM next_rsvps'))return[[state.rows.get(args[0])].filter(Boolean)];
  if(sql.startsWith('INSERT INTO next_mail_outbox')){if(state.failQueue)throw Error('Synthetic storage failure');state.outbox.push(args);return[{affectedRows:1}];}
  throw Error('Unexpected query '+sql);
 }};
 const deps={limit:async()=>{state.limits++;},atomic:async work=>{
  state.transactions++;const before=new Map(state.rows),queued=state.outbox.length;
  try{return await work(connection);}catch(e){state.rows=before;state.outbox.length=queued;throw e;}
 }};
 const request=(value=fixture,headers={})=>new Request('https://audit.invalid/api/submit-rsvp',{method:'POST',headers:{origin:'https://audit.invalid','content-type':'application/json',...headers},body:typeof value==='string'?value:JSON.stringify(value)});
 return{state,deps,request};
}
test('RSVP rejects malformed, oversized, invalid and tracking inputs before persistence',async t=>{
 const{state,deps,request}=setup(t);
 for(const input of ['{','{}',JSON.stringify({...fixture,dinner:'x'.repeat(13000)}),{...fixture,telemetry:{userAgent:'private'}},{...fixture,location:{latitude:1}},{...fixture,wishlistPlace:{link:'javascript:alert(1)'}},{...fixture,activities:[]}]){
  await assert.rejects(submitRsvp(request(input),deps));
 }
 assert.equal(state.transactions,0);assert.equal(state.outbox.length,0);
});
test('RSVP enforces origin, read-only mode and rate limiting before saving',async t=>{
 const{state,deps,request}=setup(t);
 await assert.rejects(submitRsvp(request(fixture,{origin:'https://other.invalid'}),deps),e=>e.status===403);
 await assert.rejects(submitRsvp(request(fixture,{'sec-fetch-site':'cross-site'}),deps),e=>e.status===403);
 process.env.MIGRATION_READ_ONLY='1';await assert.rejects(submitRsvp(request(),deps),e=>e.status===503);
 process.env.MIGRATION_READ_ONLY='0';
 await assert.rejects(submitRsvp(request(),{...deps,limit:async()=>{throw new HttpError(429,'Limit');}}),e=>e.status===429);
 assert.equal(state.transactions,0);
});
test('RSVP commits choices and one notification before confirming and deduplicates retries',async t=>{
 const{state,deps,request}=setup(t);
 assert.deepEqual(await submitRsvp(request(),deps),{accepted:true,request_id:fixture.request_id,duplicate:false});
 assert.equal(state.rows.size,1);assert.deepEqual(state.outbox,[['rsvp','1']]);
 assert.equal((await submitRsvp(request(),deps)).duplicate,true);assert.equal(state.outbox.length,1);
 await assert.rejects(submitRsvp(request({...fixture,bottle:'Changed'}),deps),e=>e.status===409);
 assert.equal(state.outbox.length,1);assert.equal(state.rows.get(fixture.request_id).payload.bottle,'Host choice');
});
test('RSVP never acknowledges a failed transaction or missing migration',async t=>{
 const{state,deps,request}=setup(t);state.failQueue=true;
 await assert.rejects(submitRsvp(request(),deps),/Synthetic storage failure/);
 assert.equal(state.rows.size,0);assert.equal(state.outbox.length,0);
 await assert.rejects(submitRsvp(request(),{...deps,atomic:async()=>{throw Error('Missing table');}}),/Missing table/);
});
