import test from 'node:test';
import assert from 'node:assert/strict';
import {sendTerminalContact} from '../lib/terminal-contact.mjs';
test('a pending contact request cannot submit twice or reset answers before confirmation',async()=>{
 const pending={current:false},answers={name:'Synthetic',message:'Keep this inquiry'};let finish,calls=0,success=0,failure=0;
 const options={pending,answers,send:async data=>{calls++;assert.equal(data,answers);await new Promise(resolve=>{finish=resolve;});},onPending:()=>{},onSuccess:()=>success++,onFailure:()=>failure++};
 const first=sendTerminalContact(options);assert(pending.current);assert.equal(await sendTerminalContact(options),false);assert.equal(calls,1);assert.equal(success,0);finish();assert.equal(await first,true);assert.equal(success,1);assert.equal(failure,0);assert(!pending.current);
});
test('failed contact delivery keeps the same answers retryable and never reports success',async()=>{
 const pending={current:false},answers={message:'Do not erase me'};let errors=0,successes=0;
 const options={pending,answers,send:async()=>{throw Error('503');},onPending:()=>{},onSuccess:()=>successes++,onFailure:()=>errors++};
 assert.equal(await sendTerminalContact(options),false);assert.equal(answers.message,'Do not erase me');assert.equal(errors,1);assert.equal(successes,0);assert(!pending.current);
 options.send=async()=>{};assert.equal(await sendTerminalContact(options),true);assert.equal(successes,1);
});
