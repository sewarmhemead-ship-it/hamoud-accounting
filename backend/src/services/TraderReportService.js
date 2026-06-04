const CenterModel = require('../models/CenterModel')
const ShipmentModel = require('../models/ShipmentModel')
const TransactionModel = require('../models/TransactionModel')
const {
  COST_FIELDS,
  PRICE_FIELDS,
  COST_FIELD_LABELS,
  PRICE_FIELD_LABELS,
  calculateCostTotal,
  calculatePriceTotal,
  calculateShipmentProfit,
} = require('../engine/clearance')
const { round2 } = require('../engine/numbers')

const COMPANY_NAME = 'شركة الحمود التجارية للنقل الدولي'

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

    const { rows: payments } = TransactionModel.findByCenter(centerId, {
      type: 'in',
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
      const priceTotal = calculatePriceTotal(s)
      const costTotal = calculateCostTotal(s)
      const profit = calculateShipmentProfit(s)
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
      payments.reduce((a, p) => a + (Number(p.amount_usd ?? p.amount) || 0), 0)
    )
    const balance = round2(totalCharges - totalPayments)
    const marginPct = totalCost > 0 ? round2((totalProfit / totalCost) * 100) : 0

    const paymentRows = payments
      .map((p) => ({
        date: p.date,
        ref_number: p.ref_number,
        amount: round2(Number(p.amount_usd ?? p.amount) || 0),
        notes: p.notes,
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))

    return {
      company: COMPANY_NAME,
      center: { id: center.id, name: center.name, code: center.code, type: center.type },
      range: { from: from || null, to: to || null },
      generated_at: new Date().toISOString(),
      price_columns: priceCols.map((f) => ({ key: f, label: PRICE_FIELD_LABELS[f] })),
      cost_columns: costCols.map((f) => ({ key: f, label: COST_FIELD_LABELS[f] })),
      rows,
      payments: paymentRows,
      totals: {
        charges: totalCharges,
        cost: totalCost,
        payments: totalPayments,
        balance,
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
