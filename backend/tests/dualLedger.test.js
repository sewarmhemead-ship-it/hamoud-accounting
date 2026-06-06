const {
  hasActiveDualLedger,
  missingRequiredFields,
  syncLegacyFromDual,
  buildLegacySyncPatch,
  brokerShipmentValue,
  traderShipmentValue,
} = require('../src/engine/dualLedger')
const { resolveTotalCost, classifyPostability } = require('../src/engine')

describe('dualLedger — ربط المزدوج بالكلاسيكي', () => {
  const legacyComplete = {
    status: 'complete',
    tarseem: 2646,
    syrian_driver: 400,
    clearance_fee: 30,
    cost_tarseem: 0,
    price_tarseem: 0,
  }

  it('أصفار migration لا تُفعّل المسار المزدوج', () => {
    expect(hasActiveDualLedger(legacyComplete)).toBe(false)
    const r = resolveTotalCost(legacyComplete)
    expect(r.isDual).toBe(false)
    expect(r.traderAmount).toBe(3076)
  })

  it('price_other وحده لا يُفعّل المسار المزدوج', () => {
    const s = { ...legacyComplete, price_other: 10 }
    expect(hasActiveDualLedger(s)).toBe(false)
    expect(resolveTotalCost(s).traderAmount).toBe(3076)
  })

  it('cost_tarseem يُفعّل المسار المزدوج', () => {
    const s = {
      cost_tarseem: 2646,
      cost_turkish_driver: 400,
      cost_clearance_fee: 30,
      price_tarseem: 3106,
      price_syrian_driver: 420,
      price_service_fee: 40,
    }
    expect(hasActiveDualLedger(s)).toBe(true)
    expect(traderShipmentValue(s)).toBe(3566)
    expect(brokerShipmentValue(s)).toBe(3076)
  })

  it('missingRequiredFields يقبل cost_*/price_* بدل legacy', () => {
    const s = {
      status: 'pending',
      cost_tarseem: 100,
      price_syrian_driver: 50,
      cost_clearance_fee: 20,
    }
    expect(missingRequiredFields(s, ['tarseem', 'syrian_driver', 'clearance_fee'])).toEqual([])
    expect(classifyPostability(s).is_postable).toBe(true)
  })

  it('buildLegacySyncPatch يملأ legacy من cost/price', () => {
    const patch = buildLegacySyncPatch({
      cost_tarseem: 500,
      cost_clearance_fee: 50,
      price_syrian_driver: 400,
      price_tarseem: 0,
      tarseem: null,
      clearance_fee: 0,
      syrian_driver: null,
    })
    expect(patch.tarseem).toBe(500)
    expect(patch.clearance_fee).toBe(50)
    expect(patch.syrian_driver).toBe(400)
    expect(patch.total_cost).toBeGreaterThan(0)
  })

  it('syncLegacyFromDual ينسخ الأقلام الإلزامية', () => {
    const synced = syncLegacyFromDual(
      {},
      { cost_tarseem: 200, price_syrian_driver: 40, cost_clearance_fee: 10 }
    )
    expect(synced).toEqual({
      tarseem: 200,
      syrian_driver: 40,
      clearance_fee: 10,
    })
  })
})
