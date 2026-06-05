const { getDatabase } = require('../config/database')

class PresenceModel {
  get db() {
    return getDatabase()
  }

  upsertHeartbeat(userId) {
    const existing = this.db
      .prepare('SELECT user_id FROM user_presence WHERE user_id = ?')
      .get(userId)
    if (existing) {
      this.db
        .prepare(
          `UPDATE user_presence
           SET last_seen_at = datetime('now'), is_online = 1
           WHERE user_id = ?`
        )
        .run(userId)
    } else {
      this.db
        .prepare(
          `INSERT INTO user_presence (user_id, last_seen_at, is_online)
           VALUES (?, datetime('now'), 1)`
        )
        .run(userId)
    }
    return this.getByUserId(userId)
  }

  getByUserId(userId) {
    return this.db
      .prepare('SELECT * FROM user_presence WHERE user_id = ?')
      .get(userId)
  }

  isRecentlyActive(userId, thresholdSeconds) {
    const row = this.db
      .prepare(
        `SELECT 1 FROM user_presence
         WHERE user_id = ? AND last_seen_at >= datetime('now', ?)`
      )
      .get(userId, `-${thresholdSeconds} seconds`)
    return !!row
  }

  /** مستخدمون نشطون: show_online=1 وآخر ظهور خلال threshold ثانية */
  listCandidates(thresholdSeconds) {
    return this.db
      .prepare(
        `SELECT u.id AS user_id, u.name AS user_name, u.username,
                COALESCE(pr.display_name, u.name) AS display_name,
                COALESCE(pr.show_online, 1) AS show_online,
                prs.last_seen_at, prs.is_online,
                pr.avatar_path
         FROM users u
         LEFT JOIN user_profiles pr ON pr.user_id = u.id
         LEFT JOIN user_presence prs ON prs.user_id = u.id
         WHERE u.is_deleted = 0
           AND COALESCE(pr.show_online, 1) = 1
           AND prs.last_seen_at IS NOT NULL
           AND prs.last_seen_at >= datetime('now', ?)`
      )
      .all(`-${thresholdSeconds} seconds`)
  }
}

module.exports = new PresenceModel()
