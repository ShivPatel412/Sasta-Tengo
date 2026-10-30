import test from 'node:test';
import assert from 'node:assert/strict';
import {draftPayload,activitySeries,recentInquiries,imageSource,safeLink} from '../lib/dashboard.mjs';
test('project editor preserves media and arrays without submitting derived or privileged fields',()=>{
  const data=draftPayload('projects',{id:'12',title:'Site',description:'Work',category:'Web',image:'old.jpg',poster:'https://example.com/cover.jpg',gallery:['a.jpg','b.jpg'],technologies:'Next.js\n\nMySQL',is_featured:true,order:'2',poster_url:'derived',created_at:'ignored'});
  assert.deepEqual(data.gallery,['a.jpg','b.jpg']);assert.deepEqual(data.technologies,['Next.js','MySQL']);assert.equal(data.image,'old.jpg');assert.equal(data.order,2);assert.equal(data.is_featured,true);assert.ok(!('id'in data));assert.ok(!('poster_url'in data));
});
test('contact and request edits never overwrite submitted form answers',()=>{
  const data=draftPayload('contacts',{name:'Do not edit',message:'Original',admin_notes:'Follow up',is_read:false,lead_status:'new'});
  assert.deepEqual(data,{admin_notes:'Follow up',is_read:false,lead_status:'new'});
  const request=draftPayload('appointments',{request_data:{description:'Keep me'},status:'confirmed',lead_status:'qualified',admin_notes:'Call'});assert.ok(!('request_data'in request));
});
test('current experience clears its end date and keeps achievements',()=>{
  const data=draftPayload('experiences',{is_current:true,end_date:'2020-01-01',highlights:['Shipped a product'],technologies:'Next.js'});
  assert.equal(data.end_date,null);assert.deepEqual(data.highlights,['Shipped a product']);
});
test('overview fills zero-activity days in UTC and combines both inquiry sources',()=>{
  const series=activitySeries([{day:'2026-10-30',total:'3'}],new Date('2026-10-30T01:00:00Z'));
  assert.equal(series.length,7);assert.deepEqual(series.at(-1),{day:'2026-10-30',total:3});assert.equal(series[0].day,'2026-10-24');assert.equal(series[0].total,0);
  const recent=recentInquiries([{id:'1',created_at:'2026-10-29 20:00:00'}],[{id:'2',created_at:'2026-10-30 00:00:00'}]);assert.equal(recent[0].section,'appointments');
});
test('dashboard previews and links reject executable and traversal URLs',()=>{
  assert.equal(imageSource('javascript:alert(1)'),'');assert.equal(imageSource('../private/a.jpg'),'');assert.equal(imageSource('//tracker.example/a'),'');assert.equal(imageSource('projects/a.jpg'),'/storage/projects/a.jpg');assert.equal(safeLink('javascript:alert(1)'),null);
});
