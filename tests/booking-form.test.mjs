import test from 'node:test';
import assert from 'node:assert/strict';
import { getStepErrors } from '../components/site/pages/bookingValidation.js';

test('booking wizard validates required steps and final consent before submission',()=>{
  assert.ok(getStepErrors(1,{service:'',addSomethingElse:false}).service);
  assert.deepEqual(getStepErrors(1,{service:'Website Design',addSomethingElse:false}),{});
  assert.ok(getStepErrors(2,{projectType:'',description:''}).description);
  assert.ok(getStepErrors(4,{budget:'',timeline:''}).timeline);
  assert.ok(getStepErrors(5,{fullName:'Test',email:'invalid',phone:'123',country:'India'}).email);
  assert.deepEqual(getStepErrors(5,{fullName:'Test',email:'test@example.com',phone:'+1 555 010 1234',country:'India'}),{});
  assert.ok(getStepErrors(6,{confirmed:false}).confirmed);
  assert.deepEqual(getStepErrors(6,{confirmed:true}),{});
});
