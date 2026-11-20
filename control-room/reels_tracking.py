"""Join worker milestones and platform receipts without treating handoff as publication."""
import json
from pathlib import Path

def enrich_reel_jobs(data, clips, root=Path('/home/patelsastatengo/projects/shiv-os-funny/jobs')):
    jobs = data.get('funny_jobs', [])
    executions = {str(row['id']): row for row in data.get('worker_executions', [])}
    for job in jobs:
        key = job['job_id']
        job['events'] = sorted([event for event in data.get('reel_events', []) if event.get('job_id') == key], key=lambda event: event.get('id', 0))
        instagram = [row for row in data.get('instagram_reels', []) if row.get('parent_job_id') == key]
        youtube = [row for row in data.get('youtube_uploads', []) if row.get('parent_job_id') == key]
        job['instagram_clips'] = instagram
        job['youtube_clips'] = youtube
        job['instagram_published'] = sum(bool(row.get('instagram_media_id') and row.get('permalink') and row.get('state') == 'PUBLISHED') for row in instagram)
        job['youtube_published'] = sum(bool(row.get('youtube_video_id') and row.get('privacy_status') == 'public' and row.get('status') == 'PUBLISHED') for row in youtube)
        count = int(job.get('clips_selected') or 0)
        run = executions.get(str(job.get('execution_id')))
        if run and run.get('status') in ('error', 'crashed', 'canceled'):
            job.update(state='ERROR', error_message='Video processing stopped. Open the worker run to see the failed step.')
        elif count and job['instagram_published'] >= count and job['youtube_published'] >= count:
            job.update(state='PUBLISHED', stage='PUBLISHED', progress_percent=100)
        elif any(row.get('state') in ('MEDIA_ERROR', 'CREDIT_MISSING', 'REQUIRES_RECONCILIATION') for row in instagram) or any(row.get('status') in ('MEDIA_ERROR', 'REQUIRES_MANUAL_RECONCILIATION') for row in youtube):
            job.update(state='ERROR', error_message='A platform needs attention. Check the per-clip status below before retrying.')
        if not key or any(char not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-' for char in key):
            continue
        directory = root / key
        if not directory.is_dir():
            continue
        for path in sorted(directory.glob('clip-*.json')):
            if path.stat().st_size > 64000:
                continue
            try:
                clip = json.loads(path.read_text())
                if clip.get('job_id') != key: continue
                clips.append({**clip, 'filename': Path(clip.get('video_path', '')).name, 'render_status': 'RENDERED', 'id': key+'-'+str(clip['clip_number'])})
            except (OSError, ValueError, KeyError):
                continue
    return jobs
