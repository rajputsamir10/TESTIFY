/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authAPI } from '../api/authAPI'

const AuthContext = createContext(null)

function normalizeUser(payload) {
  if (!payload) {
    return null
  }

  return {
    id: payload.id ?? payload.user_id ?? null,
    full_name: payload.full_name ?? '',
    role: payload.role ?? null,
    organization_id: payload.organization_id ?? payload.organization ?? null,
    organization_name: payload.organization_name ?? '',
    department_id: payload.department_id ?? payload.department ?? null,
    department_name: payload.department_name ?? '',
    course_id: payload.course_id ?? payload.course ?? null,
    course_name: payload.course_name ?? '',
    plan: payload.plan ?? null,
    email: payload.email ?? '',
  }
}

function parseUserFromToken(token) {
  try {
    const decoded = jwtDecode(token)
    const expMs = decoded.exp ? decoded.exp * 1000 : 0

    if (expMs && Date.now() > expMs) {
      return null
    }

    return normalizeUser(decoded)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const bootstrapSession = async () => {
      try {
        const { data } = await authAPI.me()
        if (!active) {
          return
        }

        const normalized = normalizeUser(data)
        setUser(normalized)
        if (normalized?.role) {
          localStorage.setItem('role', normalized.role)
        }
      } catch {
        if (active) {
          setUser(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    bootstrapSession()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback((accessTokenOrUser, _refreshToken, userPayload) => {
    let resolvedUser = null

    if (accessTokenOrUser && typeof accessTokenOrUser === 'object') {
      resolvedUser = normalizeUser(accessTokenOrUser)
    } else if (userPayload && typeof userPayload === 'object') {
      resolvedUser = normalizeUser(userPayload)
    } else if (typeof accessTokenOrUser === 'string') {
      resolvedUser = parseUserFromToken(accessTokenOrUser)
    }

    if (resolvedUser) {
      setUser(resolvedUser)
      if (resolvedUser.role) {
        localStorage.setItem('role', resolvedUser.role)
      }
      return
    }

    authAPI
      .me()
      .then(({ data }) => {
        const normalized = normalizeUser(data)
        setUser(normalized)
        if (normalized?.role) {
          localStorage.setItem('role', normalized.role)
        }
      })
      .catch(() => {
        setUser(null)
      })
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch {
      // Ignore logout API errors and clear local state regardless.
    }

    const role = user?.role || localStorage.getItem('role') || 'admin'
    localStorage.removeItem('role')
    setUser(null)
    window.location.href = `/login/${role}`
  }, [user])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      setUser,
    }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
