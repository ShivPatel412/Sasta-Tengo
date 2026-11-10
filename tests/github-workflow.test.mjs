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
test('GitHub homepage validation works in n8n without the browser URL global',()=>{
 const config=new Function(node('Configuration').parameters.jsCode)()[0].json;
 config.liveUrls={};
 const run=homepage=>new Function('$','$input','URL',node('Prepare repository metadata').parameters.jsCode)(name=>({first:()=>({json:name==='Resolve website settings'?{config,existingProjects:[]}:{data:[]}})}),{all:()=>[{json:{id:1,name:'Sasta-Tengo',full_name:'ShivPatel412/Sasta-Tengo',owner:{login:'ShivPatel412'},size:1,homepage}}]},undefined);
 assert.equal(run('https://www.shivpatel.in/')[0].json.live_url,'https://www.shivpatel.in/');
 for(const url of ['http://example.com','https://user:password@example.com','https://127.0.0.1/','https://example.local/','https://example.com:5678/','https://example..com/','https://example.com\\@localhost/'])assert.throws(()=>run(url),/homepage|public HTTPS/);
});
