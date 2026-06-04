const { CalculationError } = require('./errors')
const { toFiniteNumber, round2 } = require('./numbers')

/**
 * حساب سطر بيع طحين بالوزن — راجع «بيع طحين عزيز.xlsx».
 *
 * الصيغة:
 *   الإيراد = سعر البيع × الوزن
 *   التكلفة = سعر الشراء × الوزن
 *   المربح = (سعر البيع − سعر الشراء) × الوزن − أجار التراك
 *
 * @param {object} data
 * @param {number} data.sale_price سعر بيع الكيلو (≥ 0)
 * @param {number} data.purchase_price سعر شراء الكيلو (≥ 0)
 * @param {number} data.weight الوزن بالكيلوغرام (> 0)
 * @param {number} [data.truck_rent=0] أجار التراك
 * @returns {{ weight:number, revenue:number, cost:number, truck_rent:number, margin_per_kg:number, profit:number }}
 */
function calculateFlourTraderLine(data = {}) {
  if (data === null || typeof data !== 'object') {
    throw new CalculationError('بيانات سطر الطحين غير صالحة')
  }

  const salePrice = toFiniteNumber(data.sale_price, 'سعر البيع')
  const purchasePrice = toFiniteNumber(data.purchase_price, 'سعر الشراء')
  const weight = toFiniteNumber(data.weight, 'الوزن')
  const truckRent = toFiniteNumber(data.truck_rent, 'أجار التراك')

  if (weight <= 0) {
    throw new CalculationError('الوزن يجب أن يكون أكبر من صفر', { weight })
  }

  const marginPerKg = salePrice - purchasePrice
  const revenue = salePrice * weight
  const cost = purchasePrice * weight
  const profit = marginPerKg * weight - truckRent

  return {
    weight,
    revenue: round2(revenue),
    cost: round2(cost),
    truck_rent: round2(truckRent),
    margin_per_kg: round2(marginPerKg),
    profit: round2(profit),
  }
}

module.exports = { calculateFlourTraderLine }
