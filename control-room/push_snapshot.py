"""Upload only the collector's status snapshot; never upload configuration files."""
import json
import os
from pathlib import Path
import urllib.request
import urllib.error

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def main():
    key = os.environ.get('CONTROL_ROOM_PUSH_KEY', '')
    if len(key) < 32:
        raise RuntimeError('Status upload key is missing')
    path = Path('/var/lib/shiv-control/snapshot.json')
    if path.stat().st_size > 2_000_000:
        raise RuntimeError('Status snapshot exceeds size limit')
    data = json.loads(path.read_text())
    allowed = ['updated_at','source_updated_at','n8n','codex','storage','hdd','cloud','services','errors']
    payload = json.dumps({k: data[k] for k in allowed if k in data}).encode()
    request = urllib.request.Request(
        'https://www.shivpatel.in/api/control-room/snapshot',
        data=payload, method='POST',
        headers={'Content-Type':'application/json', 'Authorization':'Bearer '+key, 'User-Agent':'ShivControlRoom/1.0'})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=20) as response:
        if response.status != 200:
            raise RuntimeError('Status upload was rejected')
    print('Status snapshot uploaded')

if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit('Status upload failed: HTTP '+str(error.code))
    except Exception as error:
        raise SystemExit('Status upload failed: '+type(error).__name__)
