import { getJobHunterRecovery } from '../../../../lib/job-hunter.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request) { return getJobHunterRecovery(request); }
