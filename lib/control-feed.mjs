import { timingSafeEqual } from 'node:crypto';
import { HttpError, query } from './db.mjs';

export function feedAuth(request, env = process.env) {
  const key = env.CONTROL_ROOM_PUSH_KEY;
  if (!key || key.length < 32) throw new HttpError(503, 'Status upload is not configured.');
  const supplied = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${key}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new HttpError(401, 'Unauthorized.');
}

export function cleanSnapshot(data, now = Date.now()) {
  const time = Date.parse(data?.updated_at);
  if (!Number.isFinite(time) || time > now + 30000 || !Array.isArray(data?.n8n?.workflows)) throw new HttpError(422, 'Invalid status snapshot.');
  return Object.fromEntries(['updated_at','source_updated_at','n8n','codex','storage','hdd','cloud','services','errors'].filter(key => key in data).map(key => [key, data[key]]));
}

export async function saveSnapshot(input, run = query) {
  const data = cleanSnapshot(input);
  const time = Date.parse(data.updated_at);
  if (Date.now() - time > 120000) throw new HttpError(422, 'Status snapshot is stale.');
  await run(`INSERT INTO next_control_snapshot (id,collected_ms,payload) VALUES (1,?,?) ON DUPLICATE KEY UPDATE payload=IF(VALUES(collected_ms)>collected_ms,VALUES(payload),payload),collected_ms=GREATEST(collected_ms,VALUES(collected_ms))`, [time, JSON.stringify(data)]);
}

export async function storedSnapshot(run = query) {
  const [row] = await run('SELECT payload FROM next_control_snapshot WHERE id=1');
  if (!row) throw new HttpError(503, 'Waiting for the PC status collector.');
  return cleanSnapshot(typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload);
}
