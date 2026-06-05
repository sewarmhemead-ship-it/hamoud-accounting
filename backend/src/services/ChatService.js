const ChatModel = require('../models/ChatModel')
const UserModel = require('../models/UserModel')
const PresenceService = require('./PresenceService')
const { ValidationError, ForbiddenError, BusinessRuleError } = require('../utils/errors')

const ChatMediaService = require('./ChatMediaService')
const MESSAGE_TYPES = new Set([
  'text',
  'transaction',
  'report',
  'shipment',
  'image',
  'file',
  'voice',
])

function validateMessagePayload(messageType, payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'payload مطلوب لرسائل المراجع' }
  }
  switch (messageType) {
    case 'transaction':
      if (!payload.transaction_id || !payload.ref_number) {
        return { valid: false, error: 'transaction يتطلب transaction_id و ref_number' }
      }
      break
    case 'report':
      if (!payload.report_type || !payload.label) {
        return { valid: false, error: 'report يتطلب report_type و label' }
      }
      break
    case 'shipment':
      if (!payload.shipment_id || !payload.ref_number) {
        return { valid: false, error: 'shipment يتطلب shipment_id و ref_number' }
      }
      break
    case 'image':
    case 'file':
    case 'voice':
      if (!payload.media_id || !payload.media_url) {
        return { valid: false, error: 'مرفق الوسائط يتطلب media_id و media_url' }
      }
      break
    default:
      break
  }
  return { valid: true }
}

function parseMessage(row) {
  let payload = null
  if (row.payload) {
    try { payload = JSON.parse(row.payload) } catch { payload = null }
  }
  return {
    id: row.id,
    thread_id: row.thread_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    body: row.body,
    message_type: row.message_type,
    payload,
    created_at: row.created_at,
  }
}

class ChatService {
  listThreads(userId) {
    const threads = ChatModel.listThreadsForUser(userId)
    return threads.map((t) => {
      const others = ChatModel.getOtherParticipants(t.id, userId)
      const peer = others[0]
      const online = peer
        ? PresenceService.resolveOnlineStatus(peer.id, 1)
        : false
      return {
        id: t.id,
        type: t.type,
        created_at: t.created_at,
        last_message: t.last_message,
        last_message_at: t.last_message_at,
        unread_count: t.unread_count || 0,
        peer: peer
          ? {
              id: peer.id,
              display_name: peer.display_name,
              avatar_url: peer.avatar_path
                ? `/profile/avatar/${require('path').basename(peer.avatar_path)}`
                : null,
              is_online: online,
            }
          : null,
      }
    })
  }

  getMessages(userId, threadId, opts = {}) {
    this.assertParticipant(threadId, userId)
    const rows = ChatModel.listMessages(threadId, opts)
    ChatModel.markRead(threadId, userId)
    return rows.map(parseMessage)
  }

  startDirectThread(userId, otherUserId) {
    if (userId === otherUserId) {
      throw new BusinessRuleError('لا يمكن بدء محادثة مع نفسك')
    }
    const other = UserModel.findByIdIncludePassword(otherUserId)
    if (!other) throw new ValidationError('المستخدم غير موجود')

    let thread = ChatModel.findDirectThreadBetween(userId, otherUserId)
    if (!thread) {
      thread = ChatModel.createDirectThread(userId, otherUserId)
    }
    const others = ChatModel.getOtherParticipants(thread.id, userId)
    const peer = others[0]
    return {
      id: thread.id,
      type: thread.type,
      created_at: thread.created_at,
      peer: peer
        ? {
            id: peer.id,
            display_name: peer.display_name,
            avatar_url: peer.avatar_path
              ? `/profile/avatar/${require('path').basename(peer.avatar_path)}`
              : null,
          }
        : null,
    }
  }

  sendMessage(userId, threadId, { body, message_type = 'text', payload, attachment }) {
    this.assertParticipant(threadId, userId)

    let type = message_type || 'text'
    let finalPayload = payload
    const text = String(body || '').trim()

    if (attachment?.data_url) {
      const media = ChatMediaService.saveFromDataUrl(userId, threadId, {
        kind: attachment.kind || type,
        data_url: attachment.data_url,
        filename: attachment.filename,
        duration_ms: attachment.duration_ms,
      })
      type = media.kind
      finalPayload = {
        ...media,
        caption: text || attachment.filename || '',
      }
    }

    if (!MESSAGE_TYPES.has(type)) {
      throw new ValidationError('نوع الرسالة غير مدعوم')
    }

    if (type === 'text' && !text) {
      throw new ValidationError('نص الرسالة مطلوب')
    }

    if (type !== 'text') {
      const check = validateMessagePayload(type, finalPayload)
      if (!check.valid) throw new ValidationError(check.error)
    }

    const row = ChatModel.insertMessage({
      threadId,
      senderId: userId,
      body: text || finalPayload?.caption || finalPayload?.filename || '',
      messageType: type,
      payload: type === 'text' ? null : finalPayload,
    })
    return parseMessage(row)
  }

  assertParticipant(threadId, userId) {
    if (!ChatModel.isParticipant(threadId, userId)) {
      throw new ForbiddenError('ليس لديك وصول لهذه المحادثة')
    }
  }
}

module.exports = new ChatService()
module.exports.validateMessagePayload = validateMessagePayload
module.exports.MESSAGE_TYPES = MESSAGE_TYPES
