import { admin } from '../../../../lib/auth.mjs';
import { handle, HttpError } from '../../../../lib/db.mjs';
import { controlSnapshot } from '../../../../lib/control-room.mjs';
import { reelConnection } from '../../../../lib/reel-dispatch.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request) {
  return handle(async () => {
    await admin();
    const params = new URL(request.url).searchParams;
    const job = params.get('job_id'), index = Number(params.get('clip')), kind = params.get('kind');
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(job || '') || !Number.isInteger(index) || index < 1 || index > 10 || !['cover', 'video'].includes(kind)) throw new HttpError(422, 'Invalid clip preview.');
    const snapshot = await controlSnapshot();
    const clip = snapshot?.automations?.funny_reels?.clips?.find(row => row.job_id === job && Number(row.clip_number) === index);
    const path = clip?.[kind === 'cover' ? 'cover_path' : 'video_path'];
    if (typeof path !== 'string' || !path.startsWith('/home/patelsastatengo/projects/shiv-os-funny/jobs/'+job+'/') || path.includes('..') || !/^[A-Za-z0-9_./-]+$/.test(path) || !path.endsWith(kind === 'cover' ? '.png' : '.mp4')) throw new HttpError(404, 'This generated preview is not available yet.');
    const connection = reelConnection();
    if (!connection) throw new HttpError(503, 'The media worker is unavailable.');
    const url = new URL('https://n8n.shivpatel.in/webhook/shiv-os-reel-media-v1');
    url.searchParams.set('path', path);
    const result = await fetch(url, { headers: { Authorization: connection.key }, redirect: 'error', signal: AbortSignal.timeout(55000), cache: 'no-store' });
    if (!result.ok) throw new HttpError(503, 'The worker could not serve this preview.');
    return new Response(result.body, { headers: { 'Content-Type': kind === 'cover' ? 'image/png' : 'video/mp4', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  });
}
