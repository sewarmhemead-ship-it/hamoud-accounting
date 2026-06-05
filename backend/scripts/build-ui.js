/**
 * يبني واجهة React وينسخ dist إلى backend/public للتشغيل المحلي (خدمة واحدة).
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', '..')
const frontend = path.join(root, 'frontend')
const dist = path.join(frontend, 'dist')
const publicDir = path.join(__dirname, '..', 'public')

console.log('Building frontend...')
execSync('npm run build', { cwd: frontend, stdio: 'inherit' })

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('frontend build failed: dist/index.html missing')
}

if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true, force: true })
}
fs.cpSync(dist, publicDir, { recursive: true })
console.log(`Copied UI → ${publicDir}`)
