import { z } from 'zod';
import { admin, sameOrigin, rateLimit } from '../../../../lib/auth.mjs';
import { body, handle } from '../../../../lib/db.mjs';
import { importGithub } from '../../../../lib/github-import.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  return handle(async () => {
    sameOrigin(request); const owner = await admin();
    const { url } = z.object({ url: z.string().trim().max(2048) }).strict().parse(await body(request, 4000));
    await rateLimit(request, 'github-import', String(owner.id));
    return Response.json(await importGithub(url), { headers: { 'Cache-Control': 'no-store' } });
  });
}
