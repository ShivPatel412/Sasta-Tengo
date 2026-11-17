import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {formSource,formSources,landingSubjectPrefix} from '../lib/form-sources.mjs';
import {listLeads} from '../lib/workspace-crm.mjs';
import {dashboardGroups,sections} from '../lib/dashboard.mjs';

test('existing contact, landing page and service records keep their original source and IDs',()=>{
  assert.equal(formSource({resource:'contacts',subject:'A new website'}),'contact');
  assert.equal(formSource({resource:'contacts',subject:landingSubjectPrefix+'Automation'}),'landing');
  assert.equal(formSource({resource:'appointments',subject:landingSubjectPrefix+'Anything'}),'service');
  assert.equal(formSource({section:'appointments'}),'service');
  assert.equal(formSource({summary:landingSubjectPrefix+'Website design'}),'landing');
  assert.equal(Object.keys(formSources).length,3);
});

test('Forms combines both storage tables and filters every source before pagination and counts',async()=>{
  for(const source of Object.keys(formSources)){
    const calls=[];
    const result=await listLeads(new URL(`https://example.test/?source=${source}&page=2&search=%27%20OR%201%3D1`),async(sql,values)=>{
      calls.push({sql,values});return sql.includes('COUNT(')?[{total:101}]:[{id:'8',resource:'contacts',form_source:source}];
    });
    assert.equal(result.count,101);
    assert.equal(result.data[0].id,'8');
    for(const {sql,values} of calls){
      assert.match(sql,/UNION ALL/);assert.match(sql,/WHERE form_source=\?/);
      assert.match(sql,/CASE WHEN subject LIKE 'Freelance landing page: %'/);
      assert.equal(values[0],source);assert.equal(values[1],"%' OR 1=1%");assert.ok(!sql.includes("' OR 1=1"));
    }
    assert.match(calls[0].sql,/OFFSET 100/);
  }
  await assert.rejects(listLeads(new URL('https://example.test/?source=users')),error=>error.status===422);
});

test('Forms and CV navigation preserve the original projects and experience editors',()=>{
  const cv=dashboardGroups.find(([name])=>name==='CV')[1];
  assert.ok(cv.includes('projects'));assert.ok(cv.includes('experiences'));
  assert.ok(!cv.includes('types'));assert.ok(sections.types);
  assert.ok(dashboardGroups[0][1].includes('forms'));
  const keys=dashboardGroups.flatMap(([,keys])=>keys);
  assert.equal(new Set(keys).size,keys.length);
  for(const key of keys)assert.ok(sections[key]);
  assert.ok(sections.contacts);assert.ok(sections.appointments);
});

test('Forms API remains authenticated and prevents caching private submissions',async()=>{
  const source=await readFile(new URL('../app/api/admin/forms/route.js',import.meta.url),'utf8');
  assert.match(source,/await admin\(\)/);assert.match(source,/Cache-Control.*no-store/);
  assert.match(source,/export async function GET/);
});
