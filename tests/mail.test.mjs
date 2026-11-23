import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {deliver} from '../lib/mail.mjs';
function setup(t,{kind='rsvp',fail=false,port='587'}={}){
 const env={SMTP_HOST:'smtp.example.invalid',SMTP_FROM:'host@example.invalid',SMTP_USER:'fixture',SMTP_PASSWORD:'fixture',SMTP_PORT:port,SMTP_SECURE:'false',LEAD_RECIPIENT:'host@example.invalid',APP_ORIGIN:'https://example.invalid'};
 const before=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
 t.after(()=>{for(const[k,v]of Object.entries(before))v===undefined?delete process.env[k]:process.env[k]=v;});
 const sent=[],queries=[];let config;
 t.mock.method(nodemailer,'createTransport',options=>{config=options;return{sendMail:async mail=>{if(fail)throw Error('Synthetic SMTP failure');sent.push(mail);}};});
 const run=async(sql,args=[])=>{
  queries.push(sql);
  if(sql.startsWith('SELECT * FROM next_mail_outbox'))return[{id:1,record_id:2,kind}];
  if(sql.startsWith('SELECT * FROM next_rsvps'))return[{id:2,payload:{activities:['Bowling'],dinner:'<img src=x onerror=alert(1)>',wishlistPlace:{link:'https://example.invalid'},bottle:'Host choice'}}];
  if(sql.startsWith('SELECT * FROM contacts'))return[{id:2,email:'guest@example.invalid'}];
  return{affectedRows:1};
 };
 return{sent,queries,run,config:()=>config};
}
test('RSVP notifications use certificate-verified TLS and inert plain text',async t=>{
 const f=setup(t);assert.equal(await deliver({run:f.run}),1);
 assert.equal(f.config().requireTLS,true);assert.notEqual(f.config().tls?.rejectUnauthorized,false);
 assert.equal(f.sent.length,1);assert.equal(f.sent[0].html,undefined);assert.match(f.sent[0].text,/<img/);
 assert.equal(f.sent[0].to,'host@example.invalid');assert(f.queries.some(q=>q.includes('SET sent_at=')));
});
test('implicit TLS works on port 465 without weakening certificate checks',async t=>{
 const f=setup(t,{port:'465'});await deliver({run:f.run});assert.equal(f.config().secure,true);assert.equal(f.config().requireTLS,false);
 assert.notEqual(f.config().tls?.rejectUnauthorized,false);
});
test('failed RSVP notification stays pending for retry',async t=>{
 const f=setup(t,{fail:true});assert.equal(await deliver({run:f.run}),0);
 assert(!f.queries.some(q=>q.includes('SET sent_at=')));
});
test('existing contact notifications still send admin and guest acknowledgements',async t=>{
 const f=setup(t,{kind:'contact'});assert.equal(await deliver({run:f.run}),1);
 assert.equal(f.sent.length,2);assert.equal(f.sent[1].to,'guest@example.invalid');
});

test('an empty SMTP password leaves queued enquiries untouched',async t=>{
 t.mock.property(process,'env',{...process.env,SMTP_HOST:'smtp.hostinger.com',SMTP_FROM:'Shiv Patel <info@shivpatel.in>',SMTP_USER:'info@shivpatel.in',SMTP_PASSWORD:'',LEAD_RECIPIENT:'info@shivpatel.in'});
 await assert.rejects(deliver(),/SMTP not configured/);
});
