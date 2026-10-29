import test from 'node:test';
import assert from 'node:assert/strict';
import api from '../components/site/services/api.js';

test('public frontend requests stay on the Next.js origin and preserve form data', async t => {
  const payload={ fullName:'Example', confirmed:true, features:['Dashboard'] };
  t.mock.method(globalThis,'fetch',async (url,options)=>{
    assert.equal(url,'/api/v1/project-requests');
    assert.equal(options.method,'POST');
    assert.equal(options.credentials,'same-origin');
    assert.deepEqual(JSON.parse(options.body),payload);
    return Response.json({id:12},{status:201});
  });
  assert.deepEqual(await api.post('/v1/project-requests',payload),{data:{id:12}});
});

test('failed submissions keep the server error and never appear successful', async t=>{
  t.mock.method(globalThis,'fetch',async()=>Response.json({message:'Writes disabled'},{status:503}));
  await assert.rejects(api.post('/v1/contacts',{}),error=>error.response.status===503&&error.response.data.message==='Writes disabled');
});

test('HTML responses are rejected instead of treated as saved data',async t=>{
  t.mock.method(globalThis,'fetch',async()=>new Response('<html>Sign in</html>',{headers:{'content-type':'text/html'}}));
  await assert.rejects(api.get('/v1/projects'),/non-JSON/);
});
