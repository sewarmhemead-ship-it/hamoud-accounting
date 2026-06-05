const { createSocialTestDb, destroySocialTestDb } = require('./helpers/socialTestDb')
const { validateMessagePayload } = require('../src/services/ChatService')
const { ForbiddenError } = require('../src/utils/errors')

let db
let ChatService

beforeEach(() => {
  db = createSocialTestDb()
  ChatService = require('../src/services/ChatService')
})

afterEach(() => {
  destroySocialTestDb(db)
  db = null
})

describe('ChatService — validateMessagePayload', () => {
  it('transaction يتطلب حقولاً أساسية', () => {
    expect(validateMessagePayload('transaction', {}).valid).toBe(false)
    expect(
      validateMessagePayload('transaction', {
        transaction_id: 5,
        ref_number: 'TX-1',
        center_name: 'تاجر',
        amount_usd: 100,
      }).valid
    ).toBe(true)
  })

  it('report يتطلب report_type و label', () => {
    expect(validateMessagePayload('report', { report_type: 'daily' }).valid).toBe(false)
    expect(
      validateMessagePayload('report', {
        report_type: 'daily',
        label: 'تقرير يومي',
        download_path: '/reports/daily.xlsx',
      }).valid
    ).toBe(true)
  })

  it('shipment يتطلب shipment_id و ref_number', () => {
    expect(validateMessagePayload('shipment', { shipment_id: 1 }).valid).toBe(false)
    expect(
      validateMessagePayload('shipment', { shipment_id: 10, ref_number: 'SH-10' }).valid
    ).toBe(true)
  })
})

describe('ChatService — محادثات', () => {
  it('ينشئ محادثة مباشرة بين محاسبين', () => {
    const thread = ChatService.startDirectThread(1, 2)
    expect(thread.id).toBeTruthy()
    expect(thread.peer.id).toBe(2)
    const again = ChatService.startDirectThread(1, 2)
    expect(again.id).toBe(thread.id)
  })

  it('يرفض محادثة مع النفس', () => {
    expect(() => ChatService.startDirectThread(1, 1)).toThrow(/نفسك/)
  })

  it('يرسل رسالة نصية', () => {
    const { id } = ChatService.startDirectThread(1, 2)
    const msg = ChatService.sendMessage(1, id, { body: 'مرحباً', message_type: 'text' })
    expect(msg.body).toBe('مرحباً')
    expect(msg.message_type).toBe('text')
  })

  it('يرسل مرجع حركة', () => {
    const { id } = ChatService.startDirectThread(1, 2)
    const msg = ChatService.sendMessage(1, id, {
      body: 'حركة للمراجعة',
      message_type: 'transaction',
      payload: {
        transaction_id: 99,
        ref_number: 'TX-99',
        center_name: 'مركز أ',
        amount_usd: 500,
      },
    })
    expect(msg.message_type).toBe('transaction')
    expect(msg.payload.transaction_id).toBe(99)
  })

  it('يرسل مرجع تقرير', () => {
    const { id } = ChatService.startDirectThread(1, 2)
    const msg = ChatService.sendMessage(2, id, {
      body: '',
      message_type: 'report',
      payload: {
        report_type: 'inventory',
        label: 'جرد يومي',
        download_path: '/reports/inv.xlsx',
      },
    })
    expect(msg.payload.report_type).toBe('inventory')
  })

  it('يرسل مرجع شحنة', () => {
    const { id } = ChatService.startDirectThread(1, 2)
    const msg = ChatService.sendMessage(1, id, {
      message_type: 'shipment',
      body: 'شحنة معلقة',
      payload: { shipment_id: 7, ref_number: 'SH-7' },
    })
    expect(msg.payload.shipment_id).toBe(7)
  })

  it('يمنع قراءة محادثة لغير المشارك', () => {
    const { id } = ChatService.startDirectThread(1, 2)
    expect(() => ChatService.getMessages(3, id)).toThrow(ForbiddenError)
  })

  it('قائمة المحادثات تعرض آخر رسالة', () => {
    const { id } = ChatService.startDirectThread(1, 2)
    ChatService.sendMessage(1, id, { body: 'آخر رسالة', message_type: 'text' })
    const threads = ChatService.listThreads(1)
    expect(threads[0].last_message).toBe('آخر رسالة')
    expect(threads[0].peer.display_name).toBeTruthy()
  })
})
