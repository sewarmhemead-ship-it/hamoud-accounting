/**
 * Electron main — حمود محاسبة (SewarTech)
 *
 * يشغّل الـ backend (Express + SQLite) كعملية منفصلة باستخدام Node المدمج في
 * Electron (ELECTRON_RUN_AS_NODE)، مع توجيه قاعدة البيانات والنسخ الاحتياطي إلى
 * مجلد بيانات المستخدم (قابل للكتابة)، ثم يفتح نافذة على صفحة تسجيل الدخول.
 *
 * لا يتطلب تعديل كود الـ backend — يبقى كما هو، فقط متغيرات بيئة.
 */
const { app, BrowserWindow, shell, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const http = require('http')
const { spawn } = require('child_process')

const PORT = 38217 // منفذ محلي ثابت غير شائع
let backendProc = null
let mainWindow = null
let quitting = false

function backendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '..', 'backend')
}

function iconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '..', 'installer', 'sewartech-setup.ico')
}

/** سرّ JWT ثابت لكل تثبيت — يُولّد مرة ويُحفظ في userData كي تبقى الجلسات صالحة. */
function ensureJwtSecret(userData) {
  const f = path.join(userData, '.jwt-secret')
  try {
    if (fs.existsSync(f)) {
      const s = fs.readFileSync(f, 'utf8').trim()
      if (s) return s
    }
  } catch {
    /* ignore */
  }
  const secret = crypto.randomBytes(48).toString('hex')
  try {
    fs.writeFileSync(f, secret, { encoding: 'utf8' })
  } catch {
    /* ignore */
  }
  return secret
}

function startBackend() {
  const userData = app.getPath('userData')
  const dataDir = path.join(userData, 'data')
  fs.mkdirSync(dataDir, { recursive: true })

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    PORT: String(PORT),
    DB_PATH: path.join(dataDir, 'hamoud.db'),
    JWT_SECRET: ensureJwtSecret(userData),
  }

  const serverJs = path.join(backendDir(), 'server.js')
  backendProc = spawn(process.execPath, [serverJs], {
    cwd: backendDir(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  backendProc.stdout.on('data', (d) => console.log('[backend]', d.toString().trim()))
  backendProc.stderr.on('data', (d) => console.error('[backend]', d.toString().trim()))
  backendProc.on('exit', (code) => {
    if (!quitting && code && code !== 0) {
      dialog.showErrorBox(
        'حمود محاسبة',
        'توقّف محرّك البرنامج بشكل غير متوقع. أغلق البرنامج وأعد تشغيله.'
      )
    }
  })
}

function waitForBackend(onReady, tries = 0) {
  const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
    res.resume()
    if (res.statusCode === 200) onReady()
    else scheduleRetry()
  })
  req.on('error', scheduleRetry)
  req.setTimeout(2000, () => req.destroy())

  function scheduleRetry() {
    if (tries > 80) {
      dialog.showErrorBox('حمود محاسبة', 'تعذّر بدء البرنامج. حاول إعادة التشغيل.')
      return
    }
    setTimeout(() => waitForBackend(onReady, tries + 1), 400)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'حمود — محاسبة تخليص',
    icon: iconPath(),
    backgroundColor: '#090b12',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  Menu.setApplicationMenu(null) // بلا قائمة متصفّح — شكل تطبيق
  mainWindow.loadFile(path.join(__dirname, 'loading.html'))
  mainWindow.once('ready-to-show', () => mainWindow.show())

  waitForBackend(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(`http://localhost:${PORT}`)
    }
  })

  // الروابط الخارجية تُفتح في المتصفّح لا داخل التطبيق
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost')) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// نسخة واحدة فقط من التطبيق
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    startBackend()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

function shutdown() {
  quitting = true
  if (backendProc) {
    try {
      backendProc.kill()
    } catch {
      /* ignore */
    }
    backendProc = null
  }
}

app.on('before-quit', shutdown)
app.on('window-all-closed', () => {
  shutdown()
  app.quit()
})
