"use client"

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

function ProtectedRoute({ role, roles, children }) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const allowedRoles = useMemo(() => {
    if (Array.isArray(roles) && roles.length) {
      return roles
    }
    return role ? [role] : null
  }, [role, roles])
  const fallbackRole = (allowedRoles && allowedRoles[0]) || (typeof window !== 'undefined' ? window.localStorage.getItem('role') : null) || 'admin'

  useEffect(() => {
    if (loading) {
      return
    }

    if (!isAuthenticated) {
      router.replace(`/login/${fallbackRole}`)
      return
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
      router.replace(`/login/${user?.role || 'admin'}`)
    }
  }, [allowedRoles, fallbackRole, isAuthenticated, loading, router, user?.role])

  if (loading) {
    return <LoadingSpinner fullscreen text="Checking session" />
  }

  if (!isAuthenticated) {
    return <LoadingSpinner fullscreen text="Redirecting" />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <LoadingSpinner fullscreen text="Redirecting" />
  }

  return children
}

export default ProtectedRoute
