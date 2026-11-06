import test from 'node:test';
import assert from 'node:assert/strict';
import { feedAuth, cleanSnapshot, saveSnapshot, storedSnapshot } from '../lib/control-feed.mjs';
import { isMasterDashboard } from '../lib/master-dashboard.mjs';

test('status uploader needs its own secret and cannot authenticate with a browser session', () => {
  const key = 'a'.repeat(40);
  assert.throws(() => feedAuth(new Request('https://test'), {}));
  assert.throws(() => feedAuth(new Request('https://test', { headers: { cookie: 'shiv_admin=value' } }), { CONTROL_ROOM_PUSH_KEY: key }));
  feedAuth(new Request('https://test', { headers: { authorization: `Bearer ${key}` } }), { CONTROL_ROOM_PUSH_KEY: key });
});
test('snapshot upload rejects invalid, future and stale data, strips unrelated top-level fields', async () => {
  const input = { updated_at: new Date().toISOString(), n8n: { workflows: [] }, private_config: 'omit' };
  assert(!('private_config' in cleanSnapshot(input)));
  for (const data of [{}, { ...input, updated_at: 'bad' }, { ...input, updated_at: new Date(Date.now()+60000).toISOString() }]) assert.throws(() => cleanSnapshot(data));
  await assert.rejects(saveSnapshot({ ...input, updated_at: '2020-01-01T00:00:00Z' }, () => assert.fail('No SQL for rejected upload')));
  let sql, values;
  await saveSnapshot(input, async (statement, parameters) => { sql=statement; values=parameters; });
  assert(sql.includes('GREATEST(collected_ms,VALUES(collected_ms))'));
  assert(sql.includes('IF(VALUES(collected_ms)>collected_ms'));
  assert(!values[1].includes('private_config'));
  assert.deepEqual(await storedSnapshot(async () => [{ payload: values[1] }]), cleanSnapshot(input));
  await assert.rejects(storedSnapshot(async () => []), /Waiting for/);
});
test('production master is opt-in; local master remains separate from production mode', () => {
  assert(!isMasterDashboard({ NODE_ENV: 'production', MASTER_DASHBOARD_LOCAL: '1' }));
  assert(isMasterDashboard({ NODE_ENV: 'production', MASTER_DASHBOARD_ENABLED: '1' }));
});
