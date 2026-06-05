const { getDatabase } = require('../config/database')
const { NotFoundError } = require('../utils/errors')

class ChatModel {
  get db() {
    return getDatabase()
  }

  findDirectThreadBetween(userA, userB) {
    return this.db
      .prepare(
        `SELECT t.*
         FROM chat_threads t
         JOIN chat_participants p1 ON p1.thread_id = t.id AND p1.user_id = ?
         JOIN chat_participants p2 ON p2.thread_id = t.id AND p2.user_id = ?
         WHERE t.type = 'direct'
         LIMIT 1`
      )
      .get(userA, userB)
  }

  createDirectThread(userA, userB) {
    return this.db.transaction(() => {
      const result = this.db
        .prepare(`INSERT INTO chat_threads (type) VALUES ('direct')`)
        .run()
      const threadId = result.lastInsertRowid
      const insert = this.db.prepare(
        `INSERT INTO chat_participants (thread_id, user_id) VALUES (?, ?)`
      )
      insert.run(threadId, userA)
      insert.run(threadId, userB)
      return this.getThreadById(threadId)
    })()
  }

  getThreadById(threadId) {
    const row = this.db
      .prepare('SELECT * FROM chat_threads WHERE id = ?')
      .get(threadId)
    if (!row) throw new NotFoundError('المحادثة غير موجودة')
    return row
  }

  isParticipant(threadId, userId) {
    const row = this.db
      .prepare(
        'SELECT 1 FROM chat_participants WHERE thread_id = ? AND user_id = ?'
      )
      .get(threadId, userId)
    return !!row
  }

  listThreadsForUser(userId) {
    return this.db
      .prepare(
        `SELECT t.id, t.type, t.created_at,
                (SELECT body FROM chat_messages m
                 WHERE m.thread_id = t.id AND m.is_deleted = 0
                 ORDER BY m.created_at DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM chat_messages m
                 WHERE m.thread_id = t.id AND m.is_deleted = 0
                 ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
                (SELECT COUNT(*) FROM chat_messages m
                 WHERE m.thread_id = t.id AND m.is_deleted = 0
                   AND m.sender_id != ?
                   AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
                ) AS unread_count
         FROM chat_threads t
         JOIN chat_participants cp ON cp.thread_id = t.id AND cp.user_id = ?
         ORDER BY COALESCE(last_message_at, t.created_at) DESC`
      )
      .all(userId, userId)
  }

  getOtherParticipants(threadId, excludeUserId) {
    return this.db
      .prepare(
        `SELECT u.id, u.name, u.username,
                COALESCE(p.display_name, u.name) AS display_name,
                p.avatar_path
         FROM chat_participants cp
         JOIN users u ON u.id = cp.user_id AND u.is_deleted = 0
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE cp.thread_id = ? AND cp.user_id != ?`
      )
      .all(threadId, excludeUserId)
  }

  listMessages(threadId, { limit = 50, beforeId = null } = {}) {
    if (beforeId) {
      const before = this.db
        .prepare('SELECT created_at FROM chat_messages WHERE id = ?')
        .get(beforeId)
      if (!before) return []
      return this.db
        .prepare(
          `SELECT m.*, u.name AS sender_name
           FROM chat_messages m
           JOIN users u ON u.id = m.sender_id
           WHERE m.thread_id = ? AND m.is_deleted = 0 AND m.created_at < ?
           ORDER BY m.created_at DESC LIMIT ?`
        )
        .all(threadId, before.created_at, limit)
        .reverse()
    }
    return this.db
      .prepare(
        `SELECT m.*, u.name AS sender_name
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.thread_id = ? AND m.is_deleted = 0
         ORDER BY m.created_at DESC LIMIT ?`
      )
      .all(threadId, limit)
      .reverse()
  }

  insertMessage({ threadId, senderId, body, messageType, payload }) {
    const result = this.db
      .prepare(
        `INSERT INTO chat_messages (thread_id, sender_id, body, message_type, payload)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        threadId,
        senderId,
        body || '',
        messageType,
        payload ? JSON.stringify(payload) : null
      )
    return this.getMessageById(result.lastInsertRowid)
  }

  getMessageById(id) {
    return this.db
      .prepare(
        `SELECT m.*, u.name AS sender_name
         FROM chat_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.id = ?`
      )
      .get(id)
  }

  markRead(threadId, userId) {
    this.db
      .prepare(
        `UPDATE chat_participants
         SET last_read_at = datetime('now')
         WHERE thread_id = ? AND user_id = ?`
      )
      .run(threadId, userId)
  }
}

module.exports = new ChatModel()
