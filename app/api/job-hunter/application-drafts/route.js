import { saveJobDraft } from '../../../../lib/job-hunter.mjs';
export const runtime = 'nodejs';
export const POST = request => saveJobDraft(request, 'application');
