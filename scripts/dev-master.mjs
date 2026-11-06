import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const cli=fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url));
console.log('Local master dashboard: http://localhost:3001');
console.log('Existing website account. Portfolio changes are read-only locally. No live deployment.');
const child=spawn(process.execPath,[cli,'dev','--webpack','--hostname','127.0.0.1','--port','3001'],{
  stdio:'inherit',env:{...process.env,MASTER_DASHBOARD_LOCAL:'1',APP_ORIGIN:'http://localhost:3001',MIGRATION_READ_ONLY:'1'}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??1;});
