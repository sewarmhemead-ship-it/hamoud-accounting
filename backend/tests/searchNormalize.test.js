const { normalizeSearchQuery, searchTokens } = require('../src/utils/searchNormalize')

describe('searchNormalize', () => {
  it('يزيل مسافات زائدة ومحارف RTL', () => {
    expect(normalizeSearchQuery('  فراس   الشهابي \u200f')).toBe('فراس الشهابي')
  })

  it('يقسّم إلى كلمات', () => {
    expect(searchTokens('فراس الشهابي')).toEqual(['فراس', 'الشهابي'])
    expect(searchTokens('TRK-2600008')).toEqual(['TRK-2600008'])
  })
})
