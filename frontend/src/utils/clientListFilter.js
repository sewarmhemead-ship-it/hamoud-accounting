import { normalizeSearchQuery } from './searchNormalize'

/**
 * فلترة محلية للقوائم (مراكز، حركات، …) عندما لا يوجد بحث API.
 */
export function filterRowsBySearch(rows, search, fieldGetters) {
  const q = normalizeSearchQuery(search)
  if (!q) return rows
  const tokens = q.split(/\s+/).filter(Boolean)
  return rows.filter((row) =>
    tokens.every((token) => {
      const haystack = fieldGetters
        .map((fn) => (typeof fn === 'function' ? fn(row) : row[fn]))
        .filter((v) => v != null && v !== '')
        .join(' ')
        .toLowerCase()
      return haystack.includes(token.toLowerCase())
    })
  )
}
