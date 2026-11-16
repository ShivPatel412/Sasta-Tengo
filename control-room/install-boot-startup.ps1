#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
Run on the Windows PC, as the Windows account that owns the existing WSL distro.
This registers an AtStartup task, not an automatic Windows sign-in.
Use -WhatIf to inspect the proposed change without prompting for credentials.
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_.-]*$')]
    [string]$Distribution = 'Ubuntu',
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_.-]*$')]
    [string]$N8nContainer
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$wslExecutable = Join-Path $env:WINDIR 'System32\wsl.exe'
$taskName = 'Shiv-WSL-n8n-at-boot'
$taskDescription = 'ShivAutomation: keep the existing WSL n8n server online before Windows sign-in.'
$account = [Security.Principal.WindowsIdentity]::GetCurrent().Name

function Invoke-ExistingWsl {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    $output = & $wslExecutable --distribution $Distribution --user root --exec @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "WSL command '$($Arguments[0])' failed with exit code $LASTEXITCODE. Setup is incomplete."
    }
    return ($output -join "`n").Trim()
}

function Find-N8nContainer {
    param([string[]]$Inventory, [string]$RequestedName)
    $candidates = @($Inventory | Where-Object {
        $parts = $_ -split '\|', 2
        $parts.Count -eq 2 -and $parts[1] -match '(^|/)n8n(:|@|$)' -and (-not $RequestedName -or $parts[0] -ceq $RequestedName)
    })
    if ($candidates.Count -ne 1) {
        throw 'Could not identify exactly one existing n8n container. Run docker ps -a in WSL, then rerun with -N8nContainer followed by its container name.'
    }
    return ($candidates[0] -split '\|', 2)[0].Trim()
}

if (-not (Test-Path -LiteralPath $wslExecutable)) { throw 'WSL is not installed on this Windows account.' }
$distributions = @((& $wslExecutable --list --quiet) | ForEach-Object { ($_ -replace "`0", '').Trim() })
if ($LASTEXITCODE -ne 0 -or $Distribution -notin $distributions) {
    throw "The '$Distribution' distribution is not registered to $account. Run this as the Windows user who owns WSL."
}
if ((Invoke-ExistingWsl -Arguments @('cat', '/proc/1/comm')) -ne 'systemd') {
    throw 'This distro is not running systemd. Enable systemd in its existing /etc/wsl.conf first; do not replace that file or shut down running workflows without planning the restart.'
}
Invoke-ExistingWsl -Arguments @('systemctl', 'cat', 'docker.service', 'cloudflared.service') | Out-Null
Invoke-ExistingWsl -Arguments @('docker', 'info', '--format', '{{.ServerVersion}}') | Out-Null
$inventory = (Invoke-ExistingWsl -Arguments @('docker', 'ps', '-a', '--format', '{{.Names}}|{{.Image}}')) -split "`n"
$N8nContainer = Find-N8nContainer -Inventory $inventory -RequestedName $N8nContainer
$n8nInspection = @(ConvertFrom-Json (Invoke-ExistingWsl -Arguments @('docker', 'inspect', $N8nContainer)))[0]
if ($n8nInspection.Config.Image -notmatch '(^|/)n8n(:|@|$)') { throw 'The selected container is not an n8n image. No startup task was changed.' }

# Include running Compose siblings (workers/databases), never stopped one-off jobs.
$containers = @($N8nContainer)
$labels = $n8nInspection.Config.Labels
if ($null -ne $labels) {
    $projectProperty = $labels.PSObject.Properties['com.docker.compose.project']
    if ($null -ne $projectProperty -and $projectProperty.Value) {
        $siblings = Invoke-ExistingWsl -Arguments @('docker', 'ps', '--filter', "label=com.docker.compose.project=$($projectProperty.Value)", '--format', '{{.Names}}')
        if ($siblings) { $containers += $siblings -split "`n" }
    }
}
# Shared database/cache containers may live outside n8n's Compose project.
# Never print container environment values: they can contain credentials.
foreach ($entry in $n8nInspection.Config.Env) {
    if ($entry -match '^(DB_POSTGRESDB_HOST|QUEUE_BULL_REDIS_HOST)=(.+)$') {
        $dependencyHost = $Matches[2]
        $namedDependency = @($inventory | Where-Object { ($_ -split '\|', 2)[0] -ceq $dependencyHost })
        if ($namedDependency.Count -eq 1) { $containers += $dependencyHost }
        else { Write-Warning 'A configured database/cache host is an alias or external server. Verify that dependency starts automatically too.' }
    }
}
$containers = @($containers | Where-Object { $_ } | Sort-Object -Unique)
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and $existing.Description -ne $taskDescription) { throw "A different task already uses '$taskName'. It will not be overwritten." }
if ($existing -and $existing.Principal.UserId -ine $account -and $existing.Principal.UserId -ne [Security.Principal.WindowsIdentity]::GetCurrent().User.Value) {
    throw 'The existing startup task belongs to another Windows account. It will not be overwritten.'
}

Write-Host "Windows account: $account"
Write-Host "WSL distribution: $Distribution"
Write-Host "Existing containers to start automatically: $($containers -join ', ')"
if (-not $PSCmdlet.ShouldProcess("$account / $Distribution", 'Enable Docker and tunnel startup, set container restart policies, and register the before-sign-in WSL task')) { return }

$credential = Get-Credential -UserName $account -Message 'Enter this Windows account password, NOT the Windows Hello PIN. Task Scheduler needs it to run before sign-in. It is not saved in this script.'
if ($null -eq $credential) { throw 'Cancelled. No startup settings were changed.' }
if ($credential.UserName -ine $account) { throw 'Use the same Windows account that owns this WSL installation.' }
if ($existing) {
    $backupDirectory = Join-Path $env:LOCALAPPDATA 'ShivAutomation\task-backups'
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    Export-ScheduledTask -TaskName $taskName | Set-Content -LiteralPath (Join-Path $backupDirectory ("boot-task-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.xml')) -Encoding Unicode
}

# Run wsl.exe directly: a detached Start-Process launcher exits immediately and
# would prevent Task Scheduler from supervising the actual WSL keep-alive process.
$action = New-ScheduledTaskAction -Execute $wslExecutable -Argument "--distribution $Distribution --user root --exec /bin/sleep infinity"
$trigger = New-ScheduledTaskTrigger -AtStartup
$trigger.Delay = 'PT30S'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
$taskPassword = $credential.GetNetworkCredential().Password
try {
    Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $trigger -Settings $settings -User $account -Password $taskPassword -RunLevel Limited -Force | Out-Null
} finally {
    $taskPassword = $null
    $credential = $null
}
Invoke-ExistingWsl -Arguments @('systemctl', 'enable', '--now', 'docker.service', 'cloudflared.service') | Out-Null
foreach ($container in $containers) {
    Invoke-ExistingWsl -Arguments @('docker', 'update', '--restart', 'unless-stopped', $container) | Out-Null
    Invoke-ExistingWsl -Arguments @('docker', 'start', $container) | Out-Null
}
Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 3
$registered = Get-ScheduledTask -TaskName $taskName
if ($registered.Principal.LogonType -ne 'Password') {
    throw 'The task is not configured for unattended password logon. Inspect its General tab before relying on startup without sign-in.'
}
if ($registered.State -ne 'Running') {
    $result = (Get-ScheduledTaskInfo -TaskName $taskName).LastTaskResult
    throw "The task is not running (result $result). Check Task Scheduler and the Windows account password. Do not rely on unattended startup yet."
}
Write-Host 'Startup task is running. No reboot has been performed.'
Write-Host 'Next: restart Windows when no workflows are running, remain at the sign-in screen, and check https://n8n.shivpatel.in from your phone.'
Write-Host 'Until that reboot test passes, before-sign-in startup is not yet verified.'
