import ProtectedRoute from '../../routes/ProtectedRoute'
import StudentLayout from '../../layouts/StudentLayout'

export default function Layout({ children }) {
  return (
    <ProtectedRoute role="student">
      <StudentLayout>{children}</StudentLayout>
    </ProtectedRoute>
  )
}
