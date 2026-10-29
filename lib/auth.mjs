import { createHash, createHmac, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers.js';
import { query, HttpError } from './db.mjs';
const cookieName = 'shiv_admin';
const hash = token => createHash('sha256').update(token).digest('hex');
export async function admin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token) || !process.env.ADMIN_EMAIL) throw new HttpError(401, 'Please sign in.');
  const rows = await query(`SELECT u.id,u.email,u.name FROM next_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()`, [hash(token)]);
  if (!rows[0] || rows[0].email.toLowerCase() !== process.env.ADMIN_EMAIL.toLowerCase()) throw new HttpError(401, 'Please sign in.');
  return rows[0];
}
export function sameOrigin(request) {
  if (!process.env.APP_ORIGIN || request.headers.get('origin') !== new URL(process.env.APP_ORIGIN).origin) throw new HttpError(403, 'Origin not allowed.');
}
export async function rateLimit(request, kind, key = '') {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error('Rate limit secret missing');
  const ip = request.headers.get('x-real-ip') || 'local';
  const window = Math.floor(Date.now() / 600000);
  const bucket = createHmac('sha256', secret).update(`${kind}:${key || ip}:${window}`).digest('hex');
  await query('INSERT INTO next_rate_limits (bucket,hits,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 20 MINUTE)) ON DUPLICATE KEY UPDATE hits=hits+1', [bucket]);
  const [row] = await query('SELECT hits FROM next_rate_limits WHERE bucket=?', [bucket]);
  if (Number(row.hits) > (kind === 'login' ? 10 : 5)) throw new HttpError(429, 'Too many attempts. Please try again in 10 minutes.');
}
export async function signIn(email, password) {
  const user = (await query('SELECT id,email,password FROM users WHERE email=? LIMIT 1', [email]))[0];
  // Laravel bcrypt uses $2y$. Other hash algorithms need an explicit password reset.
  const allowed = user && process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  const valid = await bcrypt.compare(password, user?.password?.replace(/^\$2y\$/, '$2b$') || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
  if (!allowed || !valid) throw new HttpError(401, 'Invalid credentials.');
  const token = randomBytes(32).toString('hex');
  await query('INSERT INTO next_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))', [hash(token), user.id]);
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 3600 });
}
export async function signOut() {
  const jar = await cookies(); const token = jar.get(cookieName)?.value;
  if (token) await query('DELETE FROM next_sessions WHERE token_hash=?', [hash(token)]);
  jar.delete(cookieName);
}
