"""Add an isolated loopback MySQL instance; existing services and databases stay in place."""
import json
from pathlib import Path
import secrets
import subprocess
import time

root=Path(__file__).resolve().parent.parent
private=root/'.local'
private.mkdir(exist_ok=True)
config_path=private/'mysql-config.json'
if config_path.exists():config=json.loads(config_path.read_text())
else:
    config={'database':'shiv_master_local','user':'shiv_master','password':secrets.token_urlsafe(36),'root_password':secrets.token_urlsafe(36)}
    config_path.write_text(json.dumps(config));config_path.chmod(0o600)
env=private/'mysql.env'
env.write_text('MYSQL_DATABASE='+config['database']+'\nMYSQL_USER='+config['user']+'\nMYSQL_PASSWORD='+config['password']+'\nMYSQL_ROOT_PASSWORD='+config['root_password']+'\n');env.chmod(0o600)
found=subprocess.run(['docker','inspect','shiv-master-mysql'],capture_output=True)
if found.returncode:
    subprocess.run(['docker','run','-d','--name','shiv-master-mysql','--restart','unless-stopped','--memory','768m','--cpus','1','--pids-limit','256','--env-file',str(env),'-p','127.0.0.1:3307:3306','-v','shiv-master-mysql-data:/var/lib/mysql','mysql:8.4'],check=True)
else:
    info=json.loads(found.stdout)[0]
    ports=info.get('HostConfig',{}).get('PortBindings',{}).get('3306/tcp',[])
    if ports!=[{'HostIp':'127.0.0.1','HostPort':'3307'}]:raise SystemExit('Existing local database has unexpected port bindings; inspect before changing it.')
    subprocess.run(['docker','start','shiv-master-mysql'],check=True,stdout=subprocess.DEVNULL)
for _ in range(90):
    result=subprocess.run(['docker','exec','shiv-master-mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqladmin ping -uroot --silent'],capture_output=True)
    if result.returncode==0:print('Isolated local MySQL is ready on loopback port 3307.');break
    time.sleep(1)
else:raise SystemExit('Local MySQL did not become ready. Existing services were not changed.')
