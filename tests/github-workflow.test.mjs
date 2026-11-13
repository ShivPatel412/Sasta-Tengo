import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const w=JSON.parse(readFileSync(new URL('../control-room/github-automation/workflow.json',import.meta.url)));
const node=name=>w.nodes.find(n=>n.name===name);

test('media recovery preserves the saved revision and skips completed pending drafts',()=>{
 const config={generateCover:true,captureScreenshots:true,maxProjectsPerRun:20};
 const project={title:'Edited',description:'Edited description',live_url:'https://example.com',category:'Edited category',poster:'https://media.example/cover.jpg',gallery:[]};
 const base={repository:'ShivPatel412/Sasta-Tengo',revision:'a'.repeat(64),status:'pending',cover_status:'generated',project,provenance:{cover_status:'generated',screenshot_url:null,captured_at:null}};
 const run=row=>new Function('$','$input',node('Only changed projects').parameters.jsCode)(name=>({first:()=>({json:name==='Resolve website settings'?{config}:{data:[row]}})}),{all:()=>[{json:{repository:base.repository,revision:'b'.repeat(64),live_url:'https://new.example'}}]});
 const result=run(base)[0].json;
 assert.equal(result.revision,base.revision);assert.equal(result.recovery,true);assert.equal(result.savedProject,project);assert.equal(result.live_url,project.live_url);
 assert.equal(run({...base,project:{...project,gallery:['https://media.example/screen.jpg']},provenance:{...base.provenance,screenshot_url:project.live_url,captured_at:'2026-11-13T00:00:00Z'}}).length,0);
 assert.equal(run({...base,project:{...project,live_url:null}}).length,0);
 assert.throws(()=>run({...base,project:{...project,live_url:'https://127.0.0.1'}}),/public HTTPS/);
 assert.throws(()=>run({...base,project:undefined}),/Deploy the media recovery API/);
 config.generateCover=false;config.captureScreenshots=false;
 assert.equal(run({...base,cover_status:'unavailable'}).length,0);
 assert.equal(run({...base,status:'rejected',revision:'b'.repeat(64)}).length,0);
});

test('screenshot retries reuse covers, checkpoint first, and retain manual approval',()=>{
 const config={generateCover:true,captureScreenshots:true,imageModel:'configured',category:'web'};
 const savedProject={title:'Edited title',description:'Edited description',technologies:['Edited'],category:'Edited category',live_url:'https://example.com',poster:'https://media.example/kept.jpg',gallery:['https://media.example/manual.jpg'],is_featured:true,order:4,github_url:'https://github.com/ShivPatel412/Sasta-Tengo'};
 const repo={repository:'ShivPatel412/Sasta-Tengo',revision:'a'.repeat(64),generated_at:'2026-11-13T00:00:00Z',recovery:true,savedProject,savedProvenance:{cover_status:'generated',warnings:[],image_model:'original',generated_at:'2026-11-12T00:00:00Z',text_model:'original'}};
 const reused=new Function('$json',node('Use repository preview').parameters.jsCode)(repo).json;
 assert.equal(reused.poster,savedProject.poster);assert.equal(reused.cover_status,'generated');
 const draft=new Function('$json','$',node('Build draft without live screenshot').parameters.jsCode)(reused,()=>({first:()=>({json:{config}})})).json;
 assert.deepEqual(draft.project,savedProject);assert.equal(draft.manual_approval,true);assert.equal(draft.recovery,true);assert.equal(draft.provenance.image_model,'original');
 const screenshot=new Function('$json','$',node('Build project with screenshot').parameters.jsCode)({url:'https://media.example/new.jpg'},name=>({item:{json:name==='Build draft without live screenshot'?draft:{captured_at:'2026-11-13T00:00:00Z'}}})).json;
 assert.deepEqual(screenshot.project.gallery,['https://media.example/new.jpg']);assert.equal(screenshot.manual_approval,true);assert.equal(screenshot.project.title,'Edited title');
 assert.equal(w.connections['Use repository preview'].main[0][0].node,'Build draft without live screenshot');
 assert.equal(w.connections['Build draft without live screenshot'].main[0][0].node,'Upload project to dashboard');
 assert.equal(w.connections['Confirm dashboard upload'].main[0][0].node,'Has a live website');
 for(const name of ['Generate Gemini cover','Capture real website screenshot','Validate screenshot file','Save screenshot to draft']){
   assert.equal(node(name).onError,'continueErrorOutput');assert.equal(w.connections[name].main[1][0].node,'Record media retry');
 }
 assert.equal(w.connections['Record media retry'].main[0][0].node,'One project at a time');
 for(const n of w.nodes.filter(n=>n.type==='n8n-nodes-base.code'))new (Object.getPrototypeOf(async function(){}).constructor)(n.parameters.jsCode);
});

test('media switches do not change repository revisions',()=>{
 const config=new Function(node('Configuration').parameters.jsCode)()[0].json;
 const repo={id:1,name:'Sasta-Tengo',full_name:'ShivPatel412/Sasta-Tengo',owner:{login:'ShivPatel412'},size:1,homepage:null};
 const run=()=>new Function('$','$input',node('Prepare repository metadata').parameters.jsCode)(name=>({first:()=>({json:name==='Resolve website settings'?{config,existingProjects:[]}:{data:[]}})}),{all:()=>[{json:repo}]})[0].json.revision_input;
 const before=run();config.generateCover=true;config.captureScreenshots=true;
 assert.equal(run(),before);
});
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
