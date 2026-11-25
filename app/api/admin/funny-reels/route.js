import {admin,sameOrigin} from '../../../../lib/auth.mjs';
import {assertWritable,body,handle,HttpError} from '../../../../lib/db.mjs';
import {controlSnapshot} from '../../../../lib/control-room.mjs';
import {gamingSnapshot} from '../../../../lib/gaming-studio.mjs';
import {reelSubmission} from '../../../../lib/reel-dispatch.mjs';
import {validateVideoSubmission} from '../../../../lib/funny-reels.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    await admin();
    return Response.json(gamingSnapshot(await controlSnapshot()), {headers:{'Cache-Control':'private, no-store'}});
  });
}

export async function POST(request) {
  return handle(async () => {
    await admin();
    sameOrigin(request);
    assertWritable();
    const input = reelSubmission.parse(await body(request,4096));
    let source;
    try { source = validateVideoSubmission(input); }
    catch (error) { throw new HttpError(422,error.message); }
    const snapshot = await controlSnapshot();
    const auto = snapshot?.automations?.funny_reels;
    const existing = [...(auto?.jobs || []), ...(auto?.streams || []), ...(auto?.instagram_reels || []),
      ...(snapshot?.automations?.youtube?.uploads || [])];
    if (existing.some(row => row.video_id === source.videoId || row.source_video_id === source.videoId || row.source_url === source.sourceUrl)) {
      throw new HttpError(409,'This source already appears in collected processing or publication records.');
    }
    throw new HttpError(503,'Queue intake is paused until the existing dispatcher can safely enqueue without starting another worker.');
  });
}
