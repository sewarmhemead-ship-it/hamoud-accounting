#Requires -Version 5.1
<#
.SYNOPSIS
  Fallback Setup.exe via Windows IExpress (when Inno Setup unavailable).
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageDir,
    [Parameter(Mandatory = $true)]
    [string]$OutExe
)

$ErrorActionPreference = 'Stop'
$InstallerDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $InstallerDir '..')).Path
$Staging = Join-Path $env:TEMP "hamoud-setup-staging-$(Get-Random)"
$PayloadZip = Join-Path $env:TEMP "HamoudAccounting-payload.zip"
$SedFile = Join-Path $env:TEMP "hamoud-setup.sed"
$PostInstallBat = Join-Path $Staging 'install-hamoud.bat'

if (-not (Test-Path $PackageDir)) { throw "Package missing: $PackageDir" }

Write-Host '    Creating payload ZIP...' -ForegroundColor DarkGray
if (Test-Path $PayloadZip) { Remove-Item -LiteralPath $PayloadZip -Force }
Compress-Archive -LiteralPath $PackageDir -DestinationPath $PayloadZip -CompressionLevel Optimal

$defaultDir = 'C:\Program Files\HamoudAccounting'
$postBat = @"
@echo off
chcp 65001 >nul
setlocal
set "TARGET=$defaultDir"
if not exist "%TARGET%" mkdir "%TARGET%"
echo SewarTech - installing Hamoud Accounting...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%~dp0HamoudAccounting-payload.zip' -DestinationPath '%TARGET%' -Force"
if errorlevel 1 (
  echo Install failed.
  pause
  exit /b 1
)
set "SC=%ProgramData%\Microsoft\Windows\Start Menu\Programs"
if not exist "%SC%" mkdir "%SC%"
powershell -NoProfile -Command "$w=New-Object -ComObject WScript.Shell;$s=$w.CreateShortcut('%SC%\Hamoud Accounting.lnk');$s.TargetPath='%TARGET%\start-prod.bat';$s.WorkingDirectory='%TARGET%';$s.IconLocation='%TARGET%\HamoudAccounting.ico';$s.Save()"
echo Done. Run from Start Menu: Hamoud Accounting
start "" "%TARGET%\start-prod.bat"
"@

$null = New-Item -ItemType Directory -Path $Staging -Force
Set-Content -LiteralPath $PostInstallBat -Value $postBat -Encoding ASCII
Copy-Item -LiteralPath $PayloadZip -Destination (Join-Path $Staging 'HamoudAccounting-payload.zip') -Force
$iconPath = Join-Path $InstallerDir 'sewartech-setup.ico'
if (Test-Path $iconPath) {
    Copy-Item -LiteralPath $iconPath -Destination (Join-Path $Staging 'sewartech-setup.ico') -Force
}

$stagingEsc = $Staging -replace '\\', '\\'
$outEsc = $OutExe -replace '\\', '\\'
$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=0
UseLongFileName=1
InsideCompress=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=تم التثبيت — SewarTech%nشغّل البرنامج من قائمة ابدأ.
TargetName=%TargetName%
FriendlyName=Hamoud Accounting Setup (SewarTech)
AppLaunched=install-hamoud.bat
PostInstallCmd=<None>
AdminQuietInst=
UserQuietInst=
SourceFiles=SourceFiles
[Strings]
InstallPrompt=مثبت حمود محاسبة — SewarTech%nسيتم تثبيت البرنامج كاملاً (Node + مكتبات + قاعدة بيانات).%n%nمتابعة؟
DisplayLicense=
FinishMessage=تم التثبيت بنجاح.
TargetName=$outEsc
FriendlyName=Hamoud Accounting Setup (SewarTech)
[SourceFiles]
SourceFiles0=$stagingEsc
[SourceFiles0]
%FILE0%=install-hamoud.bat
%FILE1%=HamoudAccounting-payload.zip
%FILE2%=sewartech-setup.ico
"@

Set-Content -LiteralPath $SedFile -Value $sed -Encoding ASCII

$iexpress = Join-Path $env:SystemRoot 'System32\iexpress.exe'
if (-not (Test-Path $iexpress)) { throw "IExpress not found: $iexpress" }

if (Test-Path $OutExe) { Remove-Item -LiteralPath $OutExe -Force }

Write-Host "    Running IExpress -> $OutExe" -ForegroundColor DarkGray
$proc = Start-Process -FilePath $iexpress -ArgumentList '/N', $SedFile -Wait -PassThru -WindowStyle Hidden
if (-not (Test-Path $OutExe)) {
    throw "IExpress did not produce $OutExe (exit $($proc.ExitCode))"
}

Write-Host "    IExpress Setup.exe created" -ForegroundColor Green
