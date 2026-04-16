import GodLayout from '../../layouts/GodLayout'
import ProtectedRoute from '../../routes/ProtectedRoute'

export default function Layout({ children }) {
  return (
    <ProtectedRoute role="god">
      <GodLayout>{children}</GodLayout>
    </ProtectedRoute>
  )
}
