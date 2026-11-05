"""Update only the existing dashboard web service, retaining a rollback copy."""
from pathlib import Path
import datetime
import shutil
import subprocess

SOURCE=Path(__file__).resolve().parent
TARGET=Path('/opt/shiv-control')
def main():
    if not (TARGET/'server.py').is_file(): raise SystemExit('Existing control room not found; nothing changed.')
    if not (SOURCE/'static/hq/app.js').is_file(): raise SystemExit('Build the café browser assets first.')
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    backup=Path('/var/lib/shiv-control/backups')/('before-hq-'+stamp)
    backup.mkdir(parents=True,mode=0o700)
    shutil.copy2(TARGET/'server.py',backup/'server.py')
    shutil.copytree(TARGET/'static',backup/'static')
    shutil.copy2(SOURCE/'server.py',TARGET/'server.py')
    shutil.copytree(SOURCE/'static',TARGET/'static',dirs_exist_ok=True)
    subprocess.run(['systemctl','restart','shiv-dashboard.service'],check=True)
    subprocess.run(['systemctl','is-active','--quiet','shiv-dashboard.service'],check=True)
    print('Updated gaming café at https://dashboard.shivpatel.in/3d')
    print('Rollback source:',backup)
    print('Existing account, collector, n8n, cloud, storage and DNS were not modified.')
if __name__=='__main__': main()
