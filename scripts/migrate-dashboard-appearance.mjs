import {readFile} from 'node:fs/promises';
import {database} from '../lib/db.mjs';
let pool;
try{
  pool=database();
  const sql=await readFile(new URL('./002-dashboard-appearance.sql',import.meta.url),'utf8');
  await pool.query(sql.replace(/^\s*--.*$/gm,''));
  console.log('Dashboard appearance table is ready. Existing website records were not changed.');
}catch{
  console.error('Appearance migration failed. Check database configuration and CREATE permission privately.');process.exitCode=1;
}finally{await pool?.end();}
