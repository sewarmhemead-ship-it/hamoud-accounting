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
      <div class="title">${esc(title)} — ${esc(data.center.name)}</div>
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
    `<tr><th>التاريخ</th><th>رقم</th><th>البضاعة</th><th>المصدر</th><th>الوجهة</th><th>الوزن</th>` +
    pc.map((c) => `<th>${esc(c.label)}</th>`).join('') +
    `<th>المجموع</th></tr>`

  const rows = data.rows
    .map(
      (r) =>
        `<tr><td>${fmtDate(r.entry_date)}</td><td>${esc(r.ref_number)}</td><td>${esc(r.goods_name)}</td>` +
        `<td>${esc(r.source)}</td><td>${esc(r.destination)}</td><td class="num">${esc(r.weight ?? '')}</td>` +
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

module.exports = { traderHtml, profitHtml, htmlToPdf }
