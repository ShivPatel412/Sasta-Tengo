import { admin, sameOrigin } from '../../../../lib/auth.mjs';
import { assertWritable, body, handle, HttpError } from '../../../../lib/db.mjs';
import { controlSnapshot } from '../../../../lib/control-room.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await admin();
    let snapshot = null;
    try { snapshot = await controlSnapshot(); } catch {}
    const li = snapshot?.automations?.linkedin || {};
    return Response.json({
      ok: true,
      actions_available: false,
      action_message: 'LinkedIn remains paused. Draft actions and publishing controls are not connected.',
      automation_status: 'PAUSED',
      oauth_ready: false,
      oauth_message: 'LinkedIn Publish node disabled in n8n. OAuth Person URN required before activation.',
      control: li.control || { enabled: false, max_posts_week: 2 },
      queue: li.queue || [],
      audit: li.audit || []
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function PATCH(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 4096);
    const { action, queue_id, max_posts_week, post_text } = data;

    // Safety constraint: Never activate the paused LinkedIn workflow
    if (data.enabled === true) {
      throw new HttpError(403, 'Automated activation is blocked. LinkedIn workflow must remain paused until approved.');
    }

    if (!['update_limits','approve','reject','edit'].includes(action)) throw new HttpError(422, 'Invalid LinkedIn action.');
    throw new HttpError(503, 'LinkedIn actions are not connected. No draft or posting limit was changed.');
  });
}
