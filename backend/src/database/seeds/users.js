const bcrypt = require('bcrypt')
const { getDatabase } = require('../../config/database')

async function seedUsers() {
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  if (existing) {
    console.log('⏭  admin user exists')
    return
  }

  // كلمة مرور المدير الأولى قابلة للضبط عبر متغير بيئة في الإنتاج.
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const password_hash = await bcrypt.hash(adminPassword, 10)
  db.prepare(`
    INSERT INTO users (username, password_hash, name, role)
    VALUES (?, ?, ?, ?)
  `).run('admin', password_hash, 'مدير النظام', 'admin')

  const shown = process.env.ADMIN_PASSWORD ? '(من ADMIN_PASSWORD)' : '(admin123)'
  console.log(`✅ admin user seeded (admin / ${shown})`)
}

module.exports = { seedUsers }
