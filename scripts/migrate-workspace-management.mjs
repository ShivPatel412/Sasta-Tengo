import {readFile} from 'node:fs/promises';
import {database,query} from '../lib/db.mjs';
try{
  const sql=await readFile(new URL('./006-workspace-management.sql',import.meta.url),'utf8');
  for(const statement of sql.replace(/^\s*--.*$/gm,'').split(';').map(value=>value.trim()).filter(Boolean))await query(statement);
  console.log('Workspace task and execution tables ready. Existing records were not changed.');
}catch(error){console.error('Workspace migration failed:',error.code||error.name);process.exitCode=1;}
finally{await database().end();}
