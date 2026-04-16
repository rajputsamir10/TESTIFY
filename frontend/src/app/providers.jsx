"use client"

import { Suspense } from 'react'
import { ToastContainer } from 'react-toastify'
import RouteTransitionLoader from '../components/RouteTransitionLoader'
import ThemeToggleButton from '../components/ThemeToggleButton'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'

export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <Suspense fallback={null}>
          <RouteTransitionLoader />
        </Suspense>
        <div className="fixed bottom-5 right-5 z-[70]">
          <ThemeToggleButton className="shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)]" />
        </div>
        <ToastContainer position="top-right" autoClose={2500} />
      </AuthProvider>
    </ThemeProvider>
  )
}
