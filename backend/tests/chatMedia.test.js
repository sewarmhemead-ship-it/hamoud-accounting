const fs = require('fs')
const path = require('path')
const { createSocialTestDb, destroySocialTestDb } = require('./helpers/socialTestDb')
const ChatMediaService = require('../src/services/ChatMediaService')
const ChatService = require('../src/services/ChatService')

let db

beforeEach(() => {
  db = createSocialTestDb()
})

afterEach(() => {
  destroySocialTestDb(db)
  db = null
})

const tinyPng = () => {
  const buf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
  return `data:image/png;base64,${buf.toString('base64')}`
}

describe('ChatMediaService', () => {
  it('يحفظ صورة في المحادثة', () => {
    const thread = ChatService.startDirectThread(1, 2)
    const media = ChatMediaService.saveFromDataUrl(1, thread.id, {
      kind: 'image',
      data_url: tinyPng(),
      filename: 'test.png',
    })
    expect(media.media_id).toBeTruthy()
    expect(media.media_url).toMatch(/^\/chat\/media\//)
    expect(fs.existsSync(
      ChatMediaService.getForDownload(2, media.media_id).file_path
    )).toBe(true)
  })

  it('يرفض وصول غير المشارك', () => {
    const thread = ChatService.startDirectThread(1, 2)
    const media = ChatMediaService.saveFromDataUrl(1, thread.id, {
      kind: 'image',
      data_url: tinyPng(),
    })
    expect(() => ChatMediaService.getForDownload(99, media.media_id)).toThrow()
  })
})

describe('ChatService — مرفقات', () => {
  it('يرسل رسالة صورة عبر attachment', () => {
    const { id } = ChatService.startDirectThread(1, 2)
    const msg = ChatService.sendMessage(1, id, {
      body: 'صورة',
      attachment: {
        kind: 'image',
        data_url: tinyPng(),
        filename: 'snap.png',
      },
    })
    expect(msg.message_type).toBe('image')
    expect(msg.payload.media_id).toBeTruthy()
    expect(msg.payload.media_url).toMatch(/^\/chat\/media\//)
  })
})
