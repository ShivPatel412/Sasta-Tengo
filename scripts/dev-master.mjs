import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import {resolve} from 'node:path';

const isolated=existsSync('.env.master.local');
if(isolated){
  loadEnvFile('.env.master.local');
  if(process.env.DB_HOST!=='127.0.0.1'||process.env.DB_PORT!=='3307'||process.env.DB_NAME!=='shiv_master_local')throw new Error('The editable local master must use its isolated local database.');
}

const cli=fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url));
const python=resolve('.local/project-worker-venv/Scripts/python.exe');
const worker=isolated&&existsSync(python)?spawn(python,['control-room/project-worker/worker.py'],{stdio:'inherit',windowsHide:true,env:{...process.env,PROJECT_CONFIG:resolve('.local/project-worker/config.json'),PROJECT_STATE:resolve('.local/project-worker/data'),PLAYWRIGHT_BROWSERS_PATH:resolve('.local/browsers'),PYTHONUTF8:'1'}}):null;
console.log('Local master dashboard: http://localhost:3001');
console.log(isolated?'Isolated local database. Publishing changes only the local portfolio copy.':'Existing website account. Portfolio changes are read-only locally. No live deployment.');
const child=spawn(process.execPath,[cli,'dev','--webpack','--hostname','127.0.0.1','--port','3001'],{
  stdio:'inherit',env:{...process.env,MASTER_DASHBOARD_LOCAL:'1',APP_ORIGIN:'http://localhost:3001',MIGRATION_READ_ONLY:isolated?'0':'1'}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{worker?.kill(signal);child.kill(signal);});
child.on('exit',code=>{worker?.kill();process.exitCode=code??1;});
