import test from 'node:test';
import assert from 'node:assert/strict';
import {localProjectImage,saveLocalProjectImage} from '../lib/project-media.mjs';
import {serialize} from '../lib/validation.mjs';

test('local project media refuses traversal, non-image bytes and oversized content',async()=>{
  for(const file of ['../.env.local','%2e%2e/config.json','a'.repeat(64)+'.svg'])await assert.rejects(localProjectImage(file),/Not found/);
  await assert.rejects(saveLocalProjectImage(Buffer.from('<svg>not an image</svg>')),/image under/);
  await assert.rejects(saveLocalProjectImage(Buffer.alloc(4_000_001)),/image under/);
});
test('local project media stays on its authenticated route when existing project records are serialized',()=>{
  const poster='/api/admin/project-media/'+'a'.repeat(64)+'.jpg';
  const row=serialize({poster,gallery:JSON.stringify([poster])},'projects');
  assert.equal(row.poster_url,poster);assert.deepEqual(row.gallery_urls,[poster]);
});
