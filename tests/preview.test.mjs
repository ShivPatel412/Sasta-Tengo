import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalPreview } from '../lib/preview.mjs';
import { GET, POST } from '../app/api/v1/[...path]/route.js';
test('preview requires explicit development mode and no database configuration', () => {
  const env = { NODE_ENV:'development', LOCAL_PREVIEW:'1' };
  assert.equal(isLocalPreview(env),true);
  assert.equal(isLocalPreview({...env,NODE_ENV:'production'}),false);
  assert.equal(isLocalPreview({...env,LOCAL_PREVIEW:'0'}),false);
  for (const key of ['DB_HOST','DB_NAME','DB_USER']) assert.equal(isLocalPreview({...env,[key]:'configured'}),false);
});
test('local preview serves empty public collections and never acknowledges a saved submission', async () => {
  const keys = ['NODE_ENV','LOCAL_PREVIEW','DB_HOST','DB_NAME','DB_USER','MIGRATION_READ_ONLY'];
  const previous = Object.fromEntries(keys.map(key => [key,process.env[key]]));
  try {
    for (const key of ['DB_HOST','DB_NAME','DB_USER']) delete process.env[key];
    process.env.NODE_ENV='development'; process.env.LOCAL_PREVIEW='1'; process.env.MIGRATION_READ_ONLY='0';
    for (const path of [['services'],['projects'],['experience'],['education'],['projects','featured'],['projects','category','web']]) {
      const response = await GET(new Request('http://localhost/api/v1/'+path.join('/')), {params:Promise.resolve({path})});
      assert.equal(response.status,200); assert.equal(response.headers.get('X-Local-Preview'),'1');
      assert.deepEqual(await response.json(),[]);
    }
    const detail = await GET(new Request('http://localhost/api/v1/projects/1'),{params:Promise.resolve({path:['projects','1']})});
    assert.equal(detail.status,404);
    const privateList = await GET(new Request('http://localhost/api/v1/contacts'),{params:Promise.resolve({path:['contacts']})});
    assert.equal(privateList.status,404);
    const submission = await POST(new Request('http://localhost/api/v1/contacts',{method:'POST'}),{params:Promise.resolve({path:['contacts']})});
    assert.equal(submission.status,503); assert.match((await submission.json()).message,/submissions are disabled/);
  } finally {
    for (const [key,value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key]=value; }
  }
});
