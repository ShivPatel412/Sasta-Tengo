import { readFile } from 'node:fs/promises';
import { database, query } from '../lib/db.mjs';
try {
  await query(await readFile(new URL('./004-control-snapshot.sql', import.meta.url), 'utf8'));
  console.log('Status snapshot table ready. Existing records were not modified.');
} catch (error) {
  console.error('Status table setup failed:', error.code || error.name);
  process.exitCode = 1;
} finally { await database().end(); }
