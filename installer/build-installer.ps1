#Requires -Version 5.1
param(
    [switch]$SkipPackageBuild,
    [switch]$SkipWinget,
    [switch]$ForceIExpress
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$InstallerDir = Join-Path $RepoRoot 'installer'
$PackageDir = Join-Path $RepoRoot 'release\HamoudAccounting'
$IssFile = Join-Path $InstallerDir 'HamoudAccounting.iss'
$OutExe = Join-Path $RepoRoot 'release\HamoudAccounting-Setup.exe'
$InnoUrl = 'https://github.com/jrsoftware/issrc/releases/download/is-6_7_3/innosetup-6.7.3.exe'

function Find-ISCC {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
        "${env:LocalAppData}\Programs\Inno Setup 6\ISCC.exe"
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }
    return $null
}

function Ensure-PackageReady {
    if (-not $SkipPackageBuild) {
        if (-not (Test-Path $PackageDir)) {
            Write-Host '==> Building application package first...' -ForegroundColor Yellow
            $buildPkg = Join-Path $RepoRoot 'scripts\build-package.ps1'
            if (-not (Test-Path $buildPkg)) { throw "Missing $buildPkg" }
            & $buildPkg -SkipSmokeTest
        }
    }
    if (-not (Test-Path $PackageDir)) {
        throw "Package folder missing: $PackageDir - run scripts\build-package.ps1"
    }

    Write-Host '==> Bundling Node.js 20 LTS zip (extract on install)...' -ForegroundColor Cyan
    $nodeZip = & (Join-Path $InstallerDir 'ensure-node-zip.ps1') -OutDir $InstallerDir
    Copy-Item -LiteralPath $nodeZip -Destination (Join-Path $PackageDir (Split-Path $nodeZip -Leaf)) -Force
    Copy-Item -LiteralPath (Join-Path $InstallerDir 'extract-node-runtime.ps1') -Destination (Join-Path $PackageDir 'extract-node-runtime.ps1') -Force
    & (Join-Path $InstallerDir 'patch-start-prod.ps1') -PackageDir $PackageDir | Out-Null
}

function Install-InnoSetup {
    $innoExe = Join-Path $env:TEMP 'innosetup-6.7.3.exe'
    Write-Host '==> Downloading Inno Setup 6.7.3 from GitHub...' -ForegroundColor Yellow
    Invoke-WebRequest -Uri $InnoUrl -OutFile $innoExe -UseBasicParsing
    if (-not (Test-Path $innoExe)) { throw "Failed to download Inno Setup" }
    Write-Host '==> Installing Inno Setup (silent)...' -ForegroundColor Yellow
    $proc = Start-Process -FilePath $innoExe -ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/SP-' -Wait -PassThru
    if ($proc.ExitCode -ne 0) { throw "Inno Setup installer exit code: $($proc.ExitCode)" }
    Start-Sleep -Seconds 2
}

function Build-InnoInstaller {
    param([string]$Iscc)
    Write-Host "==> Compiling with Inno Setup: $Iscc" -ForegroundColor Cyan
    & $Iscc $IssFile
    if ($LASTEXITCODE -ne 0) { throw "ISCC failed (exit $LASTEXITCODE)" }
}

function Build-IExpressInstaller {
    $fallback = Join-Path $InstallerDir 'build-installer-iexpress.ps1'
    if (-not (Test-Path $fallback)) { throw "IExpress fallback missing: $fallback" }
    Write-Host '==> Fallback: IExpress self-extracting Setup.exe' -ForegroundColor Yellow
    & $fallback -PackageDir $PackageDir -OutExe $OutExe
}

Write-Host '==> SewarTech - Windows installer build' -ForegroundColor Cyan

& (Join-Path $InstallerDir 'create-setup-icon.ps1')
Ensure-PackageReady

if ($ForceIExpress) {
    Build-IExpressInstaller
} else {
    $iscc = Find-ISCC
    if (-not $iscc -and -not $SkipWinget) {
        Write-Host '==> Inno Setup not found - trying winget...' -ForegroundColor Yellow
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            winget install --id JRSoftware.InnoSetup -e --accept-package-agreements --accept-source-agreements 2>$null
            $iscc = Find-ISCC
        }
    }
    if (-not $iscc) {
        try {
            Install-InnoSetup
            $iscc = Find-ISCC
        } catch {
            Write-Host "Inno Setup install failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    if ($iscc) {
        try {
            Build-InnoInstaller -Iscc $iscc
        } catch {
            Write-Host "Inno compile failed: $($_.Exception.Message)" -ForegroundColor Red
            Build-IExpressInstaller
        }
    } else {
        Build-IExpressInstaller
    }
}

if (Test-Path $OutExe) {
    $item = Get-Item $OutExe
    $mb = [math]::Round($item.Length / 1MB, 2)
    Write-Host ''
    Write-Host 'Installer created (SewarTech):' -ForegroundColor Green
    Write-Host "  $($item.FullName)" -ForegroundColor White
    Write-Host "  Size: $($item.Length) bytes (~$mb MB)" -ForegroundColor White
} else {
    throw "Expected output not found: $OutExe"
}
