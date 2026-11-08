"""Install only the dedicated Shiv services; existing application stacks are untouched."""
import grp
import json
import os
from pathlib import Path
import pwd
import secrets
import shutil
import subprocess
import sys

SOURCE=Path(__file__).resolve().parent
TARGET=Path('/opt/shiv-control')
STATE=Path('/var/lib/shiv-control')

def run(args,**kw):
    return subprocess.run(args,check=True,text=True,**kw)

def main():
    if os.geteuid()!=0: raise SystemExit('Run this installer as root inside WSL.')
    if shutil.disk_usage('/mnt/c').free<15*1024**3: raise SystemExit('At least 15 GB of physical free space is required.')
    try: user=pwd.getpwnam('shivdash')
    except KeyError:
        run(['useradd','--system','--home-dir',str(STATE),'--shell','/usr/sbin/nologin','shivdash'])
        user=pwd.getpwnam('shivdash')
    TARGET.mkdir(exist_ok=True)
    for filename in ['server.py','website_auth.py','collector.py','compose.yml','cloud-entrypoint.sh']:
        shutil.copy2(SOURCE/filename,TARGET/filename)
    shutil.copytree(SOURCE/'static',TARGET/'static',dirs_exist_ok=True)
    STATE.mkdir(exist_ok=True);STATE.chmod(0o750);os.chown(STATE,user.pw_uid,user.pw_gid)
    private=STATE/'secrets';private.mkdir(exist_ok=True);private.chmod(0o700)
    cloud=STATE/'cloud-init';cloud.mkdir(exist_ok=True);cloud.chmod(0o700);os.chown(cloud,user.pw_uid,user.pw_gid)
    secretfile=private/'db-password'
    if not secretfile.exists():
        secretfile.write_text(secrets.token_hex(32));secretfile.chmod(0o600)
    adminfile=cloud/'admin-password'
    if not adminfile.exists(): adminfile.touch();adminfile.chmod(0o600);os.chown(adminfile,user.pw_uid,user.pw_gid)
    pg=json.loads(subprocess.check_output(['docker','inspect','postgres_shared'],text=True))[0]
    env=dict(v.split('=',1) for v in pg['Config']['Env'] if '=' in v)
    args=['docker','exec','-i','postgres_shared','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',env.get('POSTGRES_USER','postgres'),'-d','postgres']
    exists=subprocess.check_output(args+['-c',"SELECT 1 FROM pg_database WHERE datname='shiv_nextcloud'"],text=True).strip()
    if not exists:
        password=secretfile.read_text().strip()
        # Generated hexadecimal password is passed on stdin, never command arguments or logs.
        sql=f"CREATE USER shiv_nextcloud WITH PASSWORD '{password}';\nCREATE DATABASE shiv_nextcloud OWNER shiv_nextcloud;\n"
        run(args,input=sql,stdout=subprocess.DEVNULL)
    run(['docker','compose','--progress','plain','-f',str(TARGET/'compose.yml'),'up','-d'],cwd=TARGET)
    service='''[Unit]
Description=Shiv private control room
After=network.target
[Service]
User=shivdash
Group=shivdash
WorkingDirectory=/opt/shiv-control
ExecStart=/usr/bin/python3 /opt/shiv-control/server.py
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/shiv-control
PrivateTmp=true
UMask=0077
[Install]
WantedBy=multi-user.target
'''
    collector='''[Unit]
Description=Shiv read-only service metadata collector
After=docker.service
[Service]
Type=oneshot
WorkingDirectory=/opt/shiv-control
ExecStart=/usr/bin/python3 /opt/shiv-control/collector.py
TimeoutStartSec=180
UMask=0022
'''
    timer='''[Unit]
Description=Refresh Shiv workspace metadata
[Timer]
OnBootSec=30
OnUnitInactiveSec=30
AccuracySec=1s
Unit=shiv-collector.service
[Install]
WantedBy=timers.target
'''
    for name,contents in [('shiv-dashboard.service',service),('shiv-collector.service',collector),('shiv-collector.timer',timer)]:
        Path('/etc/systemd/system',name).write_text(contents)
    run(['systemctl','daemon-reload'])
    run(['systemctl','enable','--now','shiv-dashboard.service','shiv-collector.timer'])
    run(['systemctl','restart','shiv-dashboard.service'])
    run(['systemctl','start','shiv-collector.service'])
    print('Local dashboard: http://localhost:8787')
    print('Nextcloud origin: http://localhost:8788 (not publicly routed)')
    print('No public tunnel or DNS routes changed.')

if __name__=='__main__': main()
