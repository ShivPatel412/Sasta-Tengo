import { body, handle } from '../../../../lib/db.mjs';
import { feedAuth, saveSnapshot } from '../../../../lib/control-feed.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  return handle(async () => {
    feedAuth(request);
    await saveSnapshot(await body(request, 2_000_000));
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
