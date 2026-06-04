const BaseModel = require('./BaseModel')

class CenterModel extends BaseModel {
  constructor() {
    super('centers', {
      type: 'type',
      currency: 'currency',
      code: 'code',
    })
  }

  findByCode(code) {
    return this.db
      .prepare('SELECT * FROM centers WHERE code = ? AND is_deleted = 0')
      .get(code)
  }

  findByType(type) {
    return this.db
      .prepare(
        'SELECT * FROM centers WHERE type = ? AND is_deleted = 0 ORDER BY code ASC'
      )
      .all(type)
  }

  getNextCode() {
    const row = this.db
      .prepare(
        `SELECT MAX(CAST(code AS INTEGER)) as max_code FROM centers WHERE code GLOB '[0-9]*'`
      )
      .get()
    const next = (row?.max_code || 100) + 1
    return String(next)
  }
}

module.exports = new CenterModel()
