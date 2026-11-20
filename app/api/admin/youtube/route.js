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
    const uploads = snapshot?.automations?.youtube?.uploads || [];
    return Response.json({
      ok: true,
      actions_available: false,
      action_message: 'Read-only monitoring. YouTube review, scheduling and privacy changes are not connected.',
      channel: { id: null, name: null, handle: null, status: 'NOT_VERIFIED', manual_review_enforced: null },
      uploads
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function PATCH(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 2048);
    const { id, action, privacy_status, scheduled_at } = data;
    if (!id || !['review_approve', 'schedule', 'set_privacy'].includes(action)) {
      throw new HttpError(422, 'Invalid action. Manual review is required for YouTube Shorts.');
    }
    throw new HttpError(503, 'YouTube actions are not connected. No video privacy or publication state was changed.');
  });
}
