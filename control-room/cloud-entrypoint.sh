#!/bin/sh
set -eu
installed() {
  php -r '$CONFIG=[]; if (is_file("/var/www/html/config/config.php")) { require "/var/www/html/config/config.php"; } exit(!empty($CONFIG["installed"])?0:1);'
}
while ! installed && [ ! -s /run/cloud-init/admin-password ]; do sleep 5; done
if ! installed; then
  # The first image copy can exist before the owner completes account setup.
  # Only reset this generated version marker; never remove configuration or data.
  rm -f /var/www/html/version.php
fi
exec /entrypoint.sh apache2-foreground
