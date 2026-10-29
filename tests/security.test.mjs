import test from 'node:test';
import assert from 'node:assert/strict';
import { contactSchema, requestSchema, projectSchema, experienceSchema, serialize } from '../lib/validation.mjs';
import { sameOrigin } from '../lib/auth.mjs';
import { assertWritable, body } from '../lib/db.mjs';
import { imageExtension } from '../lib/media.mjs';
test('contact accepts expected fields and rejects privilege fields and excessive messages', () => {
  const input = { name:'Jane', email:'jane@example.com', subject:'Website', message:'Hello' };
  assert.equal(contactSchema.parse(input).name, 'Jane');
  assert.equal(contactSchema.safeParse({ ...input,is_read:true }).success,false);
  assert.equal(contactSchema.safeParse({ ...input,message:'x'.repeat(5001) }).success,false);
});
test('project requests preserve all wizard answers and require consent', () => {
  const input = { service:'Web',projectType:'New',description:'A shop',budget:'1000',timeline:'1 month',fullName:'Jane',email:'jane@example.com',phone:'123',country:'India',confirmed:true,features:['Checkout'],assets:['Logo'] };
  assert.deepEqual(requestSchema.parse(input).features,['Checkout']);
  assert.equal(requestSchema.safeParse({...input,confirmed:false}).success,false);
  assert.equal(requestSchema.safeParse({...input,existingUrl:'javascript:alert(1)'}).success,false);
});
test('project edits preserve media arrays and reject unsafe URLs and traversal', () => {
  const input = { title:'Portfolio',description:'Demo',category:'web',technologies:['React'],gallery:['projects/photo.webp'] };
  assert.deepEqual(projectSchema.parse(input).gallery,['projects/photo.webp']);
  assert.equal(projectSchema.safeParse({...input,live_url:'javascript:alert(1)'}).success,false);
  assert.equal(projectSchema.safeParse({...input,poster:'../private/file'}).success,false);
});
test('Laravel JSON and boolean casts and public media URLs remain compatible', () => {
  const row = serialize({ id:'9007199254740993',poster:'projects/a.jpg',gallery:'["projects/b.jpg","https://blob.example/c.jpg"]',technologies:'["Next.js"]',is_featured:0 },'projects','https://media.example/storage/');
  assert.equal(row.id,'9007199254740993');
  assert.equal(row.is_featured,false);
  assert.equal(row.poster_url,'https://media.example/storage/projects/a.jpg');
  assert.equal(row.gallery_urls[1],'https://blob.example/c.jpg');
});
test('experience chronology is validated', () => {
  assert.equal(experienceSchema.safeParse({title:'Dev',company:'Acme',description:'Build',start_date:'2026-10-01',end_date:'2026-09-01'}).success,false);
});
test('admin mutations reject absent or foreign origins', () => {
  process.env.APP_ORIGIN = 'https://shivpatel.in';
  assert.throws(() => sameOrigin(new Request('https://shivpatel.in/api/admin/projects')), /Origin/);
  assert.throws(() => sameOrigin(new Request('https://shivpatel.in/api/admin/projects',{headers:{origin:'https://evil.example'}})), /Origin/);
  sameOrigin(new Request('https://shivpatel.in/api/admin/projects',{headers:{origin:'https://shivpatel.in'}}));
});
test('writes are denied unless explicitly enabled', () => {
  delete process.env.MIGRATION_READ_ONLY; assert.throws(assertWritable,/review mode/);
  process.env.MIGRATION_READ_ONLY='1'; assert.throws(assertWritable,/review mode/);
  process.env.MIGRATION_READ_ONLY='0'; assertWritable(); delete process.env.MIGRATION_READ_ONLY;
});
test('request parsing enforces a streaming size limit and valid JSON', async () => {
  const request = value => new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'},body:value});
  await assert.rejects(() => body(request('x'.repeat(300)),20), /too large/);
  await assert.rejects(() => body(request('{')), /Invalid JSON/);
  assert.deepEqual(await body(request('{"ok":true}')),{ok:true});
});
test('upload accepts image signatures and rejects disguised executable/SVG input', () => {
  assert.equal(imageExtension(Buffer.from('<svg onload="alert(1)">')),null);
  assert.equal(imageExtension(Buffer.from('RIFF1234WEBPabc')),'webp');
  assert.equal(imageExtension(Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])),'png');
});
