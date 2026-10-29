import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function initializeFreshDatabase(connection) {
  const [rows] = await connection.query('SHOW TABLES');
  if (rows.length) throw new Error('Database is not empty. Choose a new database; existing tables will not be changed.');
  // Only execute repository-owned DDL; never execute an uploaded SQL backup here.
  for (const file of ['000-fresh-portfolio.sql','001-next-support.sql']) {
    const sql = await readFile(new URL(`../scripts/${file}`,import.meta.url),'utf8');
    for (const statement of sql.replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean)) await connection.query(statement);
  }
}

export async function adminRecord(email, name, password) {
  email=z.email().max(255).parse(email.trim().toLowerCase());
  name=z.string().trim().min(1).max(255).parse(name);
  if (typeof password!=='string'||password.length<12||Buffer.byteLength(password,'utf8')>72) throw new Error('Use a password of at least 12 characters and at most 72 UTF-8 bytes.');
  return {email,name,password:await bcrypt.hash(password,12)};
}

export async function createInitialAdmin(connection, record) {
  const [rows] = await connection.execute('SELECT id FROM users LIMIT 1');
  if (rows.length) throw new Error('A user already exists. This setup command will not create or overwrite accounts.');
  await connection.execute('INSERT INTO users (name,email,password,created_at,updated_at) VALUES (?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())',[record.name,record.email,record.password]);
}
