"""Install the prepared private Studio bridge; never overwrite an existing workflow."""
import json
import os
from pathlib import Path
import secrets
import subprocess

root = Path(__file__).resolve().parent
state = Path('/var/lib/shiv-instagram-studio')

def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, timeout=120, **kwargs)

workflow = json.loads((root/'workflow.json').read_text())
existing = subprocess.run(['docker','exec','n8n','n8n','export:workflow','--id='+workflow['id'],'--output=/tmp/studio-existing-check.json'],text=True,capture_output=True,timeout=120)
try:
    if existing.returncode == 0:
        raise SystemExit('Studio workflow already exists. Inspect it before updating it.')
finally:
    run('docker','exec','n8n','rm','-f','/tmp/studio-existing-check.json')

state.mkdir(mode=0o700, exist_ok=True)
config_path = state/'config.json'
if config_path.exists():
    config = json.loads(config_path.read_text())
else:
    config = {key:secrets.token_hex(32) for key in ('webhook_key','callback_key','dispatch_key')}
    descriptor = os.open(config_path, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as handle:
        json.dump(config, handle)
credential_id = 'ShivStudioHook01'
credential = [{'id':credential_id,'name':'Instagram Studio execution key','type':'httpHeaderAuth','data':{'name':'Authorization','value':'Bearer '+config['webhook_key']}}]
workflow['nodes'][0]['credentials']['httpHeaderAuth']['id'] = credential_id
workflow['settings'].update(timezone='Asia/Kolkata',executionTimeout=600,availableInMCP=True)
for filename, content in (('studio-header.json',credential),('studio-workflow.json',workflow)):
    try:
        run('docker','exec','-i','n8n','sh','-c','umask 077; cat > /tmp/'+filename,input=json.dumps(content))
        command = 'import:credentials' if filename=='studio-header.json' else 'import:workflow'
        run('docker','exec','n8n','n8n',command,'--input=/tmp/'+filename,'--projectId=UWCIZeLCvuUGM9uC')
    finally:
        run('docker','exec','n8n','rm','-f','/tmp/'+filename)
print('Installed private Instagram Studio analysis workflow inactive. No photos were analysed or published.')
