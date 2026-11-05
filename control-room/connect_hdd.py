"""Attach the verified, already-mounted D: HDD without changing its filesystem."""
from datetime import datetime, timezone
from pathlib import Path
import os
import shutil
import subprocess


def run(*args):
    return subprocess.run(args, check=True, text=True, capture_output=True).stdout.strip()


def main():
    if os.geteuid() != 0:
        raise SystemExit('Run as root inside Ubuntu.')
    root = Path('/srv/shivcloud-hdd')
    if run('findmnt', '-n', '-o', 'SOURCE', '--target', str(root)) != 'D:':
        raise SystemExit('Expected D: mounted at /srv/shivcloud-hdd.')
    total = shutil.disk_usage(root).total
    if not 3_900_000_000_000 < total < 4_100_000_000_000:
        raise SystemExit('Drive capacity does not match the verified 4 TB HDD.')
    source = Path(__file__).resolve().parent
    target = Path('/opt/shiv-control')
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path('/var/lib/shiv-control/backups') / ('before-hdd-' + stamp)
    backup.mkdir(parents=True, mode=0o700)
    backup.chmod(0o700)
    for name, path in [('compose.yml', target / 'compose.yml'), ('fstab', Path('/etc/fstab'))]:
        shutil.copy2(path, backup / name)
    # Capture database and application configuration without printing credentials.
    with (backup / 'nextcloud.sql').open('wb') as output:
        subprocess.run(['docker', 'exec', 'postgres_shared', 'pg_dump', '-U',
                        'shiv_nextcloud', '-d', 'shiv_nextcloud'], stdout=output, check=True)
    run('docker', 'cp', 'shiv-nextcloud:/var/www/html/config', str(backup / 'config'))
    folder = root / 'ShivCloud'
    folder.mkdir(exist_ok=True)
    marker = root / '.shivcloud-drive-id'
    expected = 'shiv-cloud-passport-4tb-20261104\n'
    if marker.exists() and marker.read_text() != expected:
        raise SystemExit('Drive identity marker mismatch.')
    marker.write_text(expected)
    fstab = Path('/etc/fstab')
    line = 'D: /srv/shivcloud-hdd drvfs uid=33,gid=33,umask=0077,nofail 0 0\n'
    contents = fstab.read_text()
    if '/srv/shivcloud-hdd' not in contents:
        fstab.write_text(contents.rstrip() + '\n' + line)
    for name in ['compose.yml', 'hdd-storage-check.sh']:
        shutil.copy2(source / name, target / name)
    (target / 'hdd-storage-check.sh').chmod(0o755)
    run('docker', 'compose', '-f', str(target / 'compose.yml'), 'config', '--quiet')
    units = Path('/etc/systemd/system')
    (units / 'shiv-cloud-hdd.service').write_text('''[Unit]
Description=Verify and connect Shiv cloud HDD
After=docker.service
Requires=docker.service
[Service]
Type=oneshot
ExecStart=/opt/shiv-control/hdd-storage-check.sh
TimeoutStartSec=120
''')
    (units / 'shiv-cloud-hdd.timer').write_text('''[Unit]
Description=Keep Shiv cloud attached to its verified HDD
[Timer]
OnBootSec=20
OnUnitInactiveSec=60
Unit=shiv-cloud-hdd.service
[Install]
WantedBy=timers.target
''')
    run('systemctl', 'daemon-reload')
    run('systemctl', 'enable', '--now', 'shiv-cloud-hdd.timer')
    run('systemctl', 'start', 'shiv-cloud-hdd.service')
    print('HDD attached. Configuration/database backup: ' + str(backup))


if __name__ == '__main__':
    main()
