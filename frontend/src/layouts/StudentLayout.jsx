"use client"

import { BarChart2, BookOpenCheck, LayoutDashboard, Puzzle, Settings, UserCircle2 } from 'lucide-react'
import AppShell from '../components/AppShell'

const links = [
  { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/student/exams', label: 'Available Exams', icon: BookOpenCheck },
  { to: '/student/playground', label: 'Playground', icon: Puzzle },
  { to: '/student/results', label: 'Results', icon: BarChart2 },
  { to: '/student/profile', label: 'Profile', icon: UserCircle2 },
]

const footerLinks = [
  { to: '/student/profile', label: 'Settings', icon: Settings },
]

function StudentLayout({ children }) {
  return (
    <AppShell
      roleLabel="student"
      accentClass="bg-gradient-to-br from-[#4a40e0] to-[#702ae1]"
      brandSubtitle="Digital Curator"
      searchPlaceholder="Search exams, results, or modules..."
      links={links}
      sidebarFooterLinks={footerLinks}
      showSidebarLogout
      showHeaderLogout={false}
    >
      {children}
    </AppShell>
  )
}

export default StudentLayout
