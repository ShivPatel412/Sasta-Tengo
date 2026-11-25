"""Record real worker milestones in the existing n8n job and event tables."""
import argparse
import base64
import datetime as dt
import json
import os
from pathlib import Path
import re
import subprocess

STAGES = {'DOWNLOADING', 'DOWNLOADED', 'ANALYZING', 'SELECTING', 'RENDERING', 'COVERS', 'INSTAGRAM_UPLOAD', 'YOUTUBE_UPLOAD'}
SEGMENT_EVENTS = {'SEGMENT_STARTED', 'SEGMENT_PROCESSING', 'SEGMENT_COMPLETED', 'SEGMENT_RETRIED', 'SEGMENT_FAILED'}

def literal(value):
    return "'" + str(value).replace("'", "''") + "'"

def record(job, stage, progress, segment=0, total=0, clip=0, clips=0, manifest=None, event_type='WORKER_STEP', execution_id=None, command=subprocess.check_output):
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', job) or stage not in STAGES or not 0 <= progress <= 95:
        raise ValueError('Invalid tracking event')
    if any(not 0 <= n <= 1000 for n in (segment, total, clip, clips)):
        raise ValueError('Invalid tracking counters')
    segment_event = event_type != 'WORKER_STEP'
    if segment_event and (event_type not in SEGMENT_EVENTS or stage != 'ANALYZING'
                          or not re.fullmatch(r'[0-9]{1,30}', execution_id or '')
                          or not 1 <= segment <= total or clip or clips or manifest):
        raise ValueError('Invalid segment event')
    message = stage.replace('_', ' ').capitalize()
    if total: message += f' · segment {segment}/{total}'
    if clips: message += f' · clip {clip}/{clips}'
    env = dict(x.split('=', 1) for x in json.loads(command(['docker', 'inspect', 'n8n'], text=True))[0]['Config']['Env'] if '=' in x)
    db = dict(x.split('=', 1) for x in json.loads(command(['docker', 'inspect', 'postgres_shared'], text=True))[0]['Config']['Env'] if '=' in x)
    schema = env.get('DB_POSTGRESDB_SCHEMA', 'n8n').replace('"', '""')
    completed = segment if event_type == 'SEGMENT_COMPLETED' else max(0,segment-1)
    processed = 'COALESCE(segments_total,0)' if stage == 'SELECTING' else f'GREATEST(COALESCE(segments_processed,0),{completed})'
    run = (f'AND execution_id={literal(execution_id)} '
           "AND COALESCE(state,'') NOT IN ('ERROR','FAILED','CANCELED','CANCELLED','DONE','PUBLISHED')") if segment_event else ''
    sql = f'''BEGIN;
SET LOCAL search_path TO "{schema}", public;
UPDATE "data_table_user_Ij8wnQ1Duve8Eno5" SET state='PROCESSING',stage={literal(stage)},
progress_percent=GREATEST(COALESCE(progress_percent,0),{progress}),last_heartbeat_at=NOW(),
worker_status='RUNNING',segments_total=GREATEST(COALESCE(segments_total,0),{total}),
segments_processed={processed},
clips_selected=GREATEST(COALESCE(clips_selected,0),{clips}),"updatedAt"=NOW()
WHERE job_id={literal(job)} {run};
INSERT INTO "data_table_user_WatVsMggkgeC0mRr" (job_id,event_type,stage,message,progress_percent,execution_id,created_at)
SELECT job_id,{literal(event_type)},{literal(stage)},{literal(message)},{progress},execution_id,NOW()
FROM "data_table_user_Ij8wnQ1Duve8Eno5" WHERE job_id={literal(job)} {run};
COMMIT;'''
    command(['docker', 'exec', '-i', 'postgres_shared', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', db.get('POSTGRES_USER', 'n8n_local'), '-d', env.get('DB_POSTGRESDB_DATABASE', 'n8n_local')], input=sql, text=True, stderr=subprocess.PIPE)
    if manifest:
        item = json.loads(base64.b64decode(manifest, validate=True))
        if item.get('job_id') != job or not 1 <= int(item.get('clip_number', 0)) <= 10:
            raise ValueError('Invalid clip manifest')
        directory = Path('/home/patelsastatengo/projects/shiv-os-funny/jobs') / job
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"clip-{int(item['clip_number']):02}.json"
        temporary = path.with_suffix('.tmp')
        temporary.write_text(json.dumps(item), encoding='utf-8')
        os.replace(temporary, path)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('job'); parser.add_argument('stage'); parser.add_argument('progress', type=int)
    for name in ('segment', 'total', 'clip', 'clips'): parser.add_argument('--'+name, type=int, default=0)
    parser.add_argument('--manifest')
    parser.add_argument('--event-type', choices=sorted(SEGMENT_EVENTS), default='WORKER_STEP')
    parser.add_argument('--execution-id')
    record(**vars(parser.parse_args()))
