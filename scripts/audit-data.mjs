import { createHash } from 'node:crypto';
import { database, query } from '../lib/db.mjs';
// Read-only: write counts/hashes to stdout, never customer records or credentials.
const expected = {
  users: ['id','name','email','password'],
  services: ['id','title','description','price','duration','icon','is_active'],
  projects: ['id','title','description','image','poster','gallery','technologies','github_url','live_url','category','is_featured','order'],
  project_types: ['id','name','category'],
  contacts: ['id','name','email','phone','subject','message','is_read','lead_status','admin_notes'],
  appointments: ['id','service_id','client_name','client_email','client_phone','appointment_date','notes','request_data','status','lead_status','admin_notes'],
  experience: ['id','title','company','logo','website','location','start_date','end_date','is_current','description','summary','highlights','technologies','order'],
  education: ['id','degree','institution','field_of_study','start_year','end_year','is_current','description','gpa','order']
};
let connection, pool;
try {
  pool = database();
  connection = await pool.getConnection();
  await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ', [], connection);
  // MariaDB does not support preparing this transaction-control statement.
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  const report = { generatedAt: new Date().toISOString(), tables: {} };
  for (const [table,fields] of Object.entries(expected)) {
    const columns = (await query(`SHOW COLUMNS FROM \`${table}\``, [], connection)).map(c => c.Field);
    const missing = fields.filter(f => !columns.includes(f));
    if (missing.length) throw new Error(`Schema mismatch in ${table}: ${missing.join(', ')}`);
    const digest = createHash('sha256'); let after = '0'; let count = 0;
    while (true) {
      const rows = await query(`SELECT * FROM \`${table}\` WHERE id>? ORDER BY id LIMIT 500`, [after], connection);
      if (!rows.length) break;
      for (const row of rows) {
        const stable = Object.fromEntries(Object.entries(row).sort(([a],[b]) => a.localeCompare(b)));
        digest.update(JSON.stringify(stable) + '\n'); count++;
      }
      after = rows.at(-1).id;
    }
    report.tables[table] = { count, lastId: after, sha256: digest.digest('hex'), columns };
  }
  await connection.rollback();
  console.log(JSON.stringify(report,null,2));
} catch (error) {
  console.error(error.message.startsWith('Schema mismatch') ? error.message : 'Data audit failed. Check database access and schema privately.');
  process.exitCode = 1;
} finally { connection?.release(); await pool?.end(); }
