import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardStats} from '../lib/dashboard-stats.mjs';
test('overview starts independent reads together and preserves all counts and recent details',async()=>{
  const pending=[];
  const result=dashboardStats(sql=>new Promise(resolve=>pending.push({sql,resolve})));
  assert.equal(pending.length,7,'Overview must not wait for each individual database read');
  const rows=[
    [{contacts:2,appointments:1,projects:3,experience:3,unread_contacts:1,pending_requests:1}],
    [{lead_status:'new',total:3}],
    [{day:'2026-11-04',total:3}],
    [{id:1,name:'Contact',is_read:0}],
    [{id:2,request_data:'{"service":"Website"}',status:'pending'}],
    [{id:3,technologies:'["Next.js"]',gallery:'[]',is_featured:1}],
    [{id:4,company:'Studio',is_current:1}]
  ];
  pending.forEach(({resolve},i)=>resolve(rows[i]));
  const stats=await result;
  assert.equal(stats.counts.unread_contacts,1);assert.equal(stats.counts.appointments,1);
  assert.equal(stats.recentRequests[0].request_data.service,'Website');
  assert.deepEqual(stats.recentProjects[0].technologies,['Next.js']);
  assert.equal(stats.recentProjects[0].is_featured,true);assert.equal(stats.recentExperience[0].is_current,true);
  assert.equal(stats.recentContacts[0].name,'Contact');assert.deepEqual(stats.pipeline,rows[1]);assert.deepEqual(stats.activity,rows[2]);
});
