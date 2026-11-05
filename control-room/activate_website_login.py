"""Enable the website account for both dashboards, without changing its password."""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path('/opt/shiv-control')
STATE=Path('/var/lib/shiv-control')
SOURCE=Path(__file__).resolve().parent

def main():
    sys.path.insert(0,str(SOURCE))
    import website_auth
    # Reach the real protected endpoint without using any user's credentials.
    try: website_auth.validate('a'*64)
    except website_auth.AuthError as error:
        if error.status!=401: raise SystemExit('Website authentication is not reachable; current login was kept unchanged.')
    else: raise SystemExit('Website incorrectly accepted a test session; activation stopped.')
    for name in ['server.py','website_auth.py']:
        shutil.copy2(SOURCE/name,ROOT/name)
    shutil.copytree(SOURCE/'static',ROOT/'static',dirs_exist_ok=True)
    (STATE/'use-website-login').touch(mode=0o600)
    subprocess.run(['systemctl','restart','shiv-dashboard.service'],check=True)
    print('Both dashboards now accept the existing website account email and password.')
    print('The separate control-room login is disabled. All old control-room sessions were cleared.')

if __name__=='__main__': main()
