import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

function ProtectedRoute({ role, children }) {
  const { user, loading, isAuthenticated } = useAuth()
  const fallbackRole = role || localStorage.getItem('role') || 'admin'

  if (loading) {
    return <LoadingSpinner fullscreen text="Checking session" />
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login/${fallbackRole}`} replace />
  }

  if (user?.role !== role) {
    return <Navigate to={`/login/${user?.role || 'admin'}`} replace />
  }

  return children
}

export default ProtectedRoute
