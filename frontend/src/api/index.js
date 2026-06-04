import client from './client'

export const authApi = {
  login: (username, password) =>
    client.post('/auth/login', { username, password }),
  me: () => client.get('/auth/me'),
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
  get: (id) => client.get(`/shipments/${id}`),
  create: (data) => client.post('/shipments', data),
  updateFields: (id, data) => client.patch(`/shipments/${id}/fields`, data),
  progress: (id) => client.get(`/shipments/${id}/progress`),
  post: (id) => client.post(`/shipments/${id}/post`),
  deliver: (id) => client.patch(`/shipments/${id}/deliver`),
  ready: (params) => client.get('/shipments/ready', { params }),
  bulkPost: (shipment_ids) => client.post('/shipments/bulk-post', { shipment_ids }),
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
  lookups: () => client.get('/reports/lookups'),
  dailySummary: (date) => client.get(`/reports/daily/${date}`),
  whatsapp: (centerId) => client.get(`/reports/whatsapp/${centerId}`),
}

export const profitApi = {
  preview: (date) => client.get(`/profit/preview/${date}`),
  close: (data) => client.post('/profit/close', data),
  get: (date) => client.get(`/profit/${date}`),
  monthly: (year, month) => client.get(`/profit/monthly/${year}/${month}`),
}

export const juiceApi = {
  list: (params) => client.get('/juice', { params }),
  create: (data) => client.post('/juice', data),
  preview: (data) => client.post('/juice/preview', data),
}

export const inventoryApi = {
  createSnapshot: (data) => client.post('/inventory/snapshots', data),
  getByDate: (date) => client.get(`/inventory/snapshots/${date}`),
}
