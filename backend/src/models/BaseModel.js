const { getDatabase } = require('../config/database')
const { NotFoundError } = require('../utils/errors')
const { ALLOWED_ORDER } = require('../config/constants')

class BaseModel {
  constructor(tableName, allowedFilters = null) {
    this.table = tableName
    this.db = getDatabase()
    this.allowedFilters = allowedFilters
  }

  findById(id) {
    const row = this.db
      .prepare(`SELECT * FROM ${this.table} WHERE id = ? AND is_deleted = 0`)
      .get(id)
    if (!row) throw new NotFoundError()
    return row
  }

  findAll({ filters = {}, orderBy = 'created_at DESC', limit = 50, offset = 0 } = {}) {
    const conditions = ['is_deleted = 0']
    const params = []

    for (const [key, val] of Object.entries(filters)) {
      if (val === undefined || val === null) continue
      if (this.allowedFilters && !this.allowedFilters[key]) continue
      const column = this.allowedFilters ? this.allowedFilters[key] : key
      conditions.push(`${column} = ?`)
      params.push(val)
    }

    const safeOrder = ALLOWED_ORDER.includes(orderBy) ? orderBy : 'created_at DESC'
    const where = conditions.join(' AND ')

    const rows = this.db
      .prepare(
        `SELECT * FROM ${this.table} WHERE ${where} ORDER BY ${safeOrder} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset)

    const { count: total } = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${this.table} WHERE ${where}`)
      .get(...params)

    return { rows, total, limit, offset }
  }

  create(data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')

    const result = this.db
      .prepare(
        `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`
      )
      .run(...values)

    return this.findById(result.lastInsertRowid)
  }

  update(id, data) {
    this.findById(id)
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ')
    const values = Object.values(data)

    this.db
      .prepare(
        `UPDATE ${this.table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`
      )
      .run(...values, id)

    return this.findById(id)
  }

  softDelete(id) {
    this.findById(id)
    this.db
      .prepare(
        `UPDATE ${this.table} SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`
      )
      .run(id)
    return { success: true }
  }

  transaction(fn) {
    return this.db.transaction(fn)()
  }
}

module.exports = BaseModel
