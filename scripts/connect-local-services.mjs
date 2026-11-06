import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const envPath=resolve('.env.local');
const snapshot=String.raw`\\wsl.localhost\Ubuntu\var\lib\shiv-control\snapshot.json`;
const data=JSON.parse(await readFile(snapshot,'utf8'));
if(!Array.isArray(data.n8n?.workflows))throw new Error('The existing collector snapshot is invalid.');
const photo=JSON.parse(execFileSync('wsl',['-d','Ubuntu','-u','root','--','cat','/var/lib/shiv-control/photo-automation.json'],{encoding:'utf8',windowsHide:true}));
if(typeof photo.token!=='string'||photo.token.length<32)throw new Error('Photo worker credential is unavailable.');
let env=await readFile(envPath,'utf8');
await mkdir('.local/backups',{recursive:true});
await copyFile(envPath,resolve('.local/backups/env-before-services-'+Date.now()));
for(const [key,value] of Object.entries({CONTROL_ROOM_SNAPSHOT_PATH:snapshot,PHOTO_WORKER_TOKEN:photo.token})){
  const line=key+'='+value;
  env=new RegExp('^'+key+'=.*$','m').test(env)?env.replace(new RegExp('^'+key+'=.*$','m'),()=>line):env.trimEnd()+'\n'+line+'\n';
}
await writeFile(envPath,env);
console.log('Connected the existing collector and photo worker privately. No live service or credential was changed.');
console.log('Workflows in current collector snapshot:',data.n8n.workflows.length);
