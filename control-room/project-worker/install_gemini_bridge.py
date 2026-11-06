"""Install only the new authenticated Gemini bridge; never replace an existing workflow."""
import json
from pathlib import Path
import subprocess
import tempfile

root=Path(__file__).resolve().parents[2]
config=json.loads((root/'.local/project-worker/config.json').read_text())
def run(args,**options):return subprocess.run(args,check=True,capture_output=True,text=True,**options)
inspect=lambda name:json.loads(run(['docker','inspect',name]).stdout)[0]
env=dict(x.split('=',1) for x in inspect('n8n')['Config']['Env'] if '=' in x)
pg=dict(x.split('=',1) for x in inspect('postgres_shared')['Config']['Env'] if '=' in x)
schema=env.get('DB_POSTGRESDB_SCHEMA','public').replace('"','""')
sql='BEGIN READ ONLY; SET LOCAL search_path TO "'+schema+'"; SELECT COUNT(*) FROM workflow_entity WHERE id=\'ShivProjectGemini01\'; COMMIT;'
count=run(['docker','exec','-i','postgres_shared','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',pg.get('POSTGRES_USER','postgres'),'-d',env['DB_POSTGRESDB_DATABASE']],input=sql).stdout.strip()
if count!='0':raise SystemExit('Gemini bridge already exists. Inspect it instead of overwriting it.')
credentials=[{'id':'ShivProjectGeminiAuth01','name':'Shiv Project Gemini Bridge','type':'httpHeaderAuth','data':{'name':'Authorization','value':'Bearer '+config['gemini_token']}}]
try:
    run(['docker','exec','-i','n8n','sh','-c','umask 077; cat > /tmp/shiv-project-auth.json'],input=json.dumps(credentials))
    run(['docker','exec','n8n','n8n','import:credentials','--input=/tmp/shiv-project-auth.json','--projectId=UWCIZeLCvuUGM9uC'])
finally:run(['docker','exec','n8n','rm','-f','/tmp/shiv-project-auth.json'])
run(['docker','cp',str(Path(__file__).parent/'gemini-workflow.json'),'n8n:/tmp/shiv-project-gemini.json'])
run(['docker','exec','n8n','n8n','import:workflow','--input=/tmp/shiv-project-gemini.json','--projectId=UWCIZeLCvuUGM9uC'])
run(['docker','exec','n8n','n8n','publish:workflow','--id=ShivProjectGemini01'])
run(['docker','exec','n8n','rm','-f','/tmp/shiv-project-gemini.json'])
print('Installed authenticated project-generation bridge in the existing n8n personal project. No existing workflow or Gemini credential was modified.')
