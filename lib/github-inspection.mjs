import {githubRepository,limitedText,readmeText} from './github-import.mjs';
import {HttpError} from './db.mjs';

const packages={'next':'Next.js','react':'React','express':'Express','mysql2':'MySQL','better-sqlite3':'SQLite','nodemailer':'Nodemailer','zod':'Zod','@vercel/blob':'Vercel Blob','bcryptjs':'bcrypt','express-session':'Express sessions'};
const features=[
 [/availability|appointmentservice|appointments|reschedul/i,'Appointment scheduling, availability checks and booking management'],
 [/workinghours|scheduleexception/i,'Working hours, breaks and schedule exceptions'],
 [/notificationservice|mailprovider/i,'Email notifications and delivery tracking'],
 [/add_book|book\/|catalog/i,'Book catalog management and searchable records: maintain the library collection and find the information needed for daily administration.'],
 [/issue_book|issued_book|return_book/i,'Book issuing, returns and lending records: track circulation through dedicated lending workflows rather than separate manual lists.'],
 [/member|user_dashboard/i,'Member accounts and self-service dashboards: keep personal account details and library access in a dedicated user workspace.'],
 [/addrooms|searchroom|updateroom/i,'Room inventory, availability search and room updates: help reception staff find rooms and maintain their current condition and availability.'],
 [/addcustomer|checkin|checkout|updatecheck/i,'Guest registration, check-in and check-out workflows: connect guest records to the operational steps of a hotel stay.'],
 [/employeeinfo|addemployee|managerinfo|pickup/i,'Employee, manager and transport records: provide separate administration screens for the people and services supporting the hotel.'],
 [/builder|template\.js|invitation/i,'Personalized invitations, themes and interactive recipient journeys'],
 [/analytics/i,'First-party interaction analytics and response tracking'],
 [/auth|login|session/i,'Account sign-in and session-based access'],
 [/project-automation|github-import/i,'GitHub project imports and portfolio publishing automation'],
 [/booking|request-form|appointments/i,'Service inquiries and project request forms'],
 [/portfoliofinder|project-approvals/i,'A searchable portfolio and project management workspace'],
 [/video_summary/i,'Action-based video analysis and generation of selected highlight clips']
];

export function inspectedDetails({name,description='',languages={},readme='',paths=[],sources=[]}){
 const code=sources.map(s=>s.text).join('\n'), names=paths.join('\n');
 const extensions={JavaScript:/\.[cm]?jsx?$/m,TypeScript:/\.tsx?$/m,PHP:/\.php$/m,Java:/\.java$/m,Python:/\.(py|ipynb)$/m,HTML:/\.(html?|php)$/m,CSS:/\.css$/m,SCSS:/\.scss$/m,Ruby:/\.rb$/m,Shell:/\.sh$/m,PowerShell:/\.ps1$/m,Swift:/\.swift$/m,Kotlin:/\.kt$/m,Go:/\.go$/m,Rust:/\.rs$/m};
 const technologies=new Set(Object.keys(languages).filter(n=>extensions[n]?.test(names)));
 for(const source of sources){
  if(/(^|\/)package\.json$/.test(source.path)){
   try{const json=JSON.parse(source.text);for(const dependency of Object.keys({...json.dependencies,...json.devDependencies}))if(packages[dependency])technologies.add(packages[dependency]);technologies.add('Node.js');}catch{}
  }
 }
 const add=(test,label)=>{if(test)technologies.add(label);};
 add(/\.php$/m.test(names),'PHP');add(/mysqli_|mysql2|jdbc:mysql|\$wpdb|ENGINE=InnoDB/i.test(code)||/mysql/i.test(names),'MySQL');
 add(/Plugin Name:|\bregister_rest_route\b|\bwp\.element\b/.test(code),'WordPress');
 add(/wp\.element|@wordpress\/element/.test(code),'React');
 add(/bootstrap/i.test(names+'\n'+code),'Bootstrap');add(/jquery|jQuery|\$\.ajax/.test(code),'jQuery');add(/<script\b|jQuery|wp\.element/.test(code),'JavaScript');
 add(/\.java$/m.test(names),'Java');add(/javax\.swing/.test(code),'Java Swing');add(/java\.awt/.test(code),'Java AWT');add(/java\.sql/.test(code),'JDBC');
 add(/(^|\/)nbproject\//m.test(names),'NetBeans');add(/(^|\/)build\.xml$/m.test(names),'Apache Ant');
 add(/\.ipynb$/m.test(names),'Python');add(/\.ipynb$/m.test(names),'Jupyter Notebook');
 for(const [pattern,label] of [[/\b(?:import|from)\s+tensorflow/,'TensorFlow'],[/\bkeras\b/,'Keras'],[/\b(?:import|from)\s+mediapipe/,'MediaPipe'],[/\bimport\s+cv2/,'OpenCV'],[/\b(?:import|from)\s+numpy/,'NumPy'],[/\b(?:import|from)\s+pandas/,'pandas']])add(pattern.test(code),label);
 const capabilities=features.filter(([test])=>test.test(names)).map(([,label])=>label);
 if(/extract_keypoints/.test(code)&&/mediapipe/.test(code))capabilities.push('Pose and hand landmark extraction: convert visible body, face and hand positions into numerical keypoints for action analysis.');
 if(/model_1\.predict/.test(code)&&/sequence\[-30:/.test(code))capabilities.push('Sequence-based action classification: evaluate a moving window of 30 frames and select footage matching the requested action.');
 if(/VideoWriter/.test(code)&&/compareHist/.test(code))capabilities.push('Video summary export and frame comparison: write selected footage to video and compare frame histograms to identify visual differences.');
 const stack=[...technologies].slice(0,30);
 const kind=technologies.has('WordPress')?'WordPress plugin':technologies.has('Java Swing')?'Java desktop application':technologies.has('Jupyter Notebook')?'Python video-analysis project':'web application';
 const title=name.replace(/[-_]+/g,' ');
 const overview=readme.split(/^##\s+(?:installation|development|getting started|setup|configuration|running|local development|technology stack)\b/im)[0];
 const operational=/migration candidate|production cutover|LOCAL_PREVIEW|MIGRATION_READ_ONLY/i.test(readme);
 const paragraph=operational?null:readmeText(overview).split(/\n\n/).find(p=>p.length>70&&!p.includes('\n')&&!/^Repository:|^https?:/i.test(p));
 const purpose=capabilities[0]?capabilities[0][0].toLowerCase()+capabilities[0].split(':')[0].slice(1):null;
 const portfolio=/portfoliofinder/i.test(names);
 const summary=description.trim()||paragraph||(portfolio?`${title} is a full-stack developer portfolio and project management workspace.`:`${title} is a ${kind}${purpose?' for '+purpose:' built with '+(stack.slice(0,4).join(', ')||'the technologies in its source repository')}.`);
 const rawNotes=operational?'':readmeText(overview).split(/\n/).filter(line=>line.trim()&&!/^#|^https?:|^Repository:/i.test(line)).join('\n');
 const notes=rawNotes.length>2200?rawNotes.slice(0,2200).replace(/\n[^\n]*$/,''):rawNotes;
 return {description:[summary,capabilities.length?'Features\n'+capabilities.map(f=>'• '+f).join('\n'):null,stack.length?'Technology stack\n'+stack.join(', '):null,notes.length>80?'Project details\n'+notes:null].filter(Boolean).join('\n\n').slice(0,10000),technologies:stack};
}

export async function inspectGithub(value,fetcher=fetch){
 const repo=githubRepository(value),base=`https://api.github.com/repos/${repo.owner}/${encodeURIComponent(repo.repository)}`;
 const headers={Accept:'application/vnd.github+json','User-Agent':'Shiv-Portfolio-Inspection',...(process.env.GITHUB_TOKEN?{Authorization:'Bearer '+process.env.GITHUB_TOKEN}:{})};
 async function get(path,{raw=false,limit=256000,optional=false}={}){
  const response=await fetcher(base+path,{headers:{...headers,...(raw?{Accept:'application/vnd.github.raw+json'}:{})},redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(optional&&response.status===404)return raw?'':null;
  if(!response.ok)throw new HttpError(503,'Repository inspection failed. Check GitHub availability and API rate limits.');
  const text=await limitedText(response,limit);return raw?text:JSON.parse(text);
 }
 const metadata=await get('');
 if(metadata.private||!metadata.default_branch)throw new HttpError(422,'Only public repositories can be inspected.');
 const branch=encodeURIComponent(metadata.default_branch);
 const [languages,readme,tree]=await Promise.all([get('/languages'),get('/readme',{raw:true,limit:100000,optional:true}),get('/git/trees/'+branch+'?recursive=1',{limit:1500000})]);
 if(tree.truncated)throw new HttpError(503,'Repository tree was truncated; inspection could not complete.');
 const files=(tree.tree||[]).filter(f=>f.type==='blob'&&!/(^|\/)(node_modules|vendor|backups?|private|\.git|dist|build|\.next|bootstrap[^/]*)(\/|$)/i.test(f.path)&&!/(^|\/)(\.env[^/]*|.*(?:secret|credentials|password|token|lock)[^/]*)$/i.test(f.path));
 const paths=files.map(f=>f.path);
 const score=path=>/(^|\/)package\.json$/.test(path)?0:/video_summary\.ipynb$/.test(path)?1:/Plugin\.php$|plugin\.php$|admin\.js$|[Dd]atabase\.(php|js)$|conn\.java$/.test(path)?2:/\.(php|java|py|[cm]?js|jsx|ts|tsx)$/.test(path)?3:9;
 const selected=files.filter(f=>f.size<=100000&&score(f.path)<9).sort((a,b)=>score(a.path)-score(b.path)||a.path.localeCompare(b.path)).slice(0,8);
 const sources=await Promise.all(selected.map(async file=>{
  const url=`https://raw.githubusercontent.com/${repo.owner}/${encodeURIComponent(repo.repository)}/${branch}/${file.path.split('/').map(encodeURIComponent).join('/')}`;
  const response=await fetcher(url,{headers:{'User-Agent':'Shiv-Portfolio-Inspection'},redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok)throw new HttpError(503,'A repository source file could not be inspected.');
  let text=await limitedText(response,100000);
  if(file.path.endsWith('.ipynb')){const notebook=JSON.parse(text);text=(notebook.cells||[]).filter(c=>c.cell_type==='code').map(c=>Array.isArray(c.source)?c.source.join(''):c.source||'').join('\n');}
  return {path:file.path,text};
 }));
 return {project:inspectedDetails({name:metadata.name,description:metadata.description||'',languages,readme,paths,sources}),evidence:{branch:metadata.default_branch,files:sources.map(s=>s.path),languages:Object.keys(languages)},text_model:'github-repository-inspection-v1'};
}
