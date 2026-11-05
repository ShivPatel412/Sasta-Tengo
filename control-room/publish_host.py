import datetime
import json
from pathlib import Path
import shutil
import subprocess
import urllib.request

ROOT=Path('/opt/shiv-control')
STATE=Path('/var/lib/shiv-control')
TUNNEL='05c94711-11af-48c7-91c3-f338b00c7f0f'

def main():
    if not (STATE/'auth.json').exists(): raise SystemExit('Dashboard account setup must be completed first.')
    with urllib.request.urlopen('http://127.0.0.1:8788/status.php',timeout=10) as response:
        status=json.load(response)
    if not status.get('installed'): raise SystemExit('Nextcloud account setup must be completed first.')
    source=Path(__file__).resolve().parent
    for filename in ['collector.py','compose.yml','cloud-entrypoint.sh']:
        shutil.copy2(source/filename,ROOT/filename)
    shutil.copytree(source/'static',ROOT/'static',dirs_exist_ok=True)
    subprocess.run(['docker','compose','--progress','plain','-f',str(ROOT/'compose.yml'),'up','-d'],check=True)
    config=Path('/etc/cloudflared/config.yml')
    previous=config.read_text()
    marker='  # Shiv personal cloud and control room\n'
    if marker not in previous:
        if 'dashboard.shivpatel.in' in previous or 'cloud.shivpatel.in' in previous:
            raise SystemExit('Existing hostname route requires review; no route overwritten.')
        extra='''  # Shiv personal cloud and control room
  - hostname: dashboard.shivpatel.in
    service: http://127.0.0.1:8787
  - hostname: cloud.shivpatel.in
    service: http://127.0.0.1:8788

'''
        if '  # Default\n' not in previous: raise SystemExit('Catch-all marker not found; no config modified.')
        stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
        shutil.copy2(config,config.with_name('config.yml.before-shiv-'+stamp))
        candidate=config.with_name('config.yml.shiv-candidate')
        candidate.write_text(previous.replace('  # Default\n',extra+'  # Default\n'))
        subprocess.run(['cloudflared','--config',str(candidate),'tunnel','ingress','validate'],check=True)
        for host in ['dashboard.shivpatel.in','cloud.shivpatel.in']:
            subprocess.run(['cloudflared','--origincert','/home/patelsastatengo/.cloudflared/cert.pem','tunnel','route','dns',TUNNEL,host],check=True)
        candidate.replace(config)
        subprocess.run(['systemctl','restart','cloudflared'],check=True)
    subprocess.run(['systemctl','start','shiv-collector.service'],check=True)
    print('Protected domain routes configured: dashboard.shivpatel.in and cloud.shivpatel.in')

if __name__=='__main__': main()
