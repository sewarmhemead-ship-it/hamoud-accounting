const BaseModel = require('./BaseModel')

class UserModel extends BaseModel {
  constructor() {
    super('users')
  }

  findByUsername(username) {
    return this.db
      .prepare('SELECT * FROM users WHERE username = ? AND is_deleted = 0')
      .get(username)
  }

  findByIdIncludePassword(id) {
    return this.db
      .prepare('SELECT * FROM users WHERE id = ? AND is_deleted = 0')
      .get(id)
  }

  findAll({ limit = 200, offset = 0 } = {}) {
    const rows = this.db
      .prepare('SELECT * FROM users WHERE is_deleted = 0 ORDER BY id ASC LIMIT ? OFFSET ?')
      .all(limit, offset)
    const { count: total } = this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_deleted = 0')
      .get()
    return { rows, total, limit, offset }
  }
}

module.exports = new UserModel()
