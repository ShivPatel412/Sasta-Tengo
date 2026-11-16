# Start the existing n8n server before Windows sign-in

Run `control-room/install-boot-startup.ps1` on the Windows PC as administrator, under the Windows account that owns the existing Ubuntu WSL distribution. This is not a Mac installer and does not enable automatic Windows sign-in.

The installer checks the existing distro, systemd, Docker, Cloudflare Tunnel service and n8n container first. It makes no attempt to install or replace them. It registers `Shiv-WSL-n8n-at-boot` under that Windows account, with a boot trigger delayed 30 seconds. The task holds WSL open with `sleep infinity`, has no execution time limit, ignores duplicate starts and retries failures. The older sign-in launcher can remain while the reboot test is performed.

## Run once on the Windows PC

1. Download the script from this repository and inspect it. Open **Windows PowerShell → Run as administrator** as the user who normally starts Ubuntu. Do not use a different administrator account or SYSTEM: WSL installations are per Windows user.
2. Change to the folder containing the downloaded script, then run:

```powershell
.\install-boot-startup.ps1 -WhatIf
.\install-boot-startup.ps1
```

The first command only checks the installation and describes the changes. The second asks for your **Windows account password, not your Hello PIN**. Enter it in the local credential prompt; never paste it in chat or into the script. Task Scheduler manages the saved credential. If the account is passwordless or Windows policy blocks this registration, stop and inspect the error; do not disable password/security policies. A later password change can require updating the task's saved credential.

If multiple n8n containers are detected, identify the existing server with `wsl -d Ubuntu -u root -- docker ps -a` and pass `-N8nContainer 'actual-container-name'`. Use `-Distribution 'actual-name'` if the registered distribution is not Ubuntu.

Docker and the existing Cloudflare Tunnel service are enabled at WSL boot. The installer sets `unless-stopped` on the existing n8n container, its currently running Compose siblings and named database/cache dependencies found in the n8n configuration. It starts those same containers without recreating them. A deliberately stopped container stays stopped across Docker restarts; start it explicitly before expecting automatic recovery. Alias/external dependency warnings require a separate check of that dependency's startup.

No workflows, environment secrets, Docker volumes, tunnel routes, Windows power settings, WSL configuration or other startup tasks are changed. If this named task already exists from this installer, its XML is backed up under `%LOCALAPPDATA%\ShivAutomation\task-backups` before updating it. Failures are reported; a partly completed installation must be inspected or rerun before relying on it.

## Verify before relying on it remotely

- Check that Task Scheduler shows this task as Running, using your account with a boot trigger and password logon. A long-running task can show `0x41301`; that indicates Running rather than a completed one-shot job.
- Check `https://n8n.shivpatel.in` from your phone over mobile data. Homepage access confirms reachability; it does not execute a workflow or prove every automation dependency works.
- At a quiet time, restart Windows. **Do not sign in.** Allow time for boot, WSL and containers to start, then open the URL again from the phone. Only this test verifies startup without an interactive login.
- After signing in, check `wsl -d Ubuntu -u root -- systemctl is-active docker cloudflared` and `wsl -d Ubuntu -u root -- docker ps` if troubleshooting is needed.

The PC still requires power, internet and an awake Windows host. This does not power on a shut-down PC or unlock a firmware/BitLocker pre-boot prompt. A task can restart WSL after failures; it cannot make services run during a Windows shutdown.

To undo the new task, run `Stop-ScheduledTask -TaskName 'Shiv-WSL-n8n-at-boot'` followed by `Unregister-ScheduledTask -TaskName 'Shiv-WSL-n8n-at-boot'`. This leaves the existing services, data and sign-in launcher in place. It does not stop the Docker service or n8n container. Restore any desired former restart policies separately.

References: [WSL user ownership](https://learn.microsoft.com/en-us/windows/wsl/setup/environment), [systemd and WSL lifetime](https://learn.microsoft.com/en-us/windows/wsl/systemd), [Task Scheduler registration](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/register-scheduledtask), and [Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/).
