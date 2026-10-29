import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { initializeFreshDatabase,adminRecord,createInitialAdmin } from '../lib/database-setup.mjs';

test('fresh setup refuses a database with any existing table before applying DDL',async()=>{
  let calls=0;
  await assert.rejects(initializeFreshDatabase({query:async()=>{calls++;return [[{table:'events'}]];}}),/not empty/);
  assert.equal(calls,1);
});
test('initial admin setup refuses to overwrite an existing user',async()=>{
  let calls=0;
  await assert.rejects(createInitialAdmin({execute:async()=>{calls++;return [[{id:1}]];}},{email:'admin@example.com'}),/already exists/);
  assert.equal(calls,1);
});
test('new admin passwords are validated and hashed, including the bcrypt byte limit',async()=>{
  await assert.rejects(adminRecord('admin@example.com','Admin','short'),/at least 12/);
  await assert.rejects(adminRecord('admin@example.com','Admin','🙂'.repeat(20)),/72 UTF-8/);
  await assert.rejects(adminRecord('invalid','Admin','Example-test-123!'));
  const record=await adminRecord('ADMIN@example.com',' Admin ','Example-test-123!');
  assert.equal(record.email,'admin@example.com');assert.equal(record.name,'Admin');
  assert.notEqual(record.password,'Example-test-123!');assert.equal(await bcrypt.compare('Example-test-123!',record.password),true);
});
