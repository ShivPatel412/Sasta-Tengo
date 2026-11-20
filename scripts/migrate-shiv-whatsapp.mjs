import {readFile} from 'node:fs/promises';
import {database,query} from '../lib/db.mjs';

// Explicit opt-in migration; never run as part of a build, deploy, or request.
// Apply against staging first, then use the same reviewed SQL in production.
if(process.env.SHIV_WHATSAPP_ALLOW_MIGRATION!=='1'){
 console.error('Set SHIV_WHATSAPP_ALLOW_MIGRATION=1 to authorize this migration.');
 process.exit(2);
}
if(process.env.MIGRATION_READ_ONLY!=='0'){
 console.error('Database is in review mode. Migration aborted.');
 process.exit(2);
}
try{
 const sql=await readFile(new URL('./012-shiv-whatsapp-leads.sql',import.meta.url),'utf8');
 const statements=sql.split(';').map(part=>part.trim().replace(/^--.*$/gm,'').trim()).filter(Boolean);
 if(statements.length!==2||statements.some(statement=>!/^CREATE TABLE IF NOT EXISTS shiv_whatsapp_(message_claims|leads)\b/i.test(statement))){
  throw new Error('Unexpected SQL migration content; refusing to run.');
 }
 for(const statement of statements)await query(statement);
 console.log('SHIV OS WhatsApp tables ready; existing tables and data preserved.');
}catch(error){
 console.error('WhatsApp migration failed:',error.code||error.name);
 process.exitCode=1;
}finally{
 try{await database().end();}catch{}
}
