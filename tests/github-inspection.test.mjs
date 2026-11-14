import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectedDetails,inspectGithub} from '../lib/github-inspection.mjs';

test('repository evidence identifies real PHP/database technologies beyond GitHub primary language',()=>{
 const result=inspectedDetails({name:'Library-Management-System',languages:{HTML:100},paths:['Admin/Book/add_book.php','Admin/Book/issue_book.php','User/user_dashboard.php','bootstrap-4.4.1/css/bootstrap.css'],sources:[{path:'Admin/Book/add_book.php',text:'mysqli_query($connection, $query);'}]});
 for(const technology of ['HTML','PHP','MySQL','Bootstrap'])assert(result.technologies.includes(technology));
 assert(result.description.includes('Book issuing, returns'));assert(result.description.includes('Member accounts'));assert(!result.description.includes('Source repository for'));
});

test('manifests and notebook imports enrich stacks without executing repository code',()=>{
 const web=inspectedDetails({name:'App',paths:['package.json','src/analytics.js'],sources:[{path:'package.json',text:JSON.stringify({dependencies:{next:'1',react:'1',mysql2:'1'}})}]});
 assert.deepEqual(web.technologies,['Next.js','React','MySQL','Node.js']);
 const video=inspectedDetails({name:'Video',paths:['video_summary.ipynb'],sources:[{path:'video_summary.ipynb',text:'import tensorflow as tf\nimport mediapipe as mp\nimport cv2\nimport numpy as np\ntf.keras.models.load_model(path)'}]});
 for(const name of ['Python','Jupyter Notebook','TensorFlow','Keras','MediaPipe','OpenCV','NumPy'])assert(video.technologies.includes(name));
 assert(video.description.includes('Action-based video analysis'));
});

test('inspection bounds source reads, omits private/backup files and respects the public branch',async()=>{
 const calls=[];
 const result=await inspectGithub('https://github.com/octocat/example',async(url,options)=>{
  calls.push(url);assert.equal(options.redirect,'error');
  if(url.endsWith('/example'))return Response.json({name:'example',default_branch:'main',private:false});
  if(url.endsWith('/languages'))return Response.json({JavaScript:100});
  if(url.endsWith('/readme'))return new Response('# Example\nA small application.');
  if(url.includes('/git/trees/'))return Response.json({tree:[{type:'blob',path:'package.json',size:50},{type:'blob',path:'backups/customer-data.js',size:50},{type:'blob',path:'.env.local',size:50},{type:'blob',path:'server.js',size:50}]});
  if(url.endsWith('/main/package.json'))return new Response('{"dependencies":{"express":"1"}}');
  if(url.endsWith('/main/server.js'))return new Response('app.get("/", handler)');
  throw new Error('Unexpected source read');
 });
 assert(result.project.technologies.includes('Express'));assert.equal(result.evidence.files.length,2);
 assert(!calls.some(url=>url.includes('customer-data')||url.includes('.env.local')));
 await assert.rejects(inspectGithub('https://github.com/octocat/example',async()=>Response.json({name:'example',default_branch:'main',private:true})),/Only public/);
});
