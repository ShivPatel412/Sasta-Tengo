# Parse the installer without executing it. Only the pure container-selection
# function is loaded below; no Windows, WSL, credential or scheduler calls run.
$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot '../control-room/install-boot-startup.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) { throw ($parseErrors | Out-String) }
$functionAst = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Find-N8nContainer' }, $true)
if ($null -eq $functionAst) { throw 'Container selection function missing.' }
. ([scriptblock]::Create($functionAst.Extent.Text))

if ((Find-N8nContainer -Inventory @('database|postgres:17', 'automation|docker.n8n.io/n8nio/n8n:2.0')) -ne 'automation') { throw 'Registry-qualified image was not detected.' }
if ((Find-N8nContainer -Inventory @('one|n8nio/n8n:latest', 'two|n8nio/n8n:latest') -RequestedName 'two') -ne 'two') { throw 'Explicit selection failed.' }
if ((Find-N8nContainer -Inventory @('server|n8nio/n8n@sha256:abc')) -ne 'server') { throw 'Digest-pinned image was not detected.' }
foreach ($inventory in @(
    @('database|postgres:17'),
    @('fake|example/n8n-helper:latest'),
    @('one|n8nio/n8n:latest', 'two|n8nio/n8n:latest')
)) {
    $rejected = $false
    try { Find-N8nContainer -Inventory $inventory | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'An absent, wrong or ambiguous n8n container must be rejected.' }
}
$rejected = $false
try { Find-N8nContainer -Inventory @('database|postgres:17', 'server|n8nio/n8n:latest') -RequestedName 'database' | Out-Null } catch { $rejected = $true }
if (-not $rejected) { throw 'Explicit selection must not target a database container.' }
Write-Host 'Passed: installer syntax and safe container selection. Windows startup behavior still requires an on-PC reboot test.'
