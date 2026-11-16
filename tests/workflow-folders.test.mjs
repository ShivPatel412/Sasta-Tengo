import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowFolderView} from '../lib/workflow-folders.mjs';
const folders=[{id:'sasta',name:'Sasta Tengo',parent_id:null},{id:'git',name:'GitHub',parent_id:'sasta'},{id:'bugle',name:'Bugle',parent_id:null},{id:'client',name:'Clients',parent_id:'bugle'},{id:'deep',name:'Dental',parent_id:'client'}];
const workflows=[{id:'root',name:'Unfiled workflow',folder_id:null},{id:'sync',name:'Hourly sync',folder_id:'git'},{id:'photo',name:'Photo selection',folder_id:'sasta'},{id:'seo',name:'SEO collector',folder_id:'deep'}];
test('folder browser shows direct children, recursive totals and root workflows without mixing branches',()=>{
 const root=workflowFolderView(workflows,folders);
 assert.deepEqual(root.folders.map(f=>[f.id,f.workflow_count,f.folder_count]),[['bugle',1,1],['sasta',2,1]]);
 assert.deepEqual(root.workflows.map(w=>w.id),['root']);
 const sasta=workflowFolderView(workflows,folders,'sasta');
 assert.deepEqual(sasta.folders.map(f=>f.id),['git']);assert.deepEqual(sasta.workflows.map(w=>w.id),['photo']);
 assert.deepEqual(workflowFolderView(workflows,folders,'deep').trail.map(f=>f.name),['Bugle','Clients','Dental']);
});
test('search finds workflows across nested folders and exposes the actual folder path',()=>{
 const name=workflowFolderView(workflows,folders,'sasta','seo');assert.equal(name.workflows[0].id,'seo');assert.equal(name.workflows[0].folder_path,'Bugle / Clients / Dental');
 assert.deepEqual(workflowFolderView(workflows,folders,null,'GitHub').workflows.map(w=>w.id),['sync']);
 assert.equal(workflowFolderView(workflows,folders,null,'missing').workflows.length,0);
});
test('removed folders and malformed folder cycles do not hide root access or loop forever',()=>{
 assert.equal(workflowFolderView(workflows,folders,'removed').current,null);
 assert.deepEqual(workflowFolderView([{id:'orphan',name:'Retained',folder_id:'removed'}],folders).workflows.map(w=>w.id),['orphan']);
 assert.equal(workflowFolderView([], [{id:'a',name:'Cycle',parent_id:'a'}],'a').trail.length,1);
});
