const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ChatModel = require('../models/ChatModel')
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors')

const MEDIA_DIR = path.join(__dirname, '..', '..', 'uploads', 'chat')
const LIMITS = {
  image: 2 * 1024 * 1024,
  file: 10 * 1024 * 1024,
  voice: 5 * 1024 * 1024,
}

const MIME_BY_KIND = {
  image: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  voice: new Set([
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
  ]),
  file: new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'application/zip',
    'application/octet-stream',
  ]),
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/i)
  if (!match) return null
  const mime = match[1].toLowerCase()
  const buffer = Buffer.from(match[2], 'base64')
  return { mime, buffer }
}

function extFromMime(mime, kind) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'application/zip': '.zip',
  }
  if (map[mime]) return map[mime]
  if (kind === 'voice') return '.webm'
  if (kind === 'image') return '.jpg'
  return '.bin'
}

class ChatMediaService {
  ensureTable() {
    const db = ChatModel.db
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/018_chat_media.sql'),
      'utf8'
    )
    db.exec(sql)
  }

  saveFromDataUrl(userId, threadId, { kind, data_url, filename, duration_ms }) {
    this.ensureTable()
    if (!ChatModel.isParticipant(threadId, userId)) {
      throw new ForbiddenError('ليس لديك وصول لهذه المحادثة')
    }

    const mediaKind = kind || 'file'
    if (!['image', 'file', 'voice'].includes(mediaKind)) {
      throw new ValidationError('نوع المرفق غير مدعوم')
    }

    const parsed = parseDataUrl(data_url)
    if (!parsed) throw new ValidationError('صيغة الملف غير صالحة')

    const allowed = MIME_BY_KIND[mediaKind]
    const mimeOk =
      allowed.has(parsed.mime) ||
      (mediaKind === 'file' && parsed.mime.startsWith('application/'))
    if (!mimeOk) {
      throw new ValidationError(`نوع الملف غير مسموح: ${parsed.mime}`)
    }

    const max = LIMITS[mediaKind]
    if (parsed.buffer.length > max) {
      throw new ValidationError(
        `حجم الملف يتجاوز الحد (${Math.round(max / 1024 / 1024)} ميجابايت)`
      )
    }

    if (!fs.existsSync(MEDIA_DIR)) {
      fs.mkdirSync(MEDIA_DIR, { recursive: true })
    }

    const ext = extFromMime(parsed.mime, mediaKind)
    const safeName = String(filename || `media${ext}`)
      .replace(/[^\w.\-أ-ي\s]/gi, '')
      .slice(0, 120) || `media${ext}`
    const diskName = `${threadId}_${userId}_${crypto.randomBytes(8).toString('hex')}${ext}`
    const fullPath = path.join(MEDIA_DIR, diskName)
    fs.writeFileSync(fullPath, parsed.buffer)

    const stmt = ChatModel.db.prepare(`
      INSERT INTO chat_media (thread_id, uploader_id, kind, filename, mime_type, size_bytes, file_path, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(
      threadId,
      userId,
      mediaKind,
      safeName,
      parsed.mime,
      parsed.buffer.length,
      fullPath,
      duration_ms != null ? Math.round(Number(duration_ms)) : null
    )

    return this.formatRow({
      id: info.lastInsertRowid,
      thread_id: threadId,
      uploader_id: userId,
      kind: mediaKind,
      filename: safeName,
      mime_type: parsed.mime,
      size_bytes: parsed.buffer.length,
      file_path: fullPath,
      duration_ms: duration_ms != null ? Math.round(Number(duration_ms)) : null,
      created_at: new Date().toISOString(),
    })
  }

  formatRow(row) {
    return {
      media_id: row.id,
      kind: row.kind,
      filename: row.filename,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      duration_ms: row.duration_ms,
      media_url: `/chat/media/${row.id}`,
    }
  }

  getForDownload(userId, mediaId) {
    this.ensureTable()
    const row = ChatModel.db
      .prepare('SELECT * FROM chat_media WHERE id = ?')
      .get(mediaId)
    if (!row) throw new NotFoundError('الملف غير موجود')
    if (!ChatModel.isParticipant(row.thread_id, userId)) {
      throw new ForbiddenError('ليس لديك وصول لهذا الملف')
    }
    if (!fs.existsSync(row.file_path)) throw new NotFoundError('الملف غير موجود على القرص')
    return row
  }
}

module.exports = new ChatMediaService()
module.exports.LIMITS = LIMITS
module.exports.parseDataUrl = parseDataUrl
