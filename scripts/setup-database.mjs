import { database } from '../lib/db.mjs';
import { initializeFreshDatabase } from '../lib/database-setup.mjs';
let pool, connection;
try {
  pool=database(); connection=await pool.getConnection();
  await initializeFreshDatabase(connection);
  console.log('Fresh portfolio tables created. Create the initial admin with pnpm db:admin. Writes remain controlled by MIGRATION_READ_ONLY.');
} catch(error) {
  console.error(error.message.startsWith('Database is not empty')?error.message:'Database setup failed. Check the new database connection privately. DDL may be partially applied; do not delete an existing database to retry.');
  process.exitCode=1;
} finally {connection?.release();await pool?.end();}
