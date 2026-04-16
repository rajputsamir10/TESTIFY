import AdminLayout from '../../layouts/AdminLayout'
import ProtectedRoute from '../../routes/ProtectedRoute'

export default function Layout({ children }) {
  return (
    <ProtectedRoute role="admin">
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  )
}
