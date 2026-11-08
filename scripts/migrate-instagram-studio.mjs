import {readFile} from 'node:fs/promises';
import {database,query} from '../lib/db.mjs';
if(process.env.STUDIO_ALLOW_MIGRATION!=='1')throw Error('Set STUDIO_ALLOW_MIGRATION=1 after verifying the intended database.');
try{
 const sql=await readFile(new URL('./005-instagram-studio.sql',import.meta.url),'utf8');
 for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await query(statement);
 console.log('Instagram Studio additive tables ready. Existing records were not modified.');
}finally{await database().end();}
