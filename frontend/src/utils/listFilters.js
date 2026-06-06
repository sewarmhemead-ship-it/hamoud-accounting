import { normalizeSearchQuery } from './searchNormalize'

/**
 * بناء معاملات قائمة السيارات — للوحة التحكم وصفحة السيارات.
 * منطق عرض فقط؛ لا يغيّر حسابات المحاسبة.
 */
export function isListFilterActive({ search = '', status = '', from = '', to = '' } = {}) {
  const q = normalizeSearchQuery(search)
  return !!(status || from || to || q.length > 0)
}

export function buildShipmentsListParams({
  search = '',
  status = '',
  wip = false,
  from = '',
  to = '',
  limit = 25,
  offset = 0,
} = {}) {
  const q = normalizeSearchQuery(search)
  return {
    ...(wip ? { wip: true } : status ? { status } : {}),
    ...(q ? { search: q } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    limit,
    offset,
  }
}
