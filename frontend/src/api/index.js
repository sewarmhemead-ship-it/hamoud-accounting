import client from './client'

export const authApi = {
  login: (username, password) =>
    client.post('/auth/login', { username, password }),
  me: () => client.get('/auth/me'),
  branding: () => client.get('/auth/branding'),
}

export const centersApi = {
  list: (params) => client.get('/centers', { params }),
  get: (id) => client.get(`/centers/${id}`),
  create: (data) => client.post('/centers', data),
  update: (id, data) => client.put(`/centers/${id}`, data),
  balance: (id) => client.get(`/centers/${id}/balance`),
  statement: (id, params) => client.get(`/centers/${id}/statement`, { params }),
  clearanceStatement: (id) => client.get(`/centers/${id}/clearance-statement`),
  dualStatement: (id) => client.get(`/centers/${id}/dual-statement`),
  postReady: (id) => client.post(`/centers/${id}/post-ready`),
  traderReport: (id, params) => client.get(`/centers/${id}/reports/trader`, { params }),
  profitReport: (id, params) => client.get(`/centers/${id}/reports/profit`, { params }),
  reportBlob: (id, file, params) =>
    client.get(`/centers/${id}/reports/${file}`, { params, responseType: 'blob' }),
  tradersReportZip: (params) =>
    client.get('/centers/reports/traders.zip', { params, responseType: 'blob' }),
}

export const shipmentsApi = {
  list: (params) => client.get('/shipments', { params }),
  summary: () => client.get('/shipments/summary'),
  get: (id) => client.get(`/shipments/${id}`),
  create: (data) => client.post('/shipments', data),
  updateFields: (id, data) => client.patch(`/shipments/${id}/fields`, data),
  progress: (id) => client.get(`/shipments/${id}/progress`),
  post: (id) => client.post(`/shipments/${id}/post`),
  deliver: (id) => client.patch(`/shipments/${id}/deliver`),
  ready: (params) => client.get('/shipments/ready', { params }),
  bulkPost: (shipment_ids) => client.post('/shipments/bulk-post', { shipment_ids }),
  remove: (id) => client.delete(`/shipments/${id}`),
}

export const transactionsApi = {
  list: (params) => client.get('/transactions', { params }),
  get: (id) => client.get(`/transactions/${id}`),
  createPayment: (data) => client.post('/transactions/payment', data),
  offset: (data) => client.post('/transactions/offset', data),
  delete: (id) => client.delete(`/transactions/${id}`),
}

export const calculationsApi = {
  customsFee: (data) => client.post('/calculations/customs-fee', data),
  shipmentTotal: (data) => client.post('/calculations/shipment-total', data),
}

export const reportsApi = {
  lookups:       ()       => client.get('/reports/lookups'),
  dailySummary:  (date)   => client.get(`/reports/daily/${date}`),
  dailyProfitBlob: (date, fmt) =>
    client.get(`/reports/daily/${date}/${fmt}`, { responseType: 'blob' }),
  whatsapp:      (id)     => client.get(`/reports/whatsapp/${id}`),
  dashboard:     ()       => client.get('/reports/dashboard'),
  notifications: ()       => client.get('/reports/notifications'),
  period:        (params) => client.get('/reports/period', { params }),
  periodBlob:    (fmt, params) =>
    client.get(`/reports/period.${fmt}`, { params, responseType: 'blob' }),
  inventoryBlob: (date, fmt) =>
    client.get(`/reports/inventory/${date}.${fmt}`, { responseType: 'blob' }),
  inventoryRangeBlob: (fmt, params) =>
    client.get(`/reports/inventory-range.${fmt}`, { params, responseType: 'blob' }),
}

export const profitApi = {
  preview: (date) => client.get(`/profit/preview/${date}`),
  detail: (date) => client.get(`/profit/detail/${date}`),
  close: (data) => client.post('/profit/close', data),
  update: (date, data) => client.put(`/profit/${date}`, data),
  get: (date) => client.get(`/profit/${date}`),
  monthly: (year, month) => client.get(`/profit/monthly/${year}/${month}`),
  dayBlob: (date, fmt) =>
    client.get(`/profit/export/day/${date}/${fmt}`, { responseType: 'blob' }),
  monthBlob: (year, month, fmt = 'xlsx') =>
    fmt === 'pdf'
      ? client.get(`/profit/export/month/${year}/${month}/pdf`, { responseType: 'blob' })
      : client.get(`/profit/export/month/${year}/${month}.xlsx`, { responseType: 'blob' }),
}

export const inventoryApi = {
  live: () => client.get('/inventory/live'),
  dates: () => client.get('/inventory/dates'),
  latest: () => client.get('/inventory/latest'),
  getByDate: (date) => client.get(`/inventory/snapshots/${date}`),
  compare: (date) => client.get(`/inventory/snapshots/${date}/compare`),
  createSnapshot: (data) => client.post('/inventory/snapshots', data),
  exportBlob: (date, fmt, { live = false } = {}) =>
    live
      ? client.get(`/inventory/export/live/${fmt}`, { params: { date }, responseType: 'blob' })
      : client.get(`/inventory/export/${date}/${fmt}`, { responseType: 'blob' }),
  range: (params) => client.get('/inventory/range', { params }),
  rangeBlob: (fmt, params) =>
    client.get(`/inventory/export/range.${fmt}`, { params, responseType: 'blob' }),
}

export const usersApi = {
  list:   ()      => client.get('/users'),
  create: (data)  => client.post('/users', data),
  update: (id, d) => client.put(`/users/${id}`, d),
  remove: (id)    => client.delete(`/users/${id}`),
  applyPermissionsTemplate: (body) =>
    client.post('/users/apply-permissions-template', body),
}

export const profileApi = {
  me: () => client.get('/profile/me'),
  get: (userId) => client.get(`/profile/${userId}`),
  updateMe: (data) => client.put('/profile/me', data),
  uploadAvatar: (image) => client.post('/profile/avatar', { image }),
  directory: () => client.get('/profile/directory'),
}

export const chatApi = {
  listThreads: () => client.get('/chat/threads'),
  getMessages: (threadId, params) => client.get(`/chat/threads/${threadId}/messages`, { params }),
  startDirect: (user_id) => client.post('/chat/threads/direct', { user_id }),
  sendMessage: (threadId, body) => client.post(`/chat/threads/${threadId}/messages`, body),
}

export const presenceApi = {
  heartbeat: () => client.post('/presence/heartbeat'),
  listOnline: () => client.get('/presence/online'),
}

export const assistantApi = {
  hints: () => client.get('/assistant/hints'),
  ask: (question) => client.post('/assistant/ask', { question }),
}

export const adminApi = {
  getSettings:    ()        => client.get('/admin/settings'),
  updateSettings: (data)    => client.put('/admin/settings', data),
  stats:          ()        => client.get('/admin/stats'),
  permConfig:     ()        => client.get('/admin/perm-config'),
  listBorders:    ()        => client.get('/admin/borders'),
  createBorder:   (data)    => client.post('/admin/borders', data),
  updateBorder:   (id, d)   => client.put(`/admin/borders/${id}`, d),
  listGoodsTypes: ()        => client.get('/admin/goods-types'),
  createGoodsType:(data)    => client.post('/admin/goods-types', data),
  updateGoodsType:(id, d)   => client.put(`/admin/goods-types/${id}`, d),
  auditLog:       (params)  => client.get('/admin/audit-log', { params }),
  getBackupStatus: ()       => client.get('/admin/backup/status'),
  runBackup:       ()       => client.post('/admin/backup/run'),
  downloadBackup:  ()       => client.get('/admin/backup/download', { responseType: 'blob' }),
  downloadBackupUrl: () => {
    const base = import.meta.env.VITE_API_BASE || '/api'
    return `${base.replace(/\/$/, '')}/admin/backup/download`
  },
}
