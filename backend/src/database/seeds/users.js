const bcrypt = require('bcrypt')
const { getDatabase } = require('../../config/database')

async function syncAdminPasswordFromEnv() {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false

  const db = getDatabase()
  const existing = db
    .prepare('SELECT id FROM users WHERE username = ? AND is_deleted = 0')
    .get('admin')
  if (!existing) return false

  const password_hash = await bcrypt.hash(adminPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(
    password_hash,
    'admin'
  )
  console.log('✅ admin password synced from ADMIN_PASSWORD')
  return true
}

async function seedUsers() {
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (existing) {
    console.log('⏭  admin user exists')
    await syncAdminPasswordFromEnv()
    return
  }

  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const password_hash = await bcrypt.hash(adminPassword, 10)
  db.prepare(`
    INSERT INTO users (username, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `).run('admin', password_hash, 'مدير النظام', 'admin')

  const shown = process.env.ADMIN_PASSWORD ? '(من ADMIN_PASSWORD)' : '(admin123)'
  console.log(`✅ admin user seeded (admin / ${shown})`)
}

module.exports = { seedUsers, syncAdminPasswordFromEnv }
