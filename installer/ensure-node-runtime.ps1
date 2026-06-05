#Requires -Version 5.1
<#
.SYNOPSIS
  Downloads Node.js 20 LTS win-x64 zip and extracts to a target folder (node.exe at root).
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$TargetDir,
    [string]$NodeVersion = 'v20.20.2'
)

$ErrorActionPreference = 'Stop'

if ($NodeVersion -notmatch '^v') { $NodeVersion = "v$NodeVersion" }
$zipName = "node-$NodeVersion-win-x64.zip"
$url = "https://nodejs.org/dist/$NodeVersion/$zipName"
$ver = $NodeVersion -replace '^v', ''
$nodeExe = Join-Path $TargetDir 'node.exe'

if (Test-Path $nodeExe) {
    $v = (& $nodeExe -v 2>$null).Trim()
    if ($v -eq $NodeVersion) {
        Write-Host "    Node runtime OK: $nodeExe ($v)" -ForegroundColor DarkGray
        return $TargetDir
    }
    Write-Host "    Replacing Node $v with $NodeVersion ..." -ForegroundColor Yellow
    Remove-Item -LiteralPath $TargetDir -Recurse -Force -ErrorAction SilentlyContinue
}

$cacheDir = Join-Path $env:TEMP 'hamoud-node-cache'
$null = New-Item -ItemType Directory -Path $cacheDir -Force
$zipPath = Join-Path $cacheDir $zipName

if (-not (Test-Path $zipPath)) {
    Write-Host "    Downloading $url ..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
}

$extractRoot = Join-Path $env:TEMP "node-extract-$ver"
if (Test-Path $extractRoot) { Remove-Item -LiteralPath $extractRoot -Recurse -Force }
$null = New-Item -ItemType Directory -Path $extractRoot -Force
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractRoot -Force

$inner = Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1
if (-not $inner -or -not (Test-Path (Join-Path $inner.FullName 'node.exe'))) {
    throw "Invalid Node zip layout: $zipPath"
}

if (Test-Path $TargetDir) { Remove-Item -LiteralPath $TargetDir -Recurse -Force }
$null = New-Item -ItemType Directory -Path $TargetDir -Force
Copy-Item -LiteralPath (Join-Path $inner.FullName '*') -Destination $TargetDir -Recurse -Force

Start-Sleep -Milliseconds 500
if (-not (Test-Path $nodeExe)) {
    throw "node.exe missing after extract (antivirus may have blocked it): $nodeExe"
}
$verOut = & $nodeExe -v
Write-Host "    Node runtime ready: $nodeExe ($verOut)" -ForegroundColor Green
return $TargetDir
