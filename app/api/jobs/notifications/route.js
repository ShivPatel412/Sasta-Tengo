import { timingSafeEqual } from 'node:crypto';
import { handle, assertWritable, HttpError } from '../../../../lib/db.mjs';
import { deliver } from '../../../../lib/mail.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request) {
  return handle(async () => {
    const expected = process.env.CRON_SECRET;
    const actual = request.headers.get('authorization') || '';
    const wanted = `Bearer ${expected}`;
    if (!expected || expected.length < 32 || actual.length !== wanted.length || !timingSafeEqual(Buffer.from(actual), Buffer.from(wanted))) throw new HttpError(401, 'Unauthorized.');
    assertWritable();
    return Response.json({ delivered: await deliver() });
  });
}
