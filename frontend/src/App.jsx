import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import Landing from './pages/Landing.jsx'
import LoginSelection from './pages/LoginSelection.jsx'
import AdminAuth from './pages/auth/AdminAuth.jsx'
import TeacherLogin from './pages/auth/TeacherLogin.jsx'
import StudentLogin from './pages/auth/StudentLogin.jsx'
import GodLogin from './pages/auth/GodLogin.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import VerifyOTP from './pages/auth/VerifyOTP.jsx'
import ResetPassword from './pages/auth/ResetPassword.jsx'
import GodLayout from './layouts/GodLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import TeacherLayout from './layouts/TeacherLayout.jsx'
import StudentLayout from './layouts/StudentLayout.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import GodDashboard from './pages/god/GodDashboard.jsx'
import ManageOrganizations from './pages/god/ManageOrganizations.jsx'
import ManageAllUsers from './pages/god/ManageAllUsers.jsx'
import PlatformStats from './pages/god/PlatformStats.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import ManageUsers from './pages/admin/ManageUsers.jsx'
import ManageDepartments from './pages/admin/ManageDepartments.jsx'
import ManageCourses from './pages/admin/ManageCourses.jsx'
import OrganizationSettings from './pages/admin/OrganizationSettings.jsx'
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx'
import CreateExam from './pages/teacher/CreateExam.jsx'
import ManageQuestions from './pages/teacher/ManageQuestions.jsx'
import EvaluateAnswers from './pages/teacher/EvaluateAnswers.jsx'
import TeacherProfile from './pages/teacher/TeacherProfile.jsx'
import StudentDashboard from './pages/student/StudentDashboard.jsx'
import AvailableExams from './pages/student/AvailableExams.jsx'
import ExamInstructions from './pages/student/ExamInstructions.jsx'
import ExamDisclaimer from './pages/student/ExamDisclaimer.jsx'
import ExamInterface from './pages/student/ExamInterface.jsx'
import Results from './pages/student/Results.jsx'
import Profile from './pages/student/Profile.jsx'
import ThemeToggleButton from './components/ThemeToggleButton.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import { useAuth } from './context/AuthContext.jsx'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullscreen text="Loading Testify" />
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login-selection" element={<LoginSelection />} />

        <Route path="/admin-login" element={<AdminAuth />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/god-login" element={<GodLogin />} />

        <Route path="/login/admin" element={<Navigate to="/admin-login" replace />} />
        <Route path="/login/teacher" element={<Navigate to="/teacher-login" replace />} />
        <Route path="/login/student" element={<Navigate to="/student-login" replace />} />
        <Route path="/login/god" element={<Navigate to="/god-login" replace />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/god"
          element={(
            <ProtectedRoute role="god">
              <GodLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<GodDashboard />} />
          <Route path="organizations" element={<ManageOrganizations />} />
          <Route path="users" element={<ManageAllUsers />} />
          <Route path="stats" element={<PlatformStats />} />
        </Route>

        <Route
          path="/admin"
          element={(
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="departments" element={<ManageDepartments />} />
          <Route path="courses" element={<ManageCourses />} />
          <Route path="organization" element={<OrganizationSettings />} />
        </Route>

        <Route
          path="/teacher"
          element={(
            <ProtectedRoute role="teacher">
              <TeacherLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="create-exam" element={<CreateExam />} />
          <Route path="exams" element={<ManageQuestions />} />
          <Route path="exams/:id/questions" element={<ManageQuestions />} />
          <Route path="evaluate" element={<EvaluateAnswers />} />
          <Route path="profile" element={<TeacherProfile />} />
        </Route>

        <Route
          path="/student"
          element={(
            <ProtectedRoute role="student">
              <StudentLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<StudentDashboard />} />
          <Route path="exams" element={<AvailableExams />} />
          <Route path="exams/:id/instructions" element={<ExamInstructions />} />
          <Route path="exams/:id/disclaimer" element={<ExamDisclaimer />} />
          <Route path="exams/:id/attempt" element={<ExamInterface />} />
          <Route path="results" element={<Results />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <div className="fixed bottom-5 right-5 z-[70]">
        <ThemeToggleButton className="shadow-[0_16px_30px_-18px_rgba(15,23,42,0.85)]" />
      </div>

      <ToastContainer position="top-right" autoClose={2500} />
    </>
  )
}

export default App
