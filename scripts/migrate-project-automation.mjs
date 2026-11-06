import { readFile } from 'node:fs/promises';
import { database, query } from '../lib/db.mjs';

try {
  const before=await query('SELECT (SELECT COUNT(*) FROM projects) projects,(SELECT COUNT(*) FROM contacts) contacts,(SELECT COUNT(*) FROM appointments) appointments,(SELECT COUNT(*) FROM users) users');
  const sql=await readFile(new URL('./003-project-automation.sql',import.meta.url),'utf8');
  await query(sql.replace(/^\s*--.*$/gm,''));
  const after=await query('SELECT (SELECT COUNT(*) FROM projects) projects,(SELECT COUNT(*) FROM contacts) contacts,(SELECT COUNT(*) FROM appointments) appointments,(SELECT COUNT(*) FROM users) users');
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Counts changed during migration; inspect concurrent activity.');
  console.log('Added project draft storage. Existing project, form and account counts unchanged.');
} catch(error) {
  console.error('Draft migration failed:',error.code||error.message);
  process.exitCode=1;
} finally {await database().end();}
