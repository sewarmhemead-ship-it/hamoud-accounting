import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
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
    const message = data?.message || 'حدث خطأ في الاتصال'
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject({ message, code: data?.code, errors: data?.errors })
  }
)

export default client
