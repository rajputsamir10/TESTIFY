import { BarChart3, Building2, LayoutDashboard, Users } from 'lucide-react'
import AppShell from '../components/AppShell'

const links = [
  { to: '/god', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/god/organizations', label: 'Organizations', icon: Building2 },
  { to: '/god/users', label: 'All Users', icon: Users },
  { to: '/god/stats', label: 'Platform Stats', icon: BarChart3 },
]

function GodLayout() {
  return (
    <AppShell
      roleLabel="god"
      accentClass="bg-gradient-to-br from-[#4a40e0] to-[#702ae1]"
      links={links}
    />
  )
}

export default GodLayout
