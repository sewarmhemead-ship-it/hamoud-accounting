/** تاريخ + وقت ISO كامل — للحقول التي تحتاج timestamp */
function nowISO() {
  return new Date().toISOString()
}

/** تاريخ فقط YYYY-MM-DD — للحقول التي تخزّن يوم بدون وقت */
function todayDB() {
  return new Date().toISOString().split('T')[0]
}

module.exports = { nowISO, todayDB }
