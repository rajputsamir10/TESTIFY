import { Building, LayoutDashboard, LibraryBig, Settings, Users2 } from 'lucide-react'
import AppShell from '../components/AppShell'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users2 },
  { to: '/admin/departments', label: 'Departments', icon: LibraryBig },
  { to: '/admin/courses', label: 'Courses', icon: LibraryBig },
  { to: '/admin/organization', label: 'Organization', icon: Building },
]

const footerLinks = [
  { to: '/admin/organization', label: 'Settings', icon: Settings },
]

function AdminLayout() {
  return (
    <AppShell
      roleLabel="admin"
      accentClass="bg-gradient-to-br from-[#4a40e0] to-[#702ae1]"
      links={links}
      sidebarFooterLinks={footerLinks}
      showSidebarLogout
      showHeaderLogout={false}
    />
  )
}

export default AdminLayout
