import { ClipboardCheck, FilePlus2, LayoutDashboard, Puzzle, Settings, UserCircle2 } from 'lucide-react'
import AppShell from '../components/AppShell'

const links = [
  { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/teacher/create-exam', label: 'Create Exam', icon: FilePlus2 },
  { to: '/teacher/evaluate', label: 'Evaluate', icon: ClipboardCheck },
  { to: '/teacher/exams', label: 'Manage Qs', icon: Puzzle },
  { to: '/teacher/profile', label: 'Profile', icon: UserCircle2 },
]

const footerLinks = [
  { to: '/teacher/profile', label: 'Settings', icon: Settings },
]

function TeacherLayout() {
  return (
    <AppShell
      roleLabel="teacher"
      accentClass="bg-gradient-to-br from-[#4a40e0] to-[#702ae1]"
      links={links}
      sidebarFooterLinks={footerLinks}
      showSidebarLogout
      showHeaderLogout={false}
    />
  )
}

export default TeacherLayout
