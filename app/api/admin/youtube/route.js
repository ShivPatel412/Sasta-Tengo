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
      channel: {
        id: 'UCShivPatelStudio',
        name: 'Shiv Patel',
        handle: '@ShivPatel412',
        status: 'CONNECTED',
        manual_review_enforced: true
      },
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
    const nextPrivacy = action === 'review_approve' ? 'public' : (privacy_status || 'private');
    if (!['private', 'unlisted', 'public'].includes(nextPrivacy)) {
      throw new HttpError(422, 'Invalid privacy status.');
    }

    return Response.json({
      ok: true,
      id,
      action,
      privacy_status: nextPrivacy,
      status: nextPrivacy === 'public' ? 'PUBLIC_APPROVED' : (scheduled_at ? 'SCHEDULED' : 'PRIVATE_UPLOADED'),
      scheduled_at: scheduled_at || null,
      updated_at: new Date().toISOString()
    }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
