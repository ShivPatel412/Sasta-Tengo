"""Read-only service metadata collector."""
import datetime as dt
import glob
import json
import os
import pathlib
import queue
import shutil
import subprocess
import threading
import time

STATE = pathlib.Path(os.environ.get('SHIV_STATE', '/var/lib/shiv-control'))
ROOT = pathlib.Path(__file__).resolve().parent
N8N_SCOPE = {'project_id': 'UWCIZeLCvuUGM9uC', 'folder_id': None}

def command(args, **kw):
    return subprocess.check_output(args, text=True, timeout=kw.pop('timeout', 20), stderr=subprocess.PIPE, **kw)

def n8n_data():
    env = dict(x.split('=',1) for x in json.loads(command(['docker','inspect','n8n']))[0]['Config']['Env'] if '=' in x)
    db_env = dict(x.split('=',1) for x in json.loads(command(['docker','inspect','postgres_shared']))[0]['Config']['Env'] if '=' in x)
    sql = '''BEGIN READ ONLY;
WITH personal_workflows AS (
 SELECT w.* FROM workflow_entity w WHERE NOT w."isArchived" AND EXISTS (
  SELECT 1 FROM shared_workflow sw WHERE sw."workflowId"=w.id
  AND sw."projectId"='UWCIZeLCvuUGM9uC' AND sw.role='workflow:owner'
 )
)
SELECT json_build_object(
'scope',json_build_object('project_id','UWCIZeLCvuUGM9uC','folder_id',NULL),
'folders',(SELECT coalesce(json_agg(f),'[]'::json) FROM (
 SELECT id,name,"parentFolderId" AS parent_id FROM folder WHERE "projectId"='UWCIZeLCvuUGM9uC' ORDER BY name
) f),
'workflows', (SELECT coalesce(json_agg(w),'[]'::json) FROM (
SELECT id,name,active,"parentFolderId" AS folder_id,"updatedAt" AS updated_at,
 (SELECT count(*) FROM json_array_elements(nodes) n WHERE n->>'type' ILIKE '%agent%') AS agent_count
FROM personal_workflows ORDER BY "updatedAt" DESC) w),
'executions',(SELECT coalesce(json_agg(e),'[]'::json) FROM (
 SELECT e.id,e.status,e."workflowId" AS workflow_id,w.name,e."startedAt" AS started_at,e."stoppedAt" AS stopped_at
 FROM execution_entity e JOIN personal_workflows w ON w.id=e."workflowId"
 WHERE e."deletedAt" IS NULL ORDER BY e.id DESC LIMIT 30) e),
'today',(SELECT json_build_object('total',count(*),'success',count(*) FILTER (WHERE status='success'),'errors',count(*) FILTER (WHERE status IN ('error','crashed')),'running',count(*) FILTER (WHERE status='running'))
 FROM execution_entity WHERE "workflowId" IN (SELECT id FROM personal_workflows) AND "deletedAt" IS NULL AND "startedAt">=date_trunc('day',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata'));
COMMIT;'''
    schema=env.get('DB_POSTGRESDB_SCHEMA','public').replace('"','""')
    sql=sql.replace('BEGIN READ ONLY;',f'BEGIN READ ONLY; SET LOCAL search_path TO "{schema}";')
    result = command(['docker','exec','-i','postgres_shared','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',db_env.get('POSTGRES_USER','postgres'),'-d',env['DB_POSTGRESDB_DATABASE']], input=sql)
    return json.loads(result)

def codex_data():
    candidates = glob.glob('/mnt/c/Users/patel/AppData/Local/OpenAI/Codex/bin/*/codex.exe')
    if not candidates: raise RuntimeError('Codex executable unavailable')
    exe = max(candidates, key=os.path.getmtime)
    proc = subprocess.Popen([exe,'app-server','--listen','stdio://'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
    q = queue.Queue()
    def reader():
        for line in proc.stdout:
            try: q.put(json.loads(line))
            except ValueError: pass
    threading.Thread(target=reader,daemon=True).start()
    def send(method, params=None, ident=None):
        message={'method':method}
        if params is not None: message['params']=params
        if ident is not None: message['id']=ident
        proc.stdin.write(json.dumps(message)+'\n');proc.stdin.flush()
    def receive(ident):
        deadline=time.monotonic()+25
        while time.monotonic()<deadline:
            message=q.get(timeout=max(.1,deadline-time.monotonic()))
            if message.get('id')==ident:
                if 'error' in message: raise RuntimeError('Codex metadata request failed')
                return message['result']
        raise TimeoutError()
    try:
        send('initialize',{'clientInfo':{'name':'shiv_control_readonly','version':'1.0.0'}},1)
        receive(1);send('initialized')
        rows=[];cursor=None
        for page in range(50):
            send('thread/list',{'cursor':cursor,'limit':100,'sortKey':'updated_at','modelProviders':[], 'sourceKinds':['cli','vscode','appServer','subAgent','subAgentReview','subAgentCompact','subAgentThreadSpawn','subAgentOther','exec','unknown'], 'useStateDbOnly':True},page+2)
            response=receive(page+2)
            for t in response['data']:
                rows.append({'id':t['id'],'name':t.get('name') or t.get('agentNickname') or 'Untitled chat','updated_at':t.get('updatedAt'),'model':t.get('model'),'source':t.get('source'),'parent_id':t.get('parentThreadId'),'role':t.get('agentRole'),'status':'history'})
            cursor=response.get('nextCursor')
            if not cursor: break
        return {'threads':rows,'truncated':bool(cursor),'runtime_status_available':False,'note':'Activity history from this PC. Live desktop run status is not shared by this connection.'}
    finally:
        proc.terminate()
        try: proc.wait(timeout=5)
        except subprocess.TimeoutExpired: proc.kill()

def collect():
    previous={}
    try: previous=json.loads((STATE/'snapshot.json').read_text())
    except (OSError,ValueError): pass
    now=dt.datetime.now(dt.timezone.utc).isoformat()
    result={'updated_at':now,'errors':{},'source_updated_at':{}}
    for name,fn in [('n8n',n8n_data),('codex',codex_data)]:
        try:
            result[name]=fn(); result['source_updated_at'][name]=now
        except Exception as error:
            result['errors'][name]=type(error).__name__
            if name in previous and (name != 'n8n' or previous[name].get('scope') == N8N_SCOPE):
                result[name]=previous[name]
                result['source_updated_at'][name]=previous.get('source_updated_at',{}).get(name)
    disk=shutil.disk_usage('/mnt/c')
    usage=shutil.disk_usage('/')
    result['storage']={'total':disk.total,'used':disk.used,'free':disk.free,'wsl_virtual_free':usage.free}
    result['services']=[{'name':x['Names'],'state':x['State'],'status':x['Status'],'image':x['Image']} for x in [json.loads(line) for line in command(['docker','ps','-a','--format','{{json .}}']).splitlines()]]
    temporary=STATE/'snapshot.tmp'
    temporary.write_text(json.dumps(result));temporary.chmod(0o644);temporary.replace(STATE/'snapshot.json')
    return result

if __name__=='__main__':
    result=collect()
    print('Snapshot refreshed:',{k:len(result.get(k,{}).get('workflows' if k=='n8n' else 'threads',[])) for k in ['n8n','codex']},'errors:',result['errors'],flush=True)
