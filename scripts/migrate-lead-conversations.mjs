import {readFile} from 'node:fs/promises';
import {database,query} from '../lib/db.mjs';
try{
  const sql=await readFile(new URL('./007-lead-conversations.sql',import.meta.url),'utf8');
  await query(sql.trim().replace(/;$/,''));
  console.log('Lead conversation table ready. Existing leads were not changed.');
}catch(error){console.error('Lead conversation migration failed:',error.code||error.name);process.exitCode=1;}
finally{await database().end();}
