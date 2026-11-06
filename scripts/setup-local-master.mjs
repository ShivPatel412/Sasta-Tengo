import mysql from 'mysql2/promise';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {database,query} from '../lib/db.mjs';

const config=JSON.parse(await readFile('.local/mysql-config.json','utf8'));
const local=await mysql.createConnection({host:'127.0.0.1',port:3307,user:config.user,password:config.password,database:config.database,multipleStatements:false,dateStrings:true});
const tables=['users','services','project_types','projects','contacts','appointments','experience','education','next_booking_mutex','next_dashboard_preferences','next_mail_outbox','next_rate_limits','next_sessions'];
const source=await database().getConnection();
try{
  const [existing]=await local.query('SHOW TABLES');
  if(existing.length)throw new Error('Local database already contains tables. This setup will not overwrite them.');
  await source.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  for(const table of tables){
    const [definition]=await source.query(`SHOW CREATE TABLE \`${table}\``);
    await local.query(definition[0]['Create Table']);
    if(['next_sessions','next_rate_limits','next_mail_outbox','next_booking_mutex'].includes(table))continue;
    const [rows]=await source.query(`SELECT * FROM \`${table}\``);
    if(rows.length>100000)throw new Error('Unexpectedly large source table; review before copying.');
    for(const row of rows){
      const keys=Object.keys(row),values=Object.values(row).map(v=>v!==null&&typeof v==='object'&&!Buffer.isBuffer(v)?JSON.stringify(v):v);
      await local.execute(`INSERT INTO \`${table}\` (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,values);
    }
    console.log('Copied local '+table+': '+rows.length+' records.');
  }
  await source.rollback();
  await local.query((await readFile('scripts/003-project-automation.sql','utf8')).replace(/^\s*--.*$/gm,''));
  const key=randomBytes(48).toString('base64url'),workerToken=randomBytes(48).toString('base64url'),geminiToken=randomBytes(48).toString('base64url');
  await mkdir('.local/project-worker',{recursive:true});
  const worker={token:workerToken,portfolio_key:key,portfolio_origin:'http://127.0.0.1:3001',github_owner:'ShivPatel412',github_token:'',gemini_webhook:'http://127.0.0.1:5678/webhook/shiv-project-gemini',gemini_token:geminiToken,text_model:'',image_model:'',category:'Web Development',screenshot_hosts:['shivpatel.in','www.shivpatel.in'],exclude_repositories:[],max_per_scan:1,schedule_enabled:false,interval_seconds:3600,auto_publish:false};
  await writeFile('.local/project-worker/config.json',JSON.stringify(worker,null,2));
  const env={DB_HOST:'127.0.0.1',DB_PORT:'3307',DB_NAME:config.database,DB_USER:config.user,DB_PASSWORD:config.password,DB_SSL:'false',APP_ORIGIN:'http://localhost:3001',MIGRATION_READ_ONLY:'0',PROJECT_AUTOMATION_KEY:key,PROJECT_AUTOMATION_AUTO_PUBLISH:'0',PROJECT_GITHUB_OWNER:worker.github_owner,PROJECT_WORKER_TOKEN:workerToken,CONTROL_ROOM_SNAPSHOT_PATH:String.raw`\\wsl.localhost\Ubuntu\var\lib\shiv-control\snapshot.json`};
  await writeFile('.env.master.local',Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n');
  console.log('Local master configuration saved privately. Live database records were only read; active sessions and mail jobs were not copied.');
}finally{source.release();await local.end();await database().end();}
