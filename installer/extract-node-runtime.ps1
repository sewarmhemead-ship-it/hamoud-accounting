#Requires -Version 5.1
param(
    [Parameter(Mandatory = $true)]
    [string]$AppRoot,
    [string]$NodeVersion = 'v24.16.0'
)

$ErrorActionPreference = 'Stop'
$AppRoot = $AppRoot.TrimEnd('\', '/')
if ($NodeVersion -notmatch '^v') { $NodeVersion = "v$NodeVersion" }
$zipName = "node-$NodeVersion-win-x64.zip"
$verFile = Join-Path $AppRoot 'node-version.txt'
if (Test-Path -LiteralPath $verFile) {
    $fromFile = (Get-Content -LiteralPath $verFile -Raw).Trim()
    if ($fromFile) { $NodeVersion = $fromFile }
}
if ($NodeVersion -notmatch '^v') { $NodeVersion = "v$NodeVersion" }
$zipName = "node-$NodeVersion-win-x64.zip"
$zipPath = Join-Path $AppRoot $zipName
$outDir = Join-Path $AppRoot 'node-runtime'
$nodeExe = Join-Path $outDir 'node.exe'

if (Test-Path -LiteralPath $nodeExe) { return $nodeExe }
if (-not (Test-Path -LiteralPath $zipPath)) { throw "Node zip missing: $zipPath" }

$tmp = Join-Path $AppRoot 'node-extract-tmp'
if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force }
$null = New-Item -ItemType Directory -Path $tmp -Force
Expand-Archive -LiteralPath $zipPath -DestinationPath $tmp -Force

$inner = Get-ChildItem -LiteralPath $tmp -Directory | Select-Object -First 1
if (-not $inner) { throw "Invalid zip layout: $zipPath" }

if (Test-Path -LiteralPath $outDir) { Remove-Item -LiteralPath $outDir -Recurse -Force }
$null = New-Item -ItemType Directory -Path $outDir -Force
Copy-Item -LiteralPath (Join-Path $inner.FullName '*') -Destination $outDir -Recurse -Force
Remove-Item -LiteralPath $tmp -Recurse -Force

if (-not (Test-Path -LiteralPath $nodeExe)) { throw "node.exe missing after extract: $nodeExe" }
return $nodeExe
