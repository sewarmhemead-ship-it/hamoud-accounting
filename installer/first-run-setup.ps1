#Requires -Version 5.1
param(
    [Parameter(Mandatory = $true)]
    [string]$AppRoot
)

$ErrorActionPreference = 'Stop'
$AppRoot = $AppRoot.TrimEnd('\', '/')
$flag = Join-Path $AppRoot 'backend\.sqlite-ready'

if (Test-Path -LiteralPath $flag) { exit 0 }

$extract = Join-Path $AppRoot 'extract-node-runtime.ps1'
if (-not (Test-Path -LiteralPath $extract)) { throw "Missing extract-node-runtime.ps1" }
& $extract -AppRoot $AppRoot | Out-Null

$nodeExe = Join-Path $AppRoot 'node-runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodeExe)) { throw "node-runtime\node.exe not found" }

Write-Host "SewarTech: verifying database module..." -ForegroundColor Cyan
Push-Location (Join-Path $AppRoot 'backend')
try {
    & $nodeExe -e "require('better-sqlite3'); console.log('sqlite-ok')"
    if ($LASTEXITCODE -ne 0) { throw "better-sqlite3 check failed" }
} finally {
    Pop-Location
}

'ok' | Set-Content -LiteralPath $flag -Encoding ASCII
Write-Host "SewarTech: ready." -ForegroundColor Green
