import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { admin, sameOrigin } from '../../../../lib/auth.mjs';
import { assertWritable, handle, HttpError } from '../../../../lib/db.mjs';
import { imageExtension } from '../../../../lib/media.mjs';
export const runtime = 'nodejs';
export async function POST(request) {
  return handle(async () => {
    sameOrigin(request); await admin(); assertWritable();
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, 'Media storage is not configured.');
    const length = Number(request.headers.get('content-length'));
    if (!length || length > 4000000) throw new HttpError(413, 'Images must be under 4 MB.');
    const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, 'Image required.');
    const chunks = []; let size = 0;
    while (true) {
      const { done,value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4000000) { await reader.cancel(); throw new HttpError(413, 'Image too large.'); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks); const extension = imageExtension(bytes);
    if (!extension) throw new HttpError(422, 'Use JPEG, PNG, GIF or WebP.');
    const blob = await put(`projects/${randomUUID()}.${extension}`, bytes, { access: 'public', contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`, addRandomSuffix: false });
    return Response.json({ url: blob.url });
  });
}
