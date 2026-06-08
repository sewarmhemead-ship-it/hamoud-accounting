const puppeteer = require('puppeteer')

let browserPromise = null

async function getBrowser() {
  if (!browserPromise) {
    const opts = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
    // في الحاوية نستعمل Chromium الخاص بالنظام (PUPPETEER_EXECUTABLE_PATH)
    // بدل تنزيل نسخة puppeteer؛ محلياً تبقى النسخة المُنزَّلة هي الافتراضية.
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    }
    browserPromise = puppeteer.launch(opts)
  }
  return browserPromise
}

function esc(v) {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(v) {
  const n = Number(v) || 0
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d) {
  return d ? String(d).slice(0, 10) : ''
}

function rangeLabel(range) {
  if (range.from && range.to) return `من ${esc(range.from)} إلى ${esc(range.to)}`
  if (range.from) return `من ${esc(range.from)}`
  if (range.to) return `حتى ${esc(range.to)}`
  return 'كل الفترات'
}

function shell(data, title, body) {
  const centerSuffix = data.center?.name ? ` — ${esc(data.center.name)}` : ''
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif; color: #1f2937; margin: 0; padding: 24px; font-size: 12px; }
  .head { text-align: center; border-bottom: 3px solid #b8860b; padding-bottom: 12px; margin-bottom: 6px; }
  .company { color: #b8860b; font-size: 20px; font-weight: 700; }
  .title { font-size: 15px; font-weight: 600; margin-top: 4px; }
  .meta { color: #6b7280; font-size: 11px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  th { background: #1f2937; color: #fff; padding: 7px 6px; font-weight: 600; font-size: 11px; }
  td { padding: 6px; border-bottom: 1px solid #e5e7eb; text-align: center; }
  tr:nth-child(even) td { background: #fafafa; }
  .tot td { font-weight: 700; background: #fdf6e3 !important; border-top: 2px solid #b8860b; }
  .num { font-variant-numeric: tabular-nums; }
  .pos { color: #15803d; font-weight: 700; }
  .neg { color: #b91c1c; font-weight: 700; }
  .summary { margin-top: 22px; width: 320px; margin-inline-start: auto; }
  .summary td { text-align: start; }
  .summary .k { color: #4b5563; }
  .summary .v { font-weight: 700; color: #b8860b; text-align: end; }
  .section { margin-top: 22px; font-weight: 700; color: #b8860b; font-size: 13px; }
  .foot { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 10px; }
  .head-wrap { display: flex; align-items: center; justify-content: center; gap: 14px; border-bottom: 3px solid #b8860b; padding-bottom: 12px; margin-bottom: 6px; }
  .logo { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg,#b8860b,#8a6508); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 2px 6px rgba(184,134,11,.4); flex: 0 0 auto; }
  .head-txt { text-align: center; }
  .signoff { margin-top: 40px; display: flex; justify-content: space-between; gap: 40px; }
  .stamp { width: 200px; text-align: center; }
  .stamp .line { border-top: 1px solid #9ca3af; margin-top: 38px; padding-top: 6px; color: #4b5563; font-size: 11px; }
  .seal { width: 110px; height: 110px; border: 2px dashed #b8860b; border-radius: 50%; color: #b8860b; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 11px; font-weight: 700; opacity: .8; transform: rotate(-8deg); margin: 0 auto; }
</style></head><body>
  <div class="head-wrap">
    <div class="logo">🏛</div>
    <div class="head-txt">
      <div class="company">${esc(data.company)}</div>
      <div class="title">${esc(title)}${centerSuffix}</div>
      <div class="meta">${rangeLabel(data.range)} &nbsp;|&nbsp; تاريخ الإصدار: ${fmtDate(data.generated_at)}</div>
    </div>
  </div>
  ${body}
  <div class="signoff">
    <div class="stamp"><div class="line">توقيع المحاسب</div></div>
    <div class="stamp"><div class="seal">ختم<br>شركة الحمود</div></div>
    <div class="stamp"><div class="line">توقيع المدير</div></div>
  </div>
  <div class="foot">تقرير آلي صادر عن نظام التخليص الجمركي</div>
</body></html>`
}

function traderHtml(data) {
  const pc = data.price_columns
  const head =
    `<tr><th>التاريخ</th><th>السائق</th><th>البضاعة</th><th>المعبر</th><th>الوجهة</th><th>الوزن</th>` +
    pc.map((c) => `<th>${esc(c.label)}</th>`).join('') +
    `<th>المجموع</th></tr>`

  const rows = data.rows
    .map(
      (r) =>
        `<tr><td>${fmtDate(r.entry_date)}</td><td>${esc(r.driver)}</td><td>${esc(r.goods_type)}</td>` +
        `<td>${esc(r.border)}</td><td>${esc(r.destination)}</td><td class="num">${esc(r.weight ?? '')}</td>` +
        pc.map((c) => `<td class="num">${money(r.price[c.key] || 0)}</td>`).join('') +
        `<td class="num">${money(r.total)}</td></tr>`
    )
    .join('')

  const totalCols = pc.map(() => '<td></td>').join('')
  const totalRow = `<tr class="tot"><td>الإجمالي</td><td></td><td>${data.totals.shipments_count} سيارة</td><td></td><td></td><td></td>${totalCols}<td class="num">${money(data.totals.charges)}</td></tr>`

  const payments = data.payments.length
    ? `<div class="section">الدفعات</div>
       <table><tr><th>التاريخ</th><th>رقم</th><th>المبلغ</th><th>ملاحظات</th></tr>
       ${data.payments
         .map(
           (p) =>
             `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.ref_number)}</td><td class="num">${money(p.amount)}</td><td>${esc(p.notes)}</td></tr>`
         )
         .join('')}</table>`
    : ''

  const summary = `<table class="summary">
    <tr><td class="k">إجمالي الفواتير</td><td class="v num">${money(data.totals.charges)}</td></tr>
    <tr><td class="k">إجمالي الدفعات</td><td class="v num">${money(data.totals.payments)}</td></tr>
    <tr><td class="k">الرصيد المترتب عليكم</td><td class="v num">${money(data.totals.balance)}</td></tr>
  </table>`

  return shell(data, 'كشف حساب التاجر', `<table>${head}${rows}${totalRow}</table>${payments}${summary}`)
}

function profitHtml(data) {
  const head = `<tr><th>التاريخ</th><th>رقم</th><th>البضاعة</th><th>المخلص</th><th>الوجهة</th><th>التكلفة</th><th>الفاتورة</th><th>المربح</th></tr>`
  const rows = data.rows
    .map(
      (r) =>
        `<tr><td>${fmtDate(r.entry_date)}</td><td>${esc(r.ref_number)}</td><td>${esc(r.goods_name)}</td>` +
        `<td>${esc(r.broker_name)}</td><td>${esc(r.destination)}</td>` +
        `<td class="num">${money(r.cost_total)}</td><td class="num">${money(r.price_total)}</td>` +
        `<td class="num ${r.profit >= 0 ? 'pos' : 'neg'}">${money(r.profit)}</td></tr>`
    )
    .join('')
  const totalRow = `<tr class="tot"><td>الإجمالي</td><td></td><td>${data.totals.shipments_count} سيارة</td><td></td><td></td><td class="num">${money(data.totals.cost)}</td><td class="num">${money(data.totals.charges)}</td><td class="num">${money(data.totals.profit)}</td></tr>`

  const summary = `<table class="summary">
    <tr><td class="k">إجمالي فواتير التاجر (لنا)</td><td class="v num">${money(data.totals.charges)}</td></tr>
    <tr><td class="k">إجمالي التكلفة (للمخلصين)</td><td class="v num">${money(data.totals.cost)}</td></tr>
    <tr><td class="k">مربح الشركة</td><td class="v num">${money(data.totals.profit)}</td></tr>
    <tr><td class="k">نسبة الهامش</td><td class="v num">${money(data.totals.margin_pct)}%</td></tr>
    <tr><td class="k">إجمالي الدفعات</td><td class="v num">${money(data.totals.payments)}</td></tr>
    <tr><td class="k">الرصيد المترتب على التاجر</td><td class="v num">${money(data.totals.balance)}</td></tr>
  </table>`

  return shell(data, 'تقرير الربح والميزانية (داخلي)', `<table>${head}${rows}${totalRow}</table>${summary}`)
}

async function htmlToPdf(html) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    return await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '14mm', bottom: '14mm', left: '10mm', right: '10mm' },
    })
  } finally {
    await page.close()
  }
}

const STATUS_LABELS = {
  pending: 'معلقة',
  complete: 'مكتملة',
  posted: 'مرحّلة',
  delivered: 'مُسلّمة',
}

function periodHtml(data) {
  const profitRows = data.profit.days
    .map(
      (d) =>
        `<tr><td>${fmtDate(d.date)}</td><td>${d.num_trucks}</td><td class="num">${money(d.gross_profit)}</td><td class="num">${money(d.office_expenses)}</td><td class="num">${money(d.net_profit)}</td></tr>`
    )
    .join('')

  const statusRows = Object.entries(data.shipments.by_status)
    .map(
      ([st, v]) =>
        `<tr><td>${STATUS_LABELS[st] || st}</td><td>${v.count}</td><td class="num">${money(v.total)}</td></tr>`
    )
    .join('')

  const shipRows = data.shipments.rows
    .slice(0, 80)
    .map(
      (s) =>
        `<tr><td>${fmtDate(s.entry_date)}</td><td>${esc(s.ref_number)}</td><td>${esc(s.center_name)}</td><td>${esc(s.goods_name)}</td><td>${STATUS_LABELS[s.status] || s.status}</td><td class="num">${money(s.total_cost)}</td></tr>`
    )
    .join('')

  const body = `
  <p class="section">ملخص الأيام المُغلقة (حسب تاريخ الإغلاق في daily_profit)</p>
  <table>
    <tr><th>التاريخ</th><th>سيارات</th><th>إيراد</th><th>مصاريف مكتب</th><th>صافي</th></tr>
    ${profitRows || '<tr><td colspan="5">لا أيام مُغلقة في هذه الفترة</td></tr>'}
    <tr class="tot"><td>المجموع</td><td>${data.profit.totals.num_trucks}</td><td class="num">${money(data.profit.totals.gross_profit)}</td><td class="num">${money(data.profit.totals.office_expenses)}</td><td class="num">${money(data.profit.totals.net_profit)}</td></tr>
  </table>
  <p class="section">الشحنات حسب تاريخ الدخول (entry_date)</p>
  <table><tr><th>الحالة</th><th>العدد</th><th>القيمة</th></tr>${statusRows}</table>
  <table>
    <tr><th>تاريخ</th><th>رقم</th><th>تاجر</th><th>بضاعة</th><th>حالة</th><th>مجموع</th></tr>
    ${shipRows || '<tr><td colspan="6">لا شحنات</td></tr>'}
  </table>
  ${data.shipments.rows.length > 80 ? '<p class="meta">عرض أول 80 سيارة — التفاصيل الكاملة في Excel</p>' : ''}`

  return shell(data, 'تقرير الفترة المحاسبي', body)
}

function dailyProfitHtml(data) {
  const w = data.waterfall
  const diffRows = Object.entries(data.diff_labels || {})
    .map(
      ([k, label]) =>
        `<tr><td>${esc(label)}</td><td class="num">${money(w.diffs[k] || 0)}</td></tr>`
    )
    .join('')

  const moveRows = (data.movements || [])
    .map(
      (m) =>
        `<tr><td>${esc(m.ref_number)}</td><td>${esc(m.trader_name)}</td><td>${esc(m.goods_name)}</td><td>${fmtDate(m.posted_at)}</td><td class="num">${money(m.clearance_amount)}</td></tr>`
    )
    .join('')

  const payRows = (data.payments || [])
    .map(
      (p) =>
        `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.center_name)}</td><td class="num">${money(p.amount_usd)}</td><td>${esc(p.category)}</td></tr>`
    )
    .join('')

  const expenseBlock = (title, lines, extraCol) => {
    if (!lines?.length) return ''
    const rows = lines
      .map((l) => {
        const extra = extraCol ? `<td>${esc(extraCol(l))}</td>` : ''
        return `<tr><td>${esc(l.label)}</td>${extra}<td class="num">${money(l.amount)}</td></tr>`
      })
      .join('')
    const headExtra = extraCol ? '<th>تصنيف</th>' : ''
    return `<p class="section">${title}</p><table><tr><th>البند</th>${headExtra}<th>المبلغ</th></tr>${rows}</table>`
  }

  const body = `
  <p class="section">الميزانية — ${esc(data.date)} ${data.is_closed ? '(مُغلق)' : '(معاينة)'}</p>
  <table>
    <tr><th>البند</th><th>المبلغ</th></tr>
    <tr><td>سيارات مرحّلة اليوم</td><td class="num">${w.num_trucks || 0}</td></tr>
    <tr><td>مربح السيارات</td><td class="num">${money(w.base_clearance)}</td></tr>
    ${diffRows}
    <tr class="tot"><td>إجمالي اليوم</td><td class="num">${money(w.gross_profit)}</td></tr>
    <tr><td>مصاريف المكتب</td><td class="num">${money(w.office_expenses)}</td></tr>
    <tr><td>مصاريف المنزل</td><td class="num">${money(w.home_expenses)}</td></tr>
    <tr class="tot"><td>صافي المربح</td><td class="num">${money(w.net_profit)}</td></tr>
  </table>
  ${expenseBlock('تفصيل مكتب', data.expenses?.office)}
  ${expenseBlock('تفصيل تشغيلية', data.expenses?.operations)}
  ${expenseBlock('تفصيل متفرقة', data.expenses?.misc, (l) => (l.bucket === 'home' ? 'منزل' : 'مكتب'))}
  ${expenseBlock('تفصيل منزل', data.expenses?.home)}
  <p class="section">السيارات المرحّلة (${data.movements?.length || 0}) — إجمالي ${money(data.movements_total)}</p>
  <table>
    <tr><th>رقم</th><th>تاجر</th><th>بضاعة</th><th>ترحيل</th><th>إيراد</th></tr>
    ${moveRows || '<tr><td colspan="5">لا سيارات مرحّلة في هذا اليوم</td></tr>'}
  </table>
  <p class="section">الدفعات النقدية — إجمالي ${money(data.payments_total)}</p>
  <table>
    <tr><th>تاريخ</th><th>مركز</th><th>مبلغ</th><th>فئة</th></tr>
    ${payRows || '<tr><td colspan="4">لا دفعات</td></tr>'}
  </table>`

  return shell(
    { company: data.company, range: { from: data.date, to: data.date }, generated_at: data.generated_at },
    'تقرير المربح اليومي',
    body
  )
}

function monthlyProfitHtml(data) {
  const prefix = data.month_prefix || `${data.year}-${String(data.month).padStart(2, '0')}`
  const dayRows = (data.days || [])
    .map(
      (d) =>
        `<tr><td>${fmtDate(d.date)}</td><td class="num">${d.num_trucks}</td><td class="num">${money(d.gross_profit)}</td><td class="num">${money(d.office_expenses)}</td><td class="num">${money(d.home_expenses)}</td><td class="num">${money(d.net_profit)}</td></tr>`
    )
    .join('')

  const best = data.best_day
    ? `<p class="meta">أفضل يوم: ${fmtDate(data.best_day.date)} — صافي ${money(data.best_day.net_profit)}</p>`
    : ''
  const worst = data.worst_day
    ? `<p class="meta">أضعف يوم: ${fmtDate(data.worst_day.date)} — صافي ${money(data.worst_day.net_profit)}</p>`
    : ''

  const body = `
  <p class="section">ملخص الشهر — ${esc(prefix)}</p>
  <p class="meta">${data.days_count || 0} يوماً مُغلقاً · ${data.num_trucks || 0} سيارة · متوسط صافي/يوم ${money(data.avg_net)}</p>
  <table>
    <tr><th>التاريخ</th><th>سيارات</th><th>إجمالي</th><th>مكتب</th><th>منزل</th><th>صافي</th></tr>
    ${dayRows || '<tr><td colspan="6">لا أيام مُغلقة في هذا الشهر</td></tr>'}
    <tr class="tot"><td>المجموع</td><td class="num">${data.num_trucks || 0}</td><td class="num">${money(data.gross_profit)}</td><td class="num">${money(data.office_expenses)}</td><td class="num">${money(data.home_expenses)}</td><td class="num">${money(data.net_profit)}</td></tr>
  </table>
  ${best}
  ${worst}`

  return shell(
    {
      company: data.company,
      range: { from: `${prefix}-01`, to: `${prefix}-31` },
      generated_at: data.generated_at,
    },
    'تقرير المربح الشهري',
    body
  )
}

function inventoryHtml(data) {
  const catLabels = data.category_labels || {}
  const rows = (data.rows || [])
    .map(
      (r) =>
        `<tr><td>${esc(r.center_code)}</td><td>${esc(r.center_name)}</td><td>${esc(catLabels[r.category] || r.category)}</td><td class="num">${money(r.balance)}</td><td class="num">${money(r.posted_undelivered)}</td><td class="num">${money(r.wip_value)}</td><td class="num">${money(r.total)}</td></tr>`
    )
    .join('')
  const t = data.totals || {}
  const byCat = Object.entries(t.by_category || {})
    .map(
      ([cat, sum]) =>
        `<tr><td>${esc(catLabels[cat] || cat)}</td><td class="num">${money(sum)}</td></tr>`
    )
    .join('')

  const changed = (data.compare?.diffs || []).filter((d) => d.status === 'changed')
  const cmpRows = changed
    .slice(0, 40)
    .map(
      (d) =>
        `<tr><td>${esc(d.center_name)}</td><td class="num">${money(d.snapshot_total)}</td><td class="num">${money(d.live_total)}</td><td class="num">${money(d.delta_total)}</td></tr>`
    )
    .join('')

  const mode = data.is_live ? 'معاينة حية' : 'لقطة محفوظة'
  const body = `
  <p class="section">جرد الذمم — ${esc(data.snapshot_date)} (${mode})</p>
  <p class="meta">${esc(data.label || '')} · WIP لا يدخل الإجمالي · الذمة = رصيد + جارية (محرك balance)</p>
  <table>
    <tr><th>كود</th><th>مركز</th><th>تصنيف</th><th>رصيد</th><th>جارية</th><th>WIP</th><th>ذمة</th></tr>
    ${rows || '<tr><td colspan="7">لا بيانات</td></tr>'}
    <tr class="tot"><td colspan="3">المجموع (${t.centers || 0} مركز)</td><td class="num">${money(t.balance)}</td><td class="num">${money(t.posted_undelivered)}</td><td class="num">${money(t.wip_value)}</td><td class="num">${money(t.total)}</td></tr>
  </table>
  ${byCat ? `<p class="section">ملخص التصنيف</p><table><tr><th>تصنيف</th><th>ذمة</th></tr>${byCat}</table>` : ''}
  ${changed.length ? `<p class="section">مقارنة مع الوضع الحي (${data.compare.changed_count} تغيّر)</p><table><tr><th>مركز</th><th>محفوظ</th><th>حي</th><th>فرق</th></tr>${cmpRows}</table>` : ''}
  ${changed.length > 40 ? '<p class="meta">عرض أول 40 تغيّر — التفاصيل الكاملة في Excel</p>' : ''}`

  return shell(
    { company: data.company, range: { from: data.snapshot_date, to: data.snapshot_date }, generated_at: data.generated_at },
    'تقرير الجرد',
    body
  )
}

function inventoryRangeHtml(data) {
  const dayRows = (data.days || [])
    .map(
      (d) =>
        `<tr><td>${fmtDate(d.date)}</td><td>${esc(d.label || '')}</td><td>${d.centers_count}</td><td class="num">${money(d.balance)}</td><td class="num">${money(d.posted_undelivered)}</td><td class="num">${money(d.wip_value)}</td><td class="num">${money(d.total)}</td></tr>`
    )
    .join('')
  const dl = data.delta_first_last
  const deltaBlock = dl
    ? `<p class="meta">فرق أول يوم → آخر يوم: الذمة ${money(dl.delta_total)} (رصيد ${money(dl.delta_balance)}, جارية ${money(dl.delta_posted)})</p>`
    : ''
  const body = `
  <p class="section">جرد الفترة — من ${esc(data.from)} إلى ${esc(data.to)}</p>
  <p class="meta">${data.days_count} يوماً فيه لقطة محفوظة · الأيام بلا لقطة لا تظهر</p>
  ${deltaBlock}
  <table>
    <tr><th>تاريخ</th><th>تسمية</th><th>مراكز</th><th>رصيد</th><th>جارية</th><th>WIP</th><th>ذمة</th></tr>
    ${dayRows || '<tr><td colspan="7">لا لقطات في هذه الفترة</td></tr>'}
  </table>
  <p class="meta">التفاصيل الكاملة لكل مركز/يوم في ملف Excel</p>`
  return shell(
    { company: data.company, range: { from: data.from, to: data.to }, generated_at: data.generated_at },
    'تقرير جرد الفترة',
    body
  )
}

/** جدول جانب واحد من الكشف المزدوج. */
function dualSideTable(side, field) {
  const cols = side.columns || []
  const head =
    `<tr><th>م</th><th>التاريخ</th><th>البيان</th>` +
    cols.map((c) => `<th>${esc(c.label)}</th>`).join('') +
    `<th>المجموع</th><th>الدفعات</th></tr>`

  let i = 1
  const rows = side.rows
    .map((r) => {
      if (r.kind === 'truck') {
        return (
          `<tr><td>${i++}</td><td>${fmtDate(r.date)}</td><td>${esc(r.goods_name || r.ref_number)}</td>` +
          cols.map((c) => `<td class="num">${money((r[field] && r[field][c.key]) || 0)}</td>`).join('') +
          `<td class="num">${money(r[`${field}_total`] || 0)}</td><td></td></tr>`
        )
      }
      return (
        `<tr><td>${i++}</td><td>${fmtDate(r.date)}</td><td>${esc(r.label || 'دفعة')}</td>` +
        cols.map(() => '<td></td>').join('') +
        `<td></td><td class="num pos">${money(r.amount || 0)}</td></tr>`
      )
    })
    .join('')

  const totCols = cols.map(() => '<td></td>').join('')
  const tot =
    `<tr class="tot"><td>الإجمالي</td><td></td><td></td>${totCols}` +
    `<td class="num">${money(side.total_charges)}</td><td class="num">${money(side.total_payments)}</td></tr>` +
    `<tr class="tot"><td colspan="${3 + cols.length}">الرصيد — ${esc(side.direction)}</td>` +
    `<td colspan="2" class="num">${money(side.abs_balance)}</td></tr>`

  return `<table>${head}${rows}${tot}</table>`
}

function dualStatementHtml(data) {
  const p = data.company_profit
  const banner = `<table class="summary" style="width:380px">
    <tr><td class="k">فاتورة التاجر (ما نأخذه)</td><td class="v num">${money(data.trader_side.total_charges)}</td></tr>
    <tr><td class="k">تكلفة المخلص (ما ندفعه)</td><td class="v num">${money(data.broker_side.total_charges)}</td></tr>
    <tr><td class="k">مربح الشركة الإجمالي</td><td class="v num">${money(p.total)}</td></tr>
    <tr><td class="k">عدد السيارات المُرحَّلة</td><td class="v num">${p.truck_count}</td></tr>
    <tr><td class="k">متوسط مربح السيارة</td><td class="v num">${money(p.per_truck_avg)}</td></tr>
  </table>`

  const body =
    banner +
    `<div class="section">كشف المخلص (ما ندفعه)</div>` +
    dualSideTable(data.broker_side, 'cost') +
    `<div class="section">كشف التاجر (ما نأخذه)</div>` +
    dualSideTable(data.trader_side, 'price')

  return shell(data, 'الكشف المزدوج', body)
}

module.exports = {
  traderHtml,
  profitHtml,
  dualStatementHtml,
  periodHtml,
  dailyProfitHtml,
  monthlyProfitHtml,
  inventoryHtml,
  inventoryRangeHtml,
  htmlToPdf,
}
