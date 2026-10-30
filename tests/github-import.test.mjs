import test from 'node:test';
import assert from 'node:assert/strict';
import { githubRepository, importGithub, readmeText } from '../lib/github-import.mjs';

test('repository import accepts canonical HTTPS GitHub links and refuses arbitrary hosts and paths', () => {
  assert.equal(githubRepository('https://github.com/octocat/Hello-World.git/').url,'https://github.com/octocat/Hello-World');
  for(const value of ['http://github.com/a/b','https://github.com.evil.test/a/b','https://github.com@127.0.0.1/a/b','https://user:pass@github.com/a/b','https://github.com/a/b/tree/main','https://github.com/a/%2e%2e','https://github.com/a/..','https://localhost/a/b'])assert.throws(()=>githubRepository(value));
});
test('import maps only supported public metadata and converts README to inert text', async () => {
  const calls=[];
  const result=await importGithub('https://github.com/octocat/Hello-World',async(url,options)=>{
    calls.push(url);assert.equal(options.redirect,'error');assert(!options.headers.Authorization);
    return url.endsWith('/languages')?Response.json({JavaScript:100,CSS:30}):url.endsWith('/readme')?new Response('# Hello\nUseful **details**.\n![badge](https://external.test/x)\n```sh\nrm -rf /\n```'):Response.json({name:'Hello-World',description:'A demo project',homepage:'https://example.com',topics:['demo'],language:'JavaScript',private:false});
  });
  assert.equal(calls.length,3);assert.deepEqual(result.project.technologies,['JavaScript','CSS','demo']);
  assert(result.project.description.includes('Useful details.'));assert(!result.project.description.includes('rm -rf'));
  assert.equal(result.project.live_url,'https://example.com/');assert.equal(result.project.github_url,'https://github.com/octocat/Hello-World');
  assert(!('category' in result.project));assert(!('id' in result.project));
  assert(!readmeText('<script>alert(1)</script>').includes('<script>'));
});
test('missing README or languages keeps metadata and reports limitations; invalid links are not imported', async()=>{
  const result=await importGithub('https://github.com/a/b',async url=>url.endsWith('/b')?Response.json({name:'b',description:'Summary',homepage:'javascript:alert(1)',private:false}):new Response('',{status:404}));
  assert.equal(result.project.description,'Summary');assert.equal(result.project.live_url,null);assert.equal(result.warnings.length,2);
  await assert.rejects(importGithub('https://github.com/a/b',async()=>new Response('',{status:404})),/public GitHub repository/);
  await assert.rejects(importGithub('https://github.com/a/b',async()=>Response.json({name:'b',private:true})),/Only public/);
});
test('oversized metadata is refused and oversized README is skipped safely',async()=>{
  await assert.rejects(importGithub('https://github.com/a/b',async()=>new Response('x'.repeat(256001))),/Could not reach GitHub/);
  const result=await importGithub('https://github.com/a/b',async url=>url.endsWith('/b')?Response.json({name:'b',description:'Summary'}):url.endsWith('/readme')?new Response('x'.repeat(100001)):Response.json({}));
  assert.equal(result.project.description,'Summary');assert.equal(result.warnings.length,1);
});
