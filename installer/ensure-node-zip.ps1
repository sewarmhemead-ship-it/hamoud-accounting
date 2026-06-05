#Requires -Version 5.1
param(
    [string]$OutDir = $PSScriptRoot,
    [string]$NodeVersion = 'v20.20.2'
)

$ErrorActionPreference = 'Stop'
if ($NodeVersion -notmatch '^v') { $NodeVersion = "v$NodeVersion" }
$zipName = "node-$NodeVersion-win-x64.zip"
$destZip = Join-Path $OutDir $zipName

if (Test-Path $destZip) {
    Write-Host "    Node zip OK: $destZip" -ForegroundColor DarkGray
    return $destZip
}

$url = "https://nodejs.org/dist/$NodeVersion/$zipName"
$cacheDir = Join-Path $env:TEMP 'hamoud-node-cache'
$null = New-Item -ItemType Directory -Path $cacheDir -Force
$cacheZip = Join-Path $cacheDir $zipName

if (-not (Test-Path $cacheZip)) {
    Write-Host "    Downloading $url ..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $url -OutFile $cacheZip -UseBasicParsing
}
Copy-Item -LiteralPath $cacheZip -Destination $destZip -Force
Write-Host "    Node zip ready: $destZip" -ForegroundColor Green
return $destZip
