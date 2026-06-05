const { fullBackupWorkbook } = require('../src/services/reports/fullBackupWorkbook')
const { workbookToBuffer } = require('../src/services/reports/excelReport')
const ExcelJS = require('exceljs')

const minimalData = {
  company: 'شركة تجريبية',
  generated_at: '2026-06-05T12:00:00.000Z',
  counts: {
    centers: 1,
    transactions: 1,
    shipments: 1,
    daily_profit: 1,
    inventory_snapshots: 1,
    juice_shipments: 1,
    users: 1,
    settings: 2,
  },
  centers: [
    {
      code: '101',
      name: 'تاجر أ',
      type: 'trader',
      currency: 'USD',
      statement: {
        total_out: 1000,
        total_in: 400,
        balance: 600,
        posted_undelivered_value: 200,
        wip_value: 50,
        grand_total: 800,
      },
    },
  ],
  transactions: [
    {
      ref_number: 'TX-1',
      date: '2026-06-01',
      type: 'out',
      center_name: 'تاجر أ',
      currency: 'USD',
      amount: 100,
      amount_usd: 100,
      category: 'payment',
      shipment_id: null,
      notes: 'دفعة',
    },
  ],
  shipments: [
    {
      ref_number: 'SH-1',
      entry_date: '2026-06-01',
      trader_name: 'تاجر أ',
      broker_name: 'مخلص ب',
      goods_name: 'بضاعة',
      source: 'تركيا',
      destination: 'سوريا',
      status: 'posted',
      total_cost: 500,
      posted_at: '2026-06-02',
      delivered_at: null,
    },
  ],
  daily_profit: [
    {
      date: '2026-06-01',
      num_trucks: 2,
      gross_profit: 300,
      office_expenses: 50,
      home_expenses: 20,
      net_profit: 230,
      notes: '',
    },
  ],
  inventory_snapshots: [
    {
      snapshot_date: '2026-06-01',
      label: 'جرد',
      center_code: '101',
      center_name: 'تاجر أ',
      balance: 600,
      posted_undelivered: 200,
      wip_value: 50,
      total: 800,
      category: 'trader',
    },
  ],
  juice_shipments: [
    {
      ref_number: 'J-1',
      date: '2026-06-01',
      product_type: 'برتقال',
      units_sent: 100,
      units_lost: 2,
      units_received: 98,
      total_profit: 150,
      center_name: 'تاجر أ',
      notes: '',
    },
  ],
  users: [
    {
      id: 1,
      username: 'admin',
      name: 'مدير',
      role: 'admin',
      permissions: ['profit.view'],
    },
  ],
  settings: [
    ['app_title', 'حمود'],
    ['backup_auto_enabled', false],
  ],
}

describe('fullBackupWorkbook', () => {
  it('ينشئ مصنفاً بكل الأوراق المطلوبة', async () => {
    const wb = fullBackupWorkbook(minimalData)
    const names = wb.worksheets.map((ws) => ws.name)
    expect(names).toEqual([
      'ملخص',
      'المراكز',
      'الحركات',
      'الشحنات',
      'المربح_اليومي',
      'الجرد',
      'عصائر',
      'مستخدمون',
      'إعدادات',
    ])
  })

  it('يكتب بيانات المراكز والملخص', async () => {
    const wb = fullBackupWorkbook(minimalData)
    const summary = wb.getWorksheet('ملخص')
    expect(summary.getRow(5).getCell(1).value).toBe('المراكز')
    expect(summary.getRow(5).getCell(2).value).toBe(1)

    const centers = wb.getWorksheet('المراكز')
    const dataRow = centers.getRow(2)
    expect(dataRow.getCell(1).value).toBe('101')
    expect(dataRow.getCell(7).value).toBe(600)
    expect(dataRow.getCell(10).value).toBe(800)
  })

  it('يُصدَّر إلى buffer صالح لـ Excel', async () => {
    const wb = fullBackupWorkbook(minimalData)
    const buffer = await workbookToBuffer(wb)
    expect(buffer.byteLength).toBeGreaterThan(1000)

    const loaded = new ExcelJS.Workbook()
    await loaded.xlsx.load(buffer)
    expect(loaded.worksheets.length).toBe(9)
    expect(loaded.getWorksheet('مستخدمون').getRow(2).getCell(2).value).toBe('admin')
  })
})
