import axios from 'axios'

function alignLocalApiHost(baseUrl) {
  if (typeof window === 'undefined') {
    return baseUrl
  }

  try {
    const apiUrl = new URL(baseUrl, window.location.origin)
    const appHost = window.location.hostname
    const localHosts = new Set(['localhost', '127.0.0.1'])

    if (localHosts.has(appHost) && localHosts.has(apiUrl.hostname) && apiUrl.hostname !== appHost) {
      apiUrl.hostname = appHost
      return apiUrl.toString().replace(/\/$/, '')
    }
  } catch {
    // Keep configured base URL if parsing fails.
  }

  return baseUrl
}

const API_BASE_URL = alignLocalApiHost(process.env.NEXT_PUBLIC_API_BASE_URL || '/api')

const PUBLIC_PATH_PREFIXES = [
  '/login/',
  '/admin-login',
  '/teacher-login',
  '/student-login',
  '/god-login',
  '/login-selection',
  '/forgot-password',
  '/verify-otp',
  '/reset-password',
]

function isPublicPath(pathname = '') {
  if (pathname === '/') {
    return true
  }

  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

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
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const isAuthRequest = requestUrl.includes('/auth/')
    const canRetryAuthRequest =
      requestUrl.includes('/auth/me/') ||
      requestUrl.includes('/auth/logout/') ||
      requestUrl.includes('/auth/change-password/')
    const isSessionCheckRequest = requestUrl.includes('/auth/me/')
    const isPublicRoute = isPublicPath(currentPath)

    // On public routes, a bootstrap /auth/me/ 401 should not trigger refresh.
    if (status === 401 && isSessionCheckRequest && isPublicRoute) {
      return Promise.reject(error)
    }

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
        const shouldRedirect = !isSessionCheckRequest && !isPublicRoute

        if (shouldRedirect) {
          const role = localStorage.getItem('role') || 'admin'
          window.location.href = `/login/${role}`
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export default api
