import ProtectedRoute from '../../routes/ProtectedRoute'
import TeacherLayout from '../../layouts/TeacherLayout'

export default function Layout({ children }) {
  return (
    <ProtectedRoute role="teacher">
      <TeacherLayout>{children}</TeacherLayout>
    </ProtectedRoute>
  )
}
