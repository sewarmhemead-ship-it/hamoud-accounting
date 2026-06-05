; مثبت Windows — حمود محاسبة تخليص
; برمجة وتطوير — SewarTech
; يتطلب Inno Setup 6: https://jrsoftware.org/isdl.php

#define MyAppName "حمود — محاسبة تخليص"
#define MyAppNameEn "Hamoud Customs Accounting"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "SewarTech"
#define MyAppURL "https://sewartech.local"
#define MyAppExeName "start-prod.bat"
#define PackageDir "..\release\HamoudAccounting"

[Setup]
AppId={{8A3F2C1E-9B4D-4F6A-8D01-202604050001}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppCopyright=Copyright (C) 2026 {#MyAppPublisher}
DefaultDirName={autopf}\HamoudAccounting
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\release
OutputBaseFilename=HamoudAccounting-Setup
SetupIconFile=sewartech-setup.ico
UninstallDisplayIcon={app}\HamoudAccounting.ico
WizardStyle=modern
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64
LicenseFile=
InfoBeforeFile=..\docs\dalil-alzaboon.md
WizardImageFile=
WizardSmallImageFile=
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppNameEn} — SewarTech installer
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
UninstallDisplayName={#MyAppName} ({#MyAppPublisher})

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
english.WelcomeLabel1=مرحباً بك في مثبت
english.WelcomeLabel2=سيتم تثبيت البرنامج كاملاً تلقائياً: Node.js 20، المكتبات، الواجهة، وقاعدة البيانات الجاهزة للزبون.%n%nبرمجة وتطوير — SewarTech
english.ClickNext=اضغط «التالي» للمتابعة.
english.SelectDirLabel3=اختر مجلد التثبيت:
english.SelectDirBrowseLabel=استعراض مجلد آخر...
english.ReadyLabel1=جاهز لتثبيت [name] على جهازك.
english.ReadyLabel2a=اضغط «تثبيت» للمتابعة، أو «رجوع» لتعديل الإعدادات.
english.FinishedHeadingLabel=اكتمل التثبيت
english.FinishedLabel=تم تثبيت حمود — محاسبة تخليص بنجاح.%n%nاضغط «إنهاء» ثم شغّل البرنامج من قائمة ابدأ أو الاختصار على سطح المكتب.%n%nلا حاجة لتثبيت Node.js يدوياً — مُضمّن مع الحزمة.

[Tasks]
Name: "desktopicon"; Description: "إنشاء اختصار على سطح المكتب (SewarTech)"; GroupDescription: "اختصارات:"; Flags: unchecked

[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; لا تُثبّت قاعدة التطوير إن وُجدت بالخطأ
Excludes: "backend\data\hamoud.db-wal;backend\data\hamoud.db-shm"
Source: "sewartech-setup.ico"; DestDir: "{app}"; DestName: "HamoudAccounting.ico"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\HamoudAccounting.ico"; Comment: "SewarTech — حمود محاسبة"
Name: "{group}\دليل الزبون"; Filename: "{app}\README-زبون.md"
Name: "{group}\إلغاء التثبيت"; Filename: "{uninstallexe}"; IconFilename: "{app}\HamoudAccounting.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\HamoudAccounting.ico"; Tasks: desktopicon; Comment: "SewarTech"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "تشغيل البرنامج الآن"; Flags: nowait postinstall skipifsilent shellexec

[UninstallDelete]
Type: filesandordirs; Name: "{app}\backend\data"
Type: filesandordirs; Name: "{app}\backups"

[Code]
function InitializeSetup(): Boolean;
var
  Msg: String;
begin
  if not DirExists(ExpandConstant('{#PackageDir}')) then
  begin
    Msg := 'مجلد الحزمة غير موجود.' + #13#10 +
      'شغّل أولاً: installer\build-installer.ps1' + #13#10 +
      'المسار المتوقع: release\HamoudAccounting';
    MsgBox(Msg, mbError, MB_OK);
    Result := False;
    Exit;
  end;
  if not FileExists(ExpandConstant('{#PackageDir}\node-runtime\node.exe')) then
  begin
    Msg := 'Node.js المحمول غير موجود في الحزمة.' + #13#10 +
      'شغّل: installer\build-installer.ps1 لتحميل node-runtime';
    MsgBox(Msg, mbError, MB_OK);
    Result := False;
    Exit;
  end;
  Result := True;
end;
