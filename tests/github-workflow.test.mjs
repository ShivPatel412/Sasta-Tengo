import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const w=JSON.parse(readFileSync(new URL('../control-room/github-automation/workflow.json',import.meta.url)));
const node=name=>w.nodes.find(n=>n.name===name);
test('GitHub draft workflow uses credentials and never disguises preview covers as AI artwork',()=>{
 const config=new Function(node('Configuration').parameters.jsCode)()[0].json;
 assert.equal(config.generateCover,false);assert.equal(config.captureScreenshots,false);assert.equal(w.active,false);
 for(const name of ['Read existing dashboard projects','Upload cover to website','Upload screenshot to website','Upload project to dashboard'])assert.equal(node(name).credentials.httpHeaderAuth.id,'ShivGithubWebsite01');
 const repo={repository:'ShivPatel412/Sasta-Tengo',name:'Sasta-Tengo',title:'Sasta Tengo',description:'Repository metadata',revision:'a'.repeat(64),generated_at:new Date().toISOString(),live_url:'https://www.shivpatel.in/'};
 const preview=new Function('$json',node('Use repository preview').parameters.jsCode)(repo).json;
 assert.equal(preview.cover_status,'unavailable');assert(preview.warnings.length);assert(preview.poster.startsWith('https://opengraph.githubassets.com/'));
 assert.throws(()=>new Function('$json',node('Use repository preview').parameters.jsCode)({...repo,repository:'OtherOwner/repo'}),/Invalid repository/);
 const payload=new Function('$json','$',node('Build draft without live screenshot').parameters.jsCode)(preview,()=>({first:()=>({json:{config:{...config,category:'Web Development'}}})})).json;
 assert.equal(payload.provenance.cover_status,'unavailable');assert.equal(payload.provenance.screenshot_url,null);assert.equal(payload.project.gallery.length,0);assert.equal(payload.provenance.warnings.length,2);
});
