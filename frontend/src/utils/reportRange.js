/** افتراضيات وتحقق فترة التقارير (عرض فقط) */
export function defaultReportRange() {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  const iso = (d) => d.toISOString().slice(0, 10)
  return { from: iso(from), to: iso(to) }
}

export function isValidReportRange(from, to) {
  if (!from || !to) return false
  return from <= to
}

export function buildRangeParams(from, to) {
  return { from, to }
}
