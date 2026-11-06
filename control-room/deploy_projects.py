"""Deploy only the master dashboard extension, retaining current photo/3D integrations."""
import datetime
import grp
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess

SOURCE=Path(__file__).resolve().parent
TARGET=Path('/opt/shiv-control')
STATE=Path('/var/lib/shiv-control')
FILES=('server.py','project_routes.py','static/index.html','static/app.js','static/projects.html','static/projects.js','static/projects.css')


def main():
    if not (TARGET/'server.py').is_file() or not (TARGET/'photo_routes.py').is_file():raise SystemExit('Inspect the existing dashboard/photo installation first.')
    # A deploy must not overwrite another session's changes to the web service.
    current=(TARGET/'server.py').read_text()
    source=(SOURCE/'server.py').read_text()
    expected=source.replace('import project_routes\n','').replace('        if project_routes.get(self,path,ROOT): return\n','').replace('        if project_routes.post(self,path,body): return\n','')
    expected=expected.replace("            limit=64000 if re.fullmatch(r'/api/project-drafts/[1-9]\\d*',path) else 8192\n            if length<1 or length>limit: raise ValueError()","            if length<1 or length>8192: raise ValueError()")
    expected=expected.replace("        media=\" https:\" if urlsplit(self.path).path=='/projects' else ''\n",'').replace("data:{media};","data:;")
    if current not in (expected,source):raise SystemExit('Live server has independent changes. Reconcile before deploying.')
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=STATE/'backups'/('before-projects-'+stamp);backup.mkdir(parents=True,mode=0o700)
    for name in FILES:
        if (TARGET/name).exists():
            saved=backup/name;saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(TARGET/name,saved)
    for name in FILES:
        shutil.copy2(SOURCE/name,TARGET/name);(TARGET/name).chmod(0o644)
    # This token only allows worker status/run. It cannot sign in or publish portfolio work.
    private=STATE/'project-automation.json'
    if not private.exists():
        private.write_text(json.dumps({'token':secrets.token_urlsafe(48)}));private.chmod(0o640);os.chown(private,0,grp.getgrnam('shivdash').gr_gid)
    subprocess.run(['systemctl','restart','shiv-dashboard.service'],check=True)
    subprocess.run(['systemctl','is-active','--quiet','shiv-dashboard.service'],check=True)
    print('Updated master dashboard. Existing sessions expired; sign in again.')
    print('Rollback files:',backup)


if __name__=='__main__':main()
