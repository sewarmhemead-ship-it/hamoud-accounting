/**
 * يبني رابط وسائط (صورة ملف شخصي / مرفقات محادثة) دون تكرار /api.
 */
export function resolveMediaUrl(pathOrUrl) {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }

  const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

  if (pathOrUrl.startsWith('/api/')) {
    if (apiBase.startsWith('http')) {
      const origin = new URL(apiBase).origin
      return `${origin}${pathOrUrl}`
    }
    return pathOrUrl
  }

  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${apiBase}${path}`
}
