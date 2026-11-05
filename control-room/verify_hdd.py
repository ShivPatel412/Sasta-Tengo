"""Verify public WebDAV against the physical HDD; revoke the test token afterward."""
import base64
import hashlib
import json
import secrets
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def occ(*args):
    return subprocess.check_output(['docker', 'exec', '-u', 'www-data',
                                   'shiv-nextcloud', 'php', 'occ', *args], text=True)


def main():
    name = 'hdd-verification-' + secrets.token_hex(6)
    token = occ('user:auth-tokens:add', 'shiv', '--no-interaction', '--name=' + name).strip().splitlines()[-1]
    auth = 'Basic ' + base64.b64encode(('shiv:' + token).encode()).decode()
    base = 'https://cloud.shivpatel.in'
    filename = name + '.bin'
    path = '/4 TB HDD/' + filename
    url = base + '/remote.php/dav/files/shiv' + urllib.parse.quote(path)
    physical = Path('/srv/shivcloud-hdd/ShivCloud') / filename
    uploaded = False
    share_id = None

    def request(url, method='GET', data=None, api=False):
        headers = {'Authorization': auth, 'User-Agent': 'ShivCloudStorageCheck/1.0'}
        if api:
            headers.update({'OCS-APIRequest': 'true', 'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded'})
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            print('HTTP failure:', error.code, error.read(1600).decode(errors='replace'))
            raise

    try:
        payload = secrets.token_bytes(2 * 1024 * 1024)
        status, _ = request(url, 'PUT', payload)
        uploaded = True
        assert status in (201, 204), status
        expected = hashlib.sha256(payload).digest()
        assert hashlib.sha256(physical.read_bytes()).digest() == expected, 'HDD file mismatch'
        status, download = request(url)
        assert hashlib.sha256(download).digest() == expected, 'Public download mismatch'
        print('PASS: public HTTPS upload and download match the file on D:\\ShivCloud (2 MiB).')
        endpoint = base + '/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json'
        data = urllib.parse.urlencode({'path': path, 'shareType': '3',
                                     'password': secrets.token_urlsafe(24)}).encode()
        _, body = request(endpoint, 'POST', data, api=True)
        result = json.loads(body)['ocs']
        assert result['meta']['statuscode'] in (100, 200), result['meta']
        share_id = result['data']['id']
        assert result['data']['expiration'], 'Missing share expiry'
        assert result['data']['password'], 'Missing share password protection'
        print('PASS: external HDD files support password-protected links with automatic expiry.')
    finally:
        try:
            if share_id is not None:
                endpoint = base + '/ocs/v2.php/apps/files_sharing/api/v1/shares/' + str(share_id)
                request(endpoint, 'DELETE', api=True)
            if uploaded:
                request(url, 'DELETE')
                assert not physical.exists(), 'Test file was not deleted from HDD'
                print('PASS: test share and test file removed.')
        finally:
            tokens = json.loads(occ('user:auth-tokens:list', 'shiv', '--output=json'))
            for item in tokens:
                if item['name'] == name:
                    occ('user:auth-tokens:delete', 'shiv', str(item['id']))
            print('Temporary test credential revoked.')


if __name__ == '__main__':
    main()
