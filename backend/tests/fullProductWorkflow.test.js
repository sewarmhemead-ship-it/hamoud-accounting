/**
 * مسار منتج كامل: سيارة → تخليص → ذمة → دفعة → إغلاق يوم → نسخة → تواصل
 */
const { createFullProductDb, destroyFullProductDb } = require('./helpers/fullProductDb')
const ShipmentService = require('../src/services/ShipmentService')
const AccountingService = require('../src/services/AccountingService')
const ProfitService = require('../src/services/ProfitService')
const AuthService = require('../src/services/AuthService')
const BackupService = require('../src/services/BackupService')
const ChatService = require('../src/services/ChatService')
const ProfileService = require('../src/services/ProfileService')
const { buildAlerts } = require('../src/services/NotificationService')
const { generateRef } = require('../src/utils/refGenerator')
const { REF_PREFIX } = require('../src/config/constants')
const { calculateGrandTotal } = require('../src/engine/balance')
const { calculateShipmentTotal, classifyPostability } = require('../src/engine')

let ctx

beforeEach(async () => {
  ctx = await createFullProductDb()
})

afterEach(() => {
  destroyFullProductDb(ctx?.db)
  ctx = null
})

describe('مسار المنتج الكامل — E2E على الخدمات', () => {
  it('1) تسجيل دخول + صلاحيات', async () => {
    const login = await AuthService.login('admin', 'testpass')
    expect(login.token).toBeTruthy()
    expect(login.user.permissions.length).toBeGreaterThan(5)
    expect(login.welcome.landing_path).toBe('/')
  })

  it('2) سيارة كاملة → ترحيل → قيود ذمة', () => {
    const truck = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'رز',
        source: 'تركيا',
        destination: 'حلب',
        entry_date: ctx.testDate,
        tarseem: 2000,
        workers: 100,
        clearance_fee: 50,
        syrian_driver: 400,
        service_fee: 30,
      },
      ctx.adminId
    )
    expect(truck.status).toBe('pending')
    expect(classifyPostability(truck).is_postable).toBe(true)
    const engineTotal = calculateShipmentTotal({
      tarseem: 2000,
      workers: 100,
      clearance_fee: 50,
      syrian_driver: 400,
      service_fee: 30,
    })
    expect(engineTotal).toBe(2580)

    const posted = ShipmentService.postShipment(truck.id, ctx.adminId)
    expect(posted.shipment.status).toBe('posted')
    expect(posted.trader_tx.center_id).toBe(ctx.traderId)
    expect(posted.trader_tx.type).toBe('out')

    const stmt = AccountingService.getCenterFullStatement(ctx.traderId)
    expect(stmt.posted_undelivered_value).toBeGreaterThan(0)
    expect(stmt.grand_total).toBe(
      calculateGrandTotal(stmt.balance, stmt.posted_undelivered_value)
    )
  })

  it('3) دفعة + إغلاق يوم مربح', () => {
    const truck = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'قمح',
        source: 'أنقرة',
        destination: 'دمشق',
        entry_date: ctx.testDate,
        tarseem: 1500,
        workers: 80,
        clearance_fee: 40,
        syrian_driver: 300,
      },
      ctx.adminId
    )
    ShipmentService.postShipment(truck.id, ctx.adminId)

    AccountingService.createPayment(
      {
        ref_number: generateRef(REF_PREFIX.TRANSACTION),
        center_id: ctx.traderId,
        amount: 500,
        currency: 'USD',
        date: `${ctx.testDate}T12:00:00.000Z`,
        notes: 'دفعة اختبار',
      },
      ctx.adminId
    )

    const dayCalc = ProfitService.calculateDay(ctx.testDate)
    expect(dayCalc.num_trucks).toBeGreaterThanOrEqual(1)
    expect(dayCalc.gross_revenue).toBeGreaterThan(0)

    const closed = ProfitService.closeDay(
      ctx.testDate,
      { office_expenses: 20, home_expenses: 10, notes: 'يوم اختبار' },
      ctx.adminId
    )
    expect(closed.net_profit).toBe(closed.gross_profit - 30)
  })

  it('4) نسخة احتياطية Excel + إشعارات + محادثة + صورة', async () => {
    const truck = ShipmentService.createShipment(
      {
        center_id: ctx.traderId,
        clearance_center_id: ctx.brokerId,
        border_id: ctx.borderId,
        goods_name: 'زيت',
        source: 'مرسين',
        destination: 'حمص',
        entry_date: ctx.testDate,
        tarseem: 1000,
        workers: 50,
        clearance_fee: 25,
        syrian_driver: 200,
      },
      ctx.adminId
    )
    ShipmentService.postShipment(truck.id, ctx.adminId)

    const { alerts } = buildAlerts({
      id: ctx.adminId,
      role: 'admin',
      permissions: [],
    })
    expect(Array.isArray(alerts)).toBe(true)

    const backup = await BackupService.runBackup({ userId: ctx.adminId, reason: 'test' })
    expect(backup.ok).toBe(true)

    const thread = ChatService.startDirectThread(ctx.adminId, ctx.accId)
    const msg = ChatService.sendMessage(ctx.adminId, thread.id, {
      body: 'مرحباً من الاختبار',
      message_type: 'text',
    })
    expect(msg.body).toContain('اختبار')

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    )
    const av = ProfileService.saveAvatar(
      ctx.adminId,
      `data:image/png;base64,${png.toString('base64')}`
    )
    expect(av.avatar_url).toMatch(/\/profile\/avatar\//)
  })
})
