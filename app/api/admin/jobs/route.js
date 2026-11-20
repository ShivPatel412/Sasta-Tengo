import { admin, sameOrigin } from '../../../../lib/auth.mjs';
import { assertWritable, body, handle, HttpError } from '../../../../lib/db.mjs';
import {
  getDashboardJobs,
  getDashboardJobDetails,
  getDashboardStats,
  updateJobStatus,
  updateJobDraft,
  getDashboardTasks,
  queueJobTask
} from '../../../../lib/job-hunter.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  return handle(async () => {
    await admin();
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || '';
    const jobId = url.searchParams.get('job_id') || '';

    if (view === 'stats') {
      const stats = await getDashboardStats();
      return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (view === 'tasks') {
      const tasks = await getDashboardTasks();
      return Response.json(tasks, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (jobId) {
      const details = await getDashboardJobDetails(jobId);
      return Response.json(details, { headers: { 'Cache-Control': 'no-store' } });
    }

    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
    const search = url.searchParams.get('search') || '';
    const source = url.searchParams.get('source') || '';
    const status = url.searchParams.get('status') || '';
    const score_min = url.searchParams.get('score_min') ? Number(url.searchParams.get('score_min')) : undefined;
    const score_max = url.searchParams.get('score_max') ? Number(url.searchParams.get('score_max')) : undefined;

    const data = await getDashboardJobs({ page, limit, search, source, status, score_min, score_max });
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  });
}

export async function PATCH(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 64000);
    const { action, job_id, draft_id, status, content, applied_at } = data;

    if (action === 'update_status') {
      if (!job_id || !status) throw new HttpError(422, 'job_id and status are required.');
      return Response.json(await updateJobStatus(job_id, status));
    }

    if (action === 'mark_applied') {
      if (!job_id) throw new HttpError(422, 'job_id is required.');
      return Response.json(await updateJobStatus(job_id, 'applied', { applied_at: applied_at || new Date().toISOString() }));
    }

    if (action === 'update_draft') {
      if (!draft_id || !content) throw new HttpError(422, 'draft_id and content are required.');
      return Response.json(await updateJobDraft(draft_id, content));
    }

    throw new HttpError(422, 'Invalid patch action.');
  });
}

export async function POST(request) {
  return handle(async () => {
    await admin(); sameOrigin(request); assertWritable();
    const data = await body(request, 16000);
    const { action, job_id, skill, message, reason } = data;

    if (action === 'agent_task' || action === 'analyze_job') {
      const taskSkill = skill || (action === 'analyze_job' ? 'score' : 'help');
      const taskMsg = message || (action === 'analyze_job' ? `Analyze compatibility for job ${job_id}` : 'Agent request');
      const taskReason = reason || 'Dashboard manual trigger';

      // Create synthetic request for queueJobTask
      const syntheticReq = new Request('https://internal/api/job-hunter/agent-tasks', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.SHIV_JOB_API_TOKEN || 'a'.repeat(32)}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          message: taskMsg,
          job_id: job_id || null,
          skill: taskSkill,
          reason: taskReason,
          requires_approval: true,
          status: 'queued'
        })
      });

      // Forward to n8n orchestrator webhook if reachable
      try {
        fetch('https://n8n.shivpatel.in/webhook/shiv-job-hunter-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id, skill: taskSkill, message: taskMsg }),
          signal: AbortSignal.timeout(3000)
        }).catch(() => {});
      } catch {}

      return queueJobTask(syntheticReq);
    }

    throw new HttpError(422, 'Invalid post action.');
  });
}
