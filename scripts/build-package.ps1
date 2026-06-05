#Requires -Version 5.1
<#
.SYNOPSIS
  Builds customer package under release/HamoudAccounting
.PARAMETER Zip
  Also creates release/HamoudAccounting.zip
.PARAMETER SkipSmokeTest
  Skip health check smoke test
#>
param(
    [string]$OutDir = "",
    [switch]$Zip,
    [switch]$SkipSmokeTest
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackendSrc = Join-Path $RepoRoot "backend"
$FrontendSrc = Join-Path $RepoRoot "frontend"
$Npm = "C:\Program Files\nodejs\npm.cmd"
$Node = "C:\Program Files\nodejs\node.exe"
$NodeDir = [System.IO.Path]::GetDirectoryName($Node)

if (-not (Test-Path $Npm)) { throw "npm not found: $Npm (install Node.js 20 LTS)" }
# npm must use the same Node as start-prod.bat (not Cursor/helper node on PATH)
$env:PATH = "$NodeDir;" + (($env:PATH -split ';' | Where-Object { $_ -and ($_ -ne $NodeDir) }) -join ';')
Write-Host "Build Node: $(& $Node -v)" -ForegroundColor DarkGray
if (-not (Test-Path $Node)) { throw "node not found: $Node" }

$ReleaseRoot = Join-Path $RepoRoot "release"
if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $PackageRoot = Join-Path $ReleaseRoot "HamoudAccounting"
} else {
    $PackageRoot = (Resolve-Path -LiteralPath $OutDir -ErrorAction SilentlyContinue)
    if (-not $PackageRoot) { $PackageRoot = (Join-Path $RepoRoot $OutDir) }
    $PackageRoot = [System.IO.Path]::GetFullPath($PackageRoot)
}

$CustomerDb = Join-Path $BackendSrc "seed-data\customer-ready.db"
$CentersJson = Join-Path $BackendSrc "seed-data\centers-master.json"
$DevDb = Join-Path $BackendSrc "data\hamoud.db"
$CustomerNodeVersion = (& $Node -v).Trim()

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Invoke-Npm {
    param(
        [string]$WorkingDir,
        [string[]]$NpmArgs,
        [string]$NpmCmd = $Npm
    )
    $argLine = ($NpmArgs -join " ")
    Write-Host "    npm $argLine  (cwd: $WorkingDir)"
    Push-Location $WorkingDir
    try {
        & $NpmCmd @NpmArgs
        if ($LASTEXITCODE -ne 0) { throw "npm failed (exit $LASTEXITCODE): npm $argLine" }
    } finally {
        Pop-Location
    }
}

Write-Step "Customer DB (customer-ready.db)"
if (-not (Test-Path $CustomerDb)) {
    Write-Host "    missing - running build:customer-db ..."
    Invoke-Npm $BackendSrc @("run", "build:customer-db")
}
if (-not (Test-Path $CustomerDb)) { throw "Failed to create $CustomerDb" }
if (-not (Test-Path $CentersJson)) { throw "Missing $CentersJson" }

function Copy-UiToPublic {
    $dist = Join-Path $FrontendSrc "dist"
    $publicDir = Join-Path $BackendSrc "public"
    if (-not (Test-Path (Join-Path $dist "index.html"))) {
        throw "No frontend/dist/index.html - run: cd frontend; npm ci; npm run build"
    }
    if (Test-Path $publicDir) { Remove-Item -LiteralPath $publicDir -Recurse -Force }
    Copy-Item -LiteralPath $dist -Destination $publicDir -Recurse -Force
    $srcPublic = Join-Path $FrontendSrc "public"
    if (Test-Path $srcPublic) {
        Get-ChildItem -LiteralPath $srcPublic -File | ForEach-Object {
            $dest = Join-Path $publicDir $_.Name
            if (-not (Test-Path $dest)) {
                Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
            }
        }
    }
    Write-Host "    copied frontend/dist -> backend/public (+ public assets)"
}

Write-Step "Build UI (build:ui or reuse frontend/dist)"
$PublicBuilt = Join-Path $BackendSrc "public\index.html"
$buildOk = $false
try {
    Invoke-Npm $BackendSrc @("run", "build:ui")
    $buildOk = Test-Path $PublicBuilt
} catch {
    Write-Host "    build:ui failed: $($_.Exception.Message)" -ForegroundColor Yellow
}
if (-not $buildOk) {
    Write-Host "    trying npm ci + build in frontend ..."
    try {
        Invoke-Npm $FrontendSrc @("ci")
        Invoke-Npm $FrontendSrc @("run", "build")
        Copy-UiToPublic
        $buildOk = Test-Path $PublicBuilt
    } catch {
        Write-Host "    frontend npm ci/build failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "    falling back to existing frontend/dist ..."
        Copy-UiToPublic
        $buildOk = Test-Path $PublicBuilt
    }
}
if (-not $buildOk) { throw "UI build failed: $PublicBuilt" }
if (-not (Test-Path (Join-Path $BackendSrc "public\index.html"))) {
    throw "UI build failed: public/index.html missing"
}

Write-Step "Prepare package folder: $PackageRoot"
if (Test-Path $PackageRoot) {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    try {
        Remove-Item -LiteralPath $PackageRoot -Recurse -Force
    } catch {
        cmd /c "rmdir /s /q `"$PackageRoot`"" 2>$null
        if (Test-Path $PackageRoot) { throw "Cannot clear $PackageRoot (close Hamoud Server / node): $($_.Exception.Message)" }
    }
}
$null = New-Item -ItemType Directory -Path $PackageRoot -Force
$BackendDst = Join-Path $PackageRoot "backend"
$null = New-Item -ItemType Directory -Path $BackendDst -Force

Write-Step "Copy backend (exclude tests, node_modules, .env, dev hamoud.db)"
$robocopyArgs = @(
    $BackendSrc, $BackendDst,
    "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS",
    "/XD", "tests", "node_modules",
    "/XF", "hamoud.db", "hamoud.db-wal", "hamoud.db-shm", ".env"
)
& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed (exit $LASTEXITCODE)" }

$leakedDevDb = Join-Path $BackendDst "data\hamoud.db"
if (Test-Path $leakedDevDb) {
    Remove-Item -LiteralPath $leakedDevDb -Force
    Write-Host "    removed accidental dev hamoud.db copy" -ForegroundColor Yellow
}

Write-Step "Install DB: customer-ready.db -> data/hamoud.db + seed-data"
$dataDir = Join-Path $BackendDst "data"
$seedDir = Join-Path $BackendDst "seed-data"
$null = New-Item -ItemType Directory -Path $dataDir -Force
$null = New-Item -ItemType Directory -Path $seedDir -Force
Copy-Item -LiteralPath $CustomerDb -Destination (Join-Path $seedDir "customer-ready.db") -Force
Copy-Item -LiteralPath $CentersJson -Destination (Join-Path $seedDir "centers-master.json") -Force
Copy-Item -LiteralPath $CustomerDb -Destination (Join-Path $dataDir "hamoud.db") -Force
Write-Host "    restore.js copies seed-data/customer-ready.db if hamoud.db missing/empty (centers=0)" -ForegroundColor DarkGray

Write-Step "Production npm ci --omit=dev (build machine Node)"
Invoke-Npm $BackendDst @("ci", "--omit=dev")
$BundleNode = $Node

Write-Step "Bundle Node.js $CustomerNodeVersion zip for customer"
$ensureZip = Join-Path $RepoRoot "installer\ensure-node-zip.ps1"
if (-not (Test-Path $ensureZip)) { throw "Missing $ensureZip" }
$nodeZip = & $ensureZip -OutDir (Join-Path $RepoRoot "installer") -NodeVersion $CustomerNodeVersion
Copy-Item -LiteralPath $nodeZip -Destination (Join-Path $PackageRoot (Split-Path $nodeZip -Leaf)) -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "installer\extract-node-runtime.ps1") -Destination (Join-Path $PackageRoot "extract-node-runtime.ps1") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "installer\first-run-setup.ps1") -Destination (Join-Path $PackageRoot "first-run-setup.ps1") -Force
Set-Content -LiteralPath (Join-Path $PackageRoot "node-version.txt") -Value $CustomerNodeVersion -Encoding ASCII

Write-Step "Create package backend/.env"
$envContent = @"
# Hamoud customer package - SewarTech
NODE_ENV=production
PORT=3001
DB_PATH=./data/hamoud.db
JWT_SECRET=CHANGE-ME-use-a-long-random-secret-before-go-live
JWT_EXPIRES_IN=7d
# ADMIN_PASSWORD=admin123
# UI uses relative /api - no VITE_API_BASE needed in production
"@
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $BackendDst ".env"), $envContent.Trim(), $utf8NoBom)

Write-Step "Launcher scripts (start-prod.bat, start.bat, backup-db.bat)"
$patchStart = Join-Path $RepoRoot "installer\patch-start-prod.ps1"
if (Test-Path $patchStart) {
    & $patchStart -PackageDir $PackageRoot | Out-Null
} else {
    throw "Missing $patchStart"
}

@'
@echo off
chcp 65001 >nul
call "%~dp0start-prod.bat"
'@ | Set-Content -LiteralPath (Join-Path $PackageRoot "start.bat") -Encoding ASCII

@'
@echo off
chcp 65001 >nul
setlocal
set ROOT=%~dp0
set DB=%ROOT%backend\data\hamoud.db
if not exist "%DB%" (
  echo DB not found: backend\data\hamoud.db
  pause
  exit /b 1
)
if not exist "%ROOT%backups" mkdir "%ROOT%backups"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set STAMP=%%i
set OUT=%ROOT%backups\hamoud_%STAMP%.db
copy /Y "%DB%" "%OUT%" >nul
if exist "%ROOT%backend\data\hamoud.db-wal" copy /Y "%ROOT%backend\data\hamoud.db-wal" "%OUT%-wal" >nul
if exist "%ROOT%backend\data\hamoud.db-shm" copy /Y "%ROOT%backend\data\hamoud.db-shm" "%OUT%-shm" >nul
echo Backup: %OUT%
pause
'@ | Set-Content -LiteralPath (Join-Path $PackageRoot "backup-db.bat") -Encoding ASCII

Write-Step "README (Arabic)"
$readmePath = Join-Path $PackageRoot "README-customer.md"
$readmeSrc = Join-Path $RepoRoot "docs\dalil-alzaboon.md"
if (Test-Path $readmeSrc) {
    Copy-Item -LiteralPath $readmeSrc -Destination $readmePath -Force
} else {
    Set-Content -LiteralPath $readmePath -Value "# Hamoud customer package - SewarTech" -Encoding UTF8
}
$utf8Bom = New-Object System.Text.UTF8Encoding $true

$quickReadmePath = Join-Path $PackageRoot "START-HERE.txt"
$quickLines = @(
    "Hamoud Accounting - SewarTech",
    "1) Extract ZIP to a fixed folder",
    "2) Run start-prod.bat only - do NOT install Node manually",
    "3) Browser: http://localhost:3001",
    "4) Login: admin / admin123",
    "Uses bundled Node.js in node-runtime (no manual install)"
)
[System.IO.File]::WriteAllLines($quickReadmePath, $quickLines, $utf8Bom)

if ($Zip) {
    Write-Step "Create ZIP"
    if (-not (Test-Path $ReleaseRoot)) { $null = New-Item -ItemType Directory -Path $ReleaseRoot -Force }
    $zipPath = Join-Path $ReleaseRoot "HamoudAccounting.zip"
    if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Compress-Archive -LiteralPath $PackageRoot -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Host "    $zipPath"
}

if (-not $SkipSmokeTest) {
    Write-Step "Smoke test: DB counts + /api/health"
    $dbPath = Join-Path $BackendDst "data\hamoud.db"
    Push-Location $BackendDst
    try {
        $env:SMOKE_DB = $dbPath
        $countsJson = & $BundleNode (Join-Path $BackendDst "scripts\smoke-package-counts.js")
        Remove-Item Env:SMOKE_DB -ErrorAction SilentlyContinue
        $counts = $countsJson | ConvertFrom-Json
        if ($counts.centers -ne 15) { throw "Expected 15 centers, got $($counts.centers)" }
        if ($counts.shipments -ne 0) { throw "Expected 0 shipments, got $($counts.shipments)" }
        Write-Host "    DB OK: centers=$($counts.centers), shipments=$($counts.shipments)" -ForegroundColor Green
    } finally {
        Pop-Location
    }

    $smokePort = 30991
    $proc = $null
    try {
        $env:NODE_ENV = "production"
        $env:PORT = "$smokePort"
        $proc = Start-Process -FilePath $BundleNode -ArgumentList "server.js" `
            -WorkingDirectory $BackendDst -PassThru -WindowStyle Hidden
        $healthUrl = "http://127.0.0.1:$smokePort/api/health"
        $ok = $false
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Milliseconds 500
            try {
                $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
                if ($r.StatusCode -eq 200) { $ok = $true; break }
            } catch { }
        }
        if (-not $ok) { throw "Health check timeout: $healthUrl" }
        Write-Host "    Health OK: $healthUrl" -ForegroundColor Green
    } finally {
        if ($proc -and -not $proc.HasExited) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $BundleNode } | Stop-Process -Force -ErrorAction SilentlyContinue
        }
    }
}

$sizeBytes = (Get-ChildItem -LiteralPath $PackageRoot -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
$sizeMb = [math]::Round($sizeBytes / 1MB, 1)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  PACKAGE READY" -ForegroundColor Green
Write-Host "  Path: $PackageRoot" -ForegroundColor Green
Write-Host "  Size: ~$sizeMb MB" -ForegroundColor Green
if ($Zip) { Write-Host "  ZIP: $(Join-Path $ReleaseRoot 'HamoudAccounting.zip')" -ForegroundColor Green }
Write-Host "========================================" -ForegroundColor Green
if (Test-Path $DevDb) {
    Write-Host "  Dev DB was NOT packaged: $DevDb" -ForegroundColor DarkGray
}
