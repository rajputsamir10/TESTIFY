import { Building, LayoutDashboard, LibraryBig, Users2 } from 'lucide-react'
import AppShell from '../components/AppShell'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users2 },
  { to: '/admin/departments', label: 'Departments', icon: LibraryBig },
  { to: '/admin/courses', label: 'Courses', icon: LibraryBig },
  { to: '/admin/organization', label: 'Organization', icon: Building },
]

function AdminLayout() {
  return (
    <AppShell
      roleLabel="admin"
      accentClass="bg-gradient-to-br from-[#4a40e0] to-[#702ae1]"
      links={links}
    />
  )
}

export default AdminLayout
