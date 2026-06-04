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
}

module.exports = new UserModel()
