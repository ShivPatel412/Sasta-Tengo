"""The missing/wrong USB drive must never start the file services."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


class DriveGuardTests(unittest.TestCase):
    def test_only_expected_mounted_drive_can_start_cloud(self):
        script = Path(__file__).with_name('hdd-storage-check.sh').read_text()
        for mounted, marker, allowed in [(True, 'wrong', False), (False, '', False),
                                         (True, 'shiv-cloud-passport-4tb-20261104', True)]:
            with self.subTest(mounted=mounted, marker=marker), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                (root / '.shivcloud-drive-id').write_text(marker)
                for name, body in [('mountpoint', 'exit ' + ('0' if mounted else '1')),
                                   ('mount', 'exit 1'), ('docker', 'echo "$@"')]:
                    command = root / name
                    command.write_text('#!/bin/sh\n' + body + '\n')
                    command.chmod(0o755)
                env = dict(os.environ, PATH=str(root) + ':' + os.environ['PATH'])
                result = subprocess.run(['sh'], input=script.replace('ROOT=/srv/shivcloud-hdd',
                                        'ROOT=' + directory), env=env, text=True,
                                        capture_output=True, check=True)
                self.assertEqual('up -d' in result.stdout, allowed)
                self.assertEqual('stop nextcloud cron' in result.stdout, not allowed)


if __name__ == '__main__':
    unittest.main()
