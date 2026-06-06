const CenterModel = require('../models/CenterModel')
const ShipmentModel = require('../models/ShipmentModel')
const TransactionModel = require('../models/TransactionModel')
const AccountingService = require('./AccountingService')
const { calculateGrandTotal } = require('../engine/balance')
const { TX_CATEGORY } = require('../config/constants')
const {
  COST_FIELDS,
  PRICE_FIELDS,
  COST_FIELD_LABELS,
  PRICE_FIELD_LABELS,
  calculateCostTotal,
  calculatePriceTotal,
  calculateShipmentProfit,
  resolveTotalCost,
} = require('../engine/clearance')
const { round2 } = require('../engine/numbers')

const SettingsService = require('./SettingsService')

function inRange(dateStr, from, to) {
  if (!dateStr) return true
  const d = String(dateStr).slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

// أعمدة لها قيمة غير صفرية في أي سيارة (لتقرير أنظف)
function activeColumns(shipments, fields) {
  return fields.filter((f) => shipments.some((s) => Number(s[f]) > 0))
}

class TraderReportService {
  /**
   * يجمع كامل بيانات التاجر (داخلي): السيارات بأقلام التكلفة والسعر، الدفعات،
   * مربح الشركة، وملخص الميزانية — ضمن فترة تاريخية اختيارية.
   * يُستخدم لكلا التقريرين؛ التقرير الخارجي يُسقط التكلفة/الربح.
   *
   * @param {number} centerId معرّف التاجر
   * @param {{from?:string,to?:string}} range فلترة بالتاريخ (YYYY-MM-DD)
   */
  build(centerId, { from, to } = {}) {
    const center = CenterModel.findById(centerId)
    if (!center) {
      const err = new Error('المركز غير موجود')
      err.statusCode = 404
      throw err
    }

    const { rows: allShipments } = ShipmentModel.listWithDetails({
      filters: { center_id: centerId },
      limit: 5000,
    })

    const shipments = allShipments
      .filter((s) => inRange(s.entry_date, from, to))
      .sort((a, b) => String(a.entry_date).localeCompare(String(b.entry_date)))

    const { rows: paymentsIn } = TransactionModel.findByCenter(centerId, {
      type: 'in',
      from,
      to,
      limit: 5000,
    })
    const { rows: offsetOut } = TransactionModel.findByCenter(centerId, {
      type: 'out',
      category: TX_CATEGORY.OFFSET,
      from,
      to,
      limit: 5000,
    })

    const priceCols = activeColumns(shipments, PRICE_FIELDS)
    const costCols = activeColumns(shipments, COST_FIELDS)

    let totalCharges = 0
    let totalCost = 0
    let totalProfit = 0

    const rows = shipments.map((s) => {
      const resolved = resolveTotalCost(s)
      const priceTotal = resolved.traderAmount
      const costTotal = resolved.clearanceAmount
      const profit = round2(priceTotal - costTotal)
      totalCharges = round2(totalCharges + priceTotal)
      totalCost = round2(totalCost + costTotal)
      totalProfit = round2(totalProfit + profit)

      const priceBreakdown = {}
      for (const f of priceCols) priceBreakdown[f] = Number(s[f]) || 0
      const costBreakdown = {}
      for (const f of costCols) costBreakdown[f] = Number(s[f]) || 0

      return {
        id: s.id,
        ref_number: s.ref_number,
        entry_date: s.entry_date,
        goods_name: s.goods_name,
        source: s.source,
        destination: s.destination,
        weight: s.weight,
        broker_name: s.broker_name,
        status: s.status,
        price: priceBreakdown,
        cost: costBreakdown,
        price_total: priceTotal,
        cost_total: costTotal,
        profit,
      }
    })

    const totalPayments = round2(
      paymentsIn.reduce((a, p) => a + (Number(p.amount_usd ?? p.amount) || 0), 0)
    )
    const totalOffsetCharges = round2(
      offsetOut.reduce((a, p) => a + (Number(p.amount_usd ?? p.amount) || 0), 0)
    )
    const chargesPosted = round2(
      shipments
        .filter((s) => s.status === 'posted' || s.status === 'delivered')
        .reduce((a, s) => a + resolveTotalCost(s).traderAmount, 0) + totalOffsetCharges
    )
    const chargesWip = round2(
      shipments
        .filter((s) => s.status === 'pending' || s.status === 'complete')
        .reduce((a, s) => a + resolveTotalCost(s).traderAmount, 0)
    )
    const acct = AccountingService.getCenterFullStatement(centerId)
    const balance = calculateGrandTotal(acct.balance, acct.posted_undelivered_value)
    const marginPct = totalCost > 0 ? round2((totalProfit / totalCost) * 100) : 0

    const paymentRows = [
      ...paymentsIn.map((p) => ({
        date: p.date,
        ref_number: p.ref_number,
        amount: round2(Number(p.amount_usd ?? p.amount) || 0),
        notes: p.notes,
        kind: p.category === TX_CATEGORY.OFFSET ? 'offset_credit' : 'payment',
        category: p.category,
      })),
      ...offsetOut.map((p) => ({
        date: p.date,
        ref_number: p.ref_number,
        amount: round2(Number(p.amount_usd ?? p.amount) || 0),
        notes: p.notes,
        kind: 'offset_debit',
        category: p.category,
      })),
    ].sort((a, b) => String(a.date).localeCompare(String(b.date)))

    return {
      company: SettingsService.getReportCompanyName(),
      center: { id: center.id, name: center.name, code: center.code, type: center.type },
      range: { from: from || null, to: to || null },
      generated_at: new Date().toISOString(),
      price_columns: priceCols.map((f) => ({ key: f, label: PRICE_FIELD_LABELS[f] })),
      cost_columns: costCols.map((f) => ({ key: f, label: COST_FIELD_LABELS[f] })),
      rows,
      payments: paymentRows,
      totals: {
        charges: totalCharges,
        charges_posted: chargesPosted,
        charges_wip: chargesWip,
        cost: totalCost,
        payments: totalPayments,
        offset_charges: totalOffsetCharges,
        balance,
        accounting_balance: acct.balance,
        accounting_posted_undelivered: acct.posted_undelivered_value,
        accounting_wip: acct.wip_value,
        profit: totalProfit,
        margin_pct: marginPct,
        shipments_count: rows.length,
      },
    }
  }

  /** التقرير الخارجي (للتاجر): بلا تكلفة ولا ربح. */
  buildTraderStatement(centerId, range) {
    const full = this.build(centerId, range)
    return {
      kind: 'trader',
      company: full.company,
      center: full.center,
      range: full.range,
      generated_at: full.generated_at,
      price_columns: full.price_columns,
      rows: full.rows.map((r) => ({
        id: r.id,
        ref_number: r.ref_number,
        entry_date: r.entry_date,
        goods_name: r.goods_name,
        source: r.source,
        destination: r.destination,
        weight: r.weight,
        price: r.price,
        total: r.price_total,
      })),
      payments: full.payments,
      totals: {
        charges: full.totals.charges,
        payments: full.totals.payments,
        balance: full.totals.balance,
        shipments_count: full.totals.shipments_count,
      },
    }
  }

  /** التقرير الداخلي (الربح والميزانية): تكلفة مقابل سعر + مربح الشركة. */
  buildProfitReport(centerId, range) {
    const full = this.build(centerId, range)
    return {
      kind: 'profit',
      company: full.company,
      center: full.center,
      range: full.range,
      generated_at: full.generated_at,
      rows: full.rows.map((r) => ({
        id: r.id,
        ref_number: r.ref_number,
        entry_date: r.entry_date,
        goods_name: r.goods_name,
        source: r.source,
        destination: r.destination,
        broker_name: r.broker_name,
        cost_total: r.cost_total,
        price_total: r.price_total,
        profit: r.profit,
      })),
      totals: full.totals,
    }
  }
}

module.exports = new TraderReportService()
