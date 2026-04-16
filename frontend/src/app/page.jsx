"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'

const ROLE_HOME_MAP = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  god: '/god',
}

export default function Page() {
  const { loading, isAuthenticated, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      return
    }

    if (isAuthenticated) {
      router.replace(ROLE_HOME_MAP[user?.role] || '/login-selection')
      return
    }

    router.replace('/login-selection')
  }, [loading, isAuthenticated, router, user?.role])

  return <LoadingSpinner fullscreen text="Preparing workspace" />
}
