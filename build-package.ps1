#Requires -Version 5.1
<#
  Customer Windows package — SewarTech / Hamoud Accounting
  Uses customer-ready.db only; never bundles backend/data/hamoud.db
#>
param(
  [string]$OutName = "HamoudAccounting-Customer",
  [switch]$SkipUiBuild,
  [switch]$SkipDeps,
  [switch]$NoZip
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Node = "C:\Program Files\nodejs\node.exe"
$Npm = "C:\Program Files\nodejs\npm.cmd"
$Backend = Join-Path $Root "backend"
$Dist = Join-Path $Root "dist\$OutName"
$ZipPath = Join-Path $Root "dist\$OutName.zip"

if (-not (Test-Path $Node)) {
  throw "Node.js not found at $Node. Install from https://nodejs.org"
}

Write-Host "=== Build customer-ready.db ===" -ForegroundColor Cyan
Push-Location $Backend
& $Node scripts/build-customer-ready-db.js
if (-not $SkipUiBuild) {
  Write-Host "=== Build frontend UI ===" -ForegroundColor Cyan
  $Frontend = Join-Path $Root "frontend"
  Push-Location $Frontend
  & $Npm install
  Pop-Location
  & $Npm run build:ui
  if (-not (Test-Path (Join-Path $Backend "public\index.html"))) {
    throw "UI build failed: backend/public/index.html missing"
  }
}
Pop-Location

$customerDb = Join-Path $Backend "seed-data\customer-ready.db"
if (-not (Test-Path $customerDb)) {
  throw "customer-ready.db missing after build"
}

Write-Host "=== Prepare package folder: $Dist ===" -ForegroundColor Cyan
if (Test-Path $Dist) { Remove-Item $Dist -Recurse -Force }
$pkgBackend = Join-Path $Dist "backend"
New-Item -ItemType Directory -Path $pkgBackend -Force | Out-Null

$copyItems = @(
  "src",
  "public",
  "server.js",
  "package.json",
  "package-lock.json",
  ".env.example"
)
foreach ($item in $copyItems) {
  $src = Join-Path $Backend $item
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $pkgBackend $item) -Recurse -Force
  }
}

$seedDest = Join-Path $pkgBackend "seed-data"
New-Item -ItemType Directory -Path $seedDest -Force | Out-Null
Copy-Item (Join-Path $Backend "seed-data\customer-ready.db") $seedDest -Force
Copy-Item (Join-Path $Backend "seed-data\centers-master.json") $seedDest -Force

$dataDir = Join-Path $pkgBackend "data"
New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
if (Test-Path (Join-Path $pkgBackend "data\hamoud.db")) {
  throw "Package must not include dev hamoud.db"
}

$envExample = Get-Content (Join-Path $pkgBackend ".env.example") -Raw
$envProd = $envExample -replace "NODE_ENV=development", "NODE_ENV=production"
$envProd | Set-Content (Join-Path $pkgBackend ".env") -Encoding UTF8

if (-not $SkipDeps) {
  Write-Host "=== npm ci --omit=dev (may take a few minutes) ===" -ForegroundColor Cyan
  Push-Location $pkgBackend
  & $Npm ci --omit=dev 2>&1 | Write-Host
  if ($LASTEXITCODE -ne 0) {
    Pop-Location
    throw "npm ci failed in package backend (exit $LASTEXITCODE)"
  }
  if (-not (Test-Path (Join-Path $pkgBackend "node_modules\better-sqlite3"))) {
    Pop-Location
    throw "node_modules missing after npm ci"
  }
  # Use prebuilt better-sqlite3 from dev backend (matches C:\Program Files\nodejs)
  $srcSqlite = Join-Path $Backend "node_modules\better-sqlite3"
  $destSqlite = Join-Path $pkgBackend "node_modules\better-sqlite3"
  if (Test-Path $srcSqlite) {
    if (Test-Path $destSqlite) { Remove-Item $destSqlite -Recurse -Force }
    Copy-Item $srcSqlite $destSqlite -Recurse -Force
    Write-Host "Copied better-sqlite3 native binary from dev backend" -ForegroundColor DarkGray
  }
  Pop-Location
}

Copy-Item (Join-Path $Root "start-customer.bat") $Dist -Force
Copy-Item (Join-Path $Root "backup-db.bat") $Dist -Force
$guide = Join-Path $Root "docs\dalil-alzaboon.md"
if (-not (Test-Path $guide)) {
  $guide = Get-ChildItem (Join-Path $Root "docs") -Filter "*.md" | Select-Object -First 1 -ExpandProperty FullName
}
if ($guide) { Copy-Item $guide $Dist -Force }

if (-not $NoZip) {
  Write-Host "=== Create ZIP ===" -ForegroundColor Cyan
  $distParent = Join-Path $Root "dist"
  if (-not (Test-Path $distParent)) { New-Item -ItemType Directory -Path $distParent | Out-Null }
  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
  Compress-Archive -Path $Dist -DestinationPath $ZipPath -CompressionLevel Optimal
  Write-Host "ZIP: $ZipPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Package ready:" -ForegroundColor Green
Write-Host "  Folder: $Dist"
Write-Host "  Seed DB: backend\seed-data\customer-ready.db"
Write-Host "  No dev DB in backend\data\ (created on first run)"
Write-Host "  Run: start-customer.bat"
Write-Host "  Customer guide: docs\dalil-alzaboon.md (Arabic)"
