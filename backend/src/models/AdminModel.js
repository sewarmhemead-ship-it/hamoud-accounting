const { getDatabase } = require('../config/database')

class AdminModel {
  get db() {
    return getDatabase()
  }

  /* ── إحصاء سريع للداشبورد ── */
  getStats() {
    const users   = this.db.prepare('SELECT COUNT(*) as n FROM users   WHERE is_deleted = 0').get().n
    const borders = this.db.prepare('SELECT COUNT(*) as n FROM borders').get().n
    const goods   = this.db.prepare('SELECT COUNT(*) as n FROM goods_types').get().n
    const activity = this.db.prepare(
      "SELECT COUNT(*) as n FROM audit_log WHERE created_at >= datetime('now','-7 days')"
    ).get().n
    return { users, borders, goods_types: goods, recent_activity: activity }
  }

  /* ── معابر ── */
  getBorders() {
    return this.db.prepare('SELECT * FROM borders ORDER BY is_active DESC, name ASC').all()
  }

  createBorder({ name, name_en = null }) {
    const r = this.db.prepare(
      'INSERT INTO borders (name, name_en) VALUES (?, ?)'
    ).run(name, name_en)
    return this.db.prepare('SELECT * FROM borders WHERE id = ?').get(r.lastInsertRowid)
  }

  updateBorder(id, { name, name_en, is_active }) {
    const sets = []
    const vals = []
    if (name      !== undefined) { sets.push('name = ?');      vals.push(name) }
    if (name_en   !== undefined) { sets.push('name_en = ?');   vals.push(name_en) }
    if (is_active !== undefined) { sets.push('is_active = ?'); vals.push(is_active ? 1 : 0) }
    if (!sets.length) return this.db.prepare('SELECT * FROM borders WHERE id = ?').get(id)
    vals.push(id)
    this.db.prepare(`UPDATE borders SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.db.prepare('SELECT * FROM borders WHERE id = ?').get(id)
  }

  /* ── أنواع البضائع ── */
  getGoodsTypes() {
    return this.db.prepare('SELECT * FROM goods_types ORDER BY is_active DESC, name ASC').all()
  }

  createGoodsType({ name, name_en = null }) {
    const r = this.db.prepare(
      'INSERT INTO goods_types (name, name_en) VALUES (?, ?)'
    ).run(name, name_en)
    return this.db.prepare('SELECT * FROM goods_types WHERE id = ?').get(r.lastInsertRowid)
  }

  updateGoodsType(id, { name, name_en, is_active }) {
    const sets = []
    const vals = []
    if (name      !== undefined) { sets.push('name = ?');      vals.push(name) }
    if (name_en   !== undefined) { sets.push('name_en = ?');   vals.push(name_en) }
    if (is_active !== undefined) { sets.push('is_active = ?'); vals.push(is_active ? 1 : 0) }
    if (!sets.length) return this.db.prepare('SELECT * FROM goods_types WHERE id = ?').get(id)
    vals.push(id)
    this.db.prepare(`UPDATE goods_types SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.db.prepare('SELECT * FROM goods_types WHERE id = ?').get(id)
  }

  /* ── سجل النشاط ── */
  getAuditLog({ user_id, action, entity, from, to, limit = 50, offset = 0 } = {}) {
    const conds = []
    const params = []

    if (user_id) { conds.push('a.user_id = ?');     params.push(user_id) }
    if (action)  { conds.push('a.action = ?');       params.push(action) }
    if (entity)  { conds.push('a.entity = ?');       params.push(entity) }
    if (from)    { conds.push('a.created_at >= ?');  params.push(from) }
    if (to)      { conds.push('a.created_at <= ?');  params.push(to + ' 23:59:59') }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''

    const rows = this.db.prepare(`
      SELECT a.*, u.name AS user_name, u.username
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset)

    const { count: total } = this.db.prepare(
      `SELECT COUNT(*) as count FROM audit_log a ${where}`
    ).get(...params)

    return { rows, total }
  }
}

module.exports = new AdminModel()
