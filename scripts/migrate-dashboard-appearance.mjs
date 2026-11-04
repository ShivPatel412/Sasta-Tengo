import {readFile} from 'node:fs/promises';
import {database} from '../lib/db.mjs';
let pool;
try{
  pool=database();
  const sql=await readFile(new URL('./002-dashboard-appearance.sql',import.meta.url),'utf8');
  await pool.query(sql.replace(/^\s*--.*$/gm,''));
  const [columns]=await pool.query('SHOW COLUMNS FROM next_dashboard_preferences');
  const definitions={font_style:"VARCHAR(16) NOT NULL DEFAULT 'system'",text_size:'TINYINT UNSIGNED NOT NULL DEFAULT 14',heading_size:'TINYINT UNSIGNED NOT NULL DEFAULT 35'};
  for(const [name,definition] of Object.entries(definitions)){
    if(!columns.some(column=>column.Field===name))await pool.query(`ALTER TABLE next_dashboard_preferences ADD COLUMN \`${name}\` ${definition}`);
  }
  console.log('Dashboard appearance and typography fields are ready. Existing colors and website content were preserved.');
}catch{
  console.error('Appearance migration failed. Check database configuration and CREATE permission privately.');process.exitCode=1;
}finally{await pool?.end();}
