import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {draftSchema,mergeAnalysis,similar,weightedScore,defaultWeights,matches} from '../lib/instagram-core.mjs';
import {newStudioDraft,choosePhoto,movePhoto,restoreRecommendations,exportStudioImages} from '../lib/instagram-editor.mjs';
import {normalizePhoto,boundedBytes,studioStorageReady,studioStorageOptions,uploadLimit,stagedPhotoPath} from '../lib/instagram-media.mjs';
import {webhookURL,callbackOrigin} from '../lib/instagram-jobs.mjs';
import {readFile} from 'node:fs/promises';
const ids=[randomUUID(),randomUUID(),randomUUID()];
const findings=ids.map((id,i)=>({id,...Object.fromEntries(Object.keys(defaultWeights).map(k=>[k,60+i*10])),description:'Synthetic photo',explanation:'Synthetic analysis fixture',category:'Nature',cover_suitability:75,suggested_crop:'original',alt_text:'Synthetic pattern',tags:['test']}));
const result={photos:findings,order:[ids[2],ids[1],ids[0]],captions:['Short','Casual','Story'],hashtags:['#Nature'],music:['Cinematic']};

test('Studio storage selects its private store and never inherits public project storage',()=>{
 assert(!studioStorageReady({BLOB_STORE_ID:'store_public',VERCEL_OIDC_TOKEN:'test'}));
 assert(studioStorageReady({STUDIO_BLOB_STORE_ID:'store_private'}));
 assert.deepEqual(studioStorageOptions({STUDIO_BLOB_STORE_ID:'store_private',BLOB_READ_WRITE_TOKEN:'unrelated-public-token'}),{storeId:'store_private'});
 assert.throws(()=>studioStorageOptions({}),/not configured/);
 assert.deepEqual(studioStorageOptions({STUDIO_BLOB_STORE_ID:'store_private',VERCEL_OIDC_TOKEN:'test'}),{storeId:'store_private'});
 assert.deepEqual(studioStorageOptions({STUDIO_BLOB_READ_WRITE_TOKEN:'private-test-token'}),{token:'private-test-token'});
});
test('Studio validates batch identity, limits and explicit manual choices',()=>{
 const draft=newStudioDraft(ids);assert(draftSchema.safeParse(draft).success);
 assert(!draftSchema.safeParse({...draft,selected:[randomUUID()]}).success);
 assert(!draftSchema.safeParse({...draft,overrides:{[ids[0]]:'exclude'}}).success);
 assert(!draftSchema.safeParse({...draft,photo_ids:[ids[0],ids[0]]}).success);
 assert(!draftSchema.safeParse({...draft,max_photos:1}).success);
 assert(!draftSchema.safeParse({...draft,analysis:['invalid']}).success);
});
test('AI recommendations preserve locked positions, excluded photos and manual captions',()=>{
 const draft={...newStudioDraft(ids),overrides:{[ids[0]]:'lock',[ids[1]]:'exclude'},selected:[ids[0],ids[2]],caption:'My words'};
 const merged=mergeAnalysis(draft,result);assert.deepEqual(merged.selected,[ids[0],ids[2]]);assert.equal(merged.caption,'My words');assert.equal(merged.analysis[0].score,80);
 assert.equal(weightedScore(findings[0]),60);assert.equal(merged.captions.length,3);
 assert.throws(()=>mergeAnalysis(draft,{...result,photos:[findings[0],findings[0],findings[2]]}),/unexpected photos/);
 assert.throws(()=>mergeAnalysis(draft,{...result,order:[randomUUID()]}),/unexpected photos/);
});
test('manual include, exclusion, ordering and restore retain explicit locks',()=>{
 let draft=newStudioDraft(ids);draft=choosePhoto(draft,ids[1],'exclude');assert(!draft.selected.includes(ids[1]));
 draft=choosePhoto(draft,ids[0],'lock');draft={...draft,ai_order:result.order};assert.deepEqual(restoreRecommendations(draft).selected,[ids[0],ids[2]]);
 assert.equal(movePhoto(draft,ids[2],0).selected[0],ids[2]);
 assert.throws(()=>choosePhoto({...draft,max_photos:2},ids[1],'include'),/maximum/);
});
test('short AI selections cannot move a photo locked later in the carousel',()=>{
 const draft={...newStudioDraft(ids),overrides:{[ids[2]]:'lock'}};
 const merged=mergeAnalysis(draft,{...result,order:[ids[2]]});assert.equal(merged.selected.indexOf(ids[2]),2);
 assert.equal(restoreRecommendations({...draft,ai_order:[ids[2]]}).selected.indexOf(ids[2]),2);
});
test('perceptual hashes provide bounded similarity hints',()=>{
 assert(similar('0000000000000000','0000000000000001'));assert(!similar('0000000000000000','ffffffffffffffff'));
 assert(matches('abc','abc'));assert(!matches('ab','abc'));assert(!matches(null,'abc'));
});
test('normalization decodes safely, strips metadata, validates dimensions and refuses disguised input',async()=>{
 const source=await sharp({create:{width:640,height:480,channels:3,background:'#467830'}}).withMetadata().jpeg().toBuffer();
 const photo=await normalizePhoto(source),meta=await sharp(photo.bytes).metadata();assert.equal(photo.width,640);assert.equal(photo.sha256.length,64);assert.equal(photo.dhash.length,16);assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);
 await assert.rejects(normalizePhoto(Buffer.from('<svg>not a photo</svg>')),/valid, single/);
 await assert.rejects(normalizePhoto(await sharp({create:{width:100,height:100,channels:3,background:'#fff'}}).png().toBuffer()),/320 pixels/);
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(12));c.close();}});await assert.rejects(boundedBytes(stream,5),/under/);
});
test('50 MB uploads normalize privately and reject larger input and other owners staging paths',async()=>{
 const previous=process.env.STUDIO_UPLOAD_BYTES;delete process.env.STUDIO_UPLOAD_BYTES;
 try{
  assert.equal(uploadLimit(),50_000_000);
  process.env.STUDIO_UPLOAD_BYTES='99000000';assert.equal(uploadLimit(),50_000_000);delete process.env.STUDIO_UPLOAD_BYTES;
  const jpeg=await sharp({create:{width:640,height:480,channels:3,background:'#467830'}}).jpeg().toBuffer();
  const chunks=[jpeg.subarray(0,2)];let remaining=50_000_000-jpeg.length;
  while(remaining>=4){const size=Math.min(remaining,65537),segment=Buffer.alloc(size);segment[0]=255;segment[1]=239;segment.writeUInt16BE(size-2,2);chunks.push(segment);remaining-=size;}
  chunks.push(jpeg.subarray(2),Buffer.alloc(remaining));const source=Buffer.concat(chunks);
  assert.equal(source.length,50_000_000);const image=await normalizePhoto(source);assert(image.bytes.length<4_000_000);assert.equal(image.width,640);assert.equal((await sharp(image.bytes).metadata()).exif,undefined);
  await assert.rejects(normalizePhoto(Buffer.alloc(50_000_001)),/upload limit/);
  const path=`instagram-staging/12/${Date.now()}-${randomUUID()}`;assert.equal(stagedPhotoPath(12,path),path);
  for(const key of [path.replace('/12/','/13/'),path+'/../photo.jpg','instagram/12/photo.jpg','https://evil.example/'+path])assert.throws(()=>stagedPhotoPath(12,key),/Invalid upload path/);
 }finally{previous===undefined?delete process.env.STUDIO_UPLOAD_BYTES:process.env.STUDIO_UPLOAD_BYTES=previous;}
});
test('webhook and callback destinations reject arbitrary hosts and embedded credentials',()=>{
 const keys=['STUDIO_N8N_WEBHOOK_URL','APP_ORIGIN','NODE_ENV'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{process.env.NODE_ENV='production';for(const url of ['https://evil.example/webhook/a','https://n8n.shivpatel.in.evil/webhook/a','https://secret@n8n.shivpatel.in/webhook/a']){process.env.STUDIO_N8N_WEBHOOK_URL=url;assert.throws(webhookURL,/not allowed/);}process.env.STUDIO_N8N_WEBHOOK_URL='https://n8n.shivpatel.in/webhook/studio';assert(webhookURL());process.env.APP_ORIGIN='https://evil.example';assert.throws(callbackOrigin,/not allowed/);}finally{for(const[k,v]of Object.entries(old))v===undefined?delete process.env[k]:process.env[k]=v;}
});
test('carousel ZIP contains ordered authenticated images and refuses failed downloads',async()=>{
 const original=global.fetch;try{const calls=[];global.fetch=async url=>{calls.push(url);return new Response(new Uint8Array([255,216,255,0]));};const zip=await exportStudioImages({selected:ids.slice(0,2)}),bytes=Buffer.from(await zip.arrayBuffer());assert.equal(bytes.readUInt32LE(0),0x04034b50);assert(bytes.includes(Buffer.from('01.jpg')));assert(bytes.includes(Buffer.from('02.jpg')));assert.equal(calls.length,2);global.fetch=async()=>new Response('',{status:401});await assert.rejects(exportStudioImages({selected:[ids[0]]}),/could not be exported/);}finally{global.fetch=original;}
});
test('prepared n8n workflow stays inactive, immediately acknowledges and never publishes',async()=>{
 const workflow=JSON.parse(await readFile(new URL('../control-room/instagram-studio/workflow.json',import.meta.url),'utf8'));
 assert.equal(workflow.active,false);assert.equal(workflow.nodes[0].parameters.authentication,'headerAuth');assert.equal(workflow.nodes[0].parameters.responseMode,'onReceived');
 assert.equal(workflow.settings.saveDataSuccessExecution,'none');assert.equal(workflow.settings.saveDataErrorExecution,'none');assert.equal(workflow.settings.saveManualExecutions,false);
 const code=workflow.nodes.find(n=>n.name==='Validate studio request').parameters.jsCode;
 const job={job_id:ids[0],attempt:1,photos:[{id:ids[1],inline_data:{mime_type:'image/jpeg',data:'/9j/'}}],callback_token:'a'.repeat(64),callback_url:'https://www.shivpatel.in/api/jobs/instagram/callback'};
 const run=new Function('$json',code);assert.equal(run({body:job})[0].json.gemini_request.contents[0].parts.length,3);
 assert.throws(()=>run({body:{...job,callback_url:'https://evil.example/callback'}}),/not allowed/);
 assert(!JSON.stringify(workflow).includes('graph.facebook.com'));
});

test('Studio callbacks report provider failures and never parse private model thoughts',async()=>{
 const workflow=JSON.parse(await readFile(new URL('../control-room/instagram-studio/workflow.json',import.meta.url),'utf8'));
 const source=workflow.nodes.find(n=>n.name==='Build protected callback').parameters.jsCode;
 const job={job_id:ids[0],attempt:1,callback_url:'https://www.shivpatel.in/api/jobs/instagram/callback',callback_token:'a'.repeat(64)};
 const run=response=>new Function('$json','$',source)(response,()=>({first:()=>({json:job})}))[0].json.body;
 assert(run({error:'private error'}).error);
 assert(run({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]}).error);
 assert.deepEqual(run({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:'{"ok":true}'}]}}]}).result,{ok:true});
});
