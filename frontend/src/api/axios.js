import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error?.response?.status
    const requestUrl = String(originalRequest?.url || '')
    const isAuthRequest = requestUrl.includes('/auth/')
    const canRetryAuthRequest =
      requestUrl.includes('/auth/me/') ||
      requestUrl.includes('/auth/logout/') ||
      requestUrl.includes('/auth/change-password/')

    if (
      status === 401 &&
      !originalRequest?._retry &&
      !requestUrl.includes('/auth/token/refresh/') &&
      (!isAuthRequest || canRetryAuthRequest)
    ) {
      originalRequest._retry = true
      try {
        await api.post('/auth/token/refresh/')
        return api(originalRequest)
      } catch (refreshError) {
        const role = localStorage.getItem('role') || 'admin'
        window.location.href = `/login/${role}`
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api
