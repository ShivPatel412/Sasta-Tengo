import mysql from 'mysql2/promise';
import { isLocalPreview } from './preview.mjs';
let pool;
export function database() {
  if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) throw new Error('Database configuration missing');
  return pool ??= mysql.createPool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'false' ? undefined : {
      rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replaceAll('\\n', '\n') } : {})
    },
    connectionLimit: 3, waitForConnections: true, queueLimit: 30,
    connectTimeout: 10000, timezone: 'Z', dateStrings: true,
    supportBigNumbers: true, bigNumberStrings: true, multipleStatements: false
  });
}
export async function query(sql, values = [], connection = database()) {
  const [rows] = await connection.execute(sql, values);
  return rows;
}
export async function transaction(work) {
  const connection = await database().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
export async function insert(table, data, connection) {
  // Callers supply fixed table names and validated field names, never request keys.
  const fields = Object.keys(data);
  const result = await query(`INSERT INTO \`${table}\` (${fields.map(k => `\`${k}\``).join(',')},created_at,updated_at) VALUES (${fields.map(() => '?').join(',')},UTC_TIMESTAMP(),UTC_TIMESTAMP())`, Object.values(data), connection);
  return String(result.insertId);
}
export function assertWritable() {
  if (isLocalPreview()) throw new HttpError(503, 'Local preview: submissions are disabled until a database is configured.');
  if (process.env.MIGRATION_READ_ONLY !== '0') throw new HttpError(503, 'Migration review mode: changes are disabled.');
}
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function handle(work) {
  try { return await work(); }
  catch (error) {
    if (error.name === 'ZodError') return Response.json({ message: 'Please check your details.', errors: error.flatten().fieldErrors }, { status: 422 });
    if (error instanceof HttpError) return Response.json({ message: error.message }, { status: error.status });
    // Never return SQL, credentials, submitted form contents or driver diagnostics.
    console.error('Request failed', { category: error.code || error.name || 'unknown' });
    return Response.json({ message: 'The service is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
export async function body(request, maxBytes = 64000) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'JSON required.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Request body required.');
  const chunks = []; let total = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new HttpError(413, 'Request too large.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}
