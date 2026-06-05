import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data = err.response?.data
    let message = data?.message
    if (!message) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        message =
          'تعذّر الاتصال بالخادم. تأكد أن الـ Backend يعمل على http://localhost:3001 ثم أعد المحاولة.'
      } else if (err.response?.status === 403) {
        message = 'ليس لديك صلاحية لهذا الإجراء'
      } else if (err.response?.status) {
        message = `خطأ من الخادم (${err.response.status})`
      } else {
        message = err.message || 'حدث خطأ في الاتصال'
      }
    }
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject({ message, code: data?.code, errors: data?.errors, status: err.response?.status })
  }
)

export default client
