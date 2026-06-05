const { getDatabase } = require('../config/database')

class ProfileModel {
  get db() {
    return getDatabase()
  }

  getByUserId(userId) {
    return this.db
      .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
      .get(userId)
  }

  ensure(userId, defaults = {}) {
    let row = this.getByUserId(userId)
    if (!row) {
      this.db
        .prepare(
          `INSERT INTO user_profiles (user_id, display_name, show_online)
           VALUES (?, ?, 1)`
        )
        .run(userId, defaults.display_name || null)
      row = this.getByUserId(userId)
    }
    return row
  }

  update(userId, data) {
    this.ensure(userId)
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ')
    const values = Object.values(data)
    this.db
      .prepare(
        `UPDATE user_profiles SET ${sets}, updated_at = datetime('now') WHERE user_id = ?`
      )
      .run(...values, userId)
    return this.getByUserId(userId)
  }

  getPublicProfile(userId) {
    return this.db
      .prepare(
        `SELECT p.user_id, p.display_name, p.bio, p.avatar_path, p.show_online,
                u.name AS user_name, u.username, u.role
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = ? AND u.is_deleted = 0`
      )
      .get(userId)
  }
}

module.exports = new ProfileModel()
