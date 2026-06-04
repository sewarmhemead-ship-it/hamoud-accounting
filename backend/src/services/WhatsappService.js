const AccountingService = require('./AccountingService')

class WhatsappService {
  formatCenterStatement(centerId) {
    const { summary, transactions } = AccountingService.getCenterStatement(centerId, {
      limit: 10,
    })

    const lines = [
      `📋 *كشف حساب*`,
      `━━━━━━━━━━━━━━━`,
      `💰 الرصيد: *$${summary.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}*`,
      `🚛 جارية (مرحّلة): $${summary.posted_undelivered_value.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${summary.posted_undelivered_count})`,
      `⏳ قيد الإكمال: $${summary.wip_value.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${summary.wip_count})`,
      `📊 إجمالي الذمة: *$${summary.grand_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}*`,
      ``,
      `📝 *آخر الحركات:*`,
    ]

    for (const tx of transactions.slice(0, 5)) {
      const sign = tx.type === 'out' ? '+' : '-'
      const date = tx.date.split('T')[0]
      lines.push(`${sign}$${tx.amount_usd} — ${date} — ${tx.notes || tx.ref_number}`)
    }

    return lines.join('\n')
  }
}

module.exports = new WhatsappService()
