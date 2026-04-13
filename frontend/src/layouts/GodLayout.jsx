import { BarChart3, Building2, LayoutDashboard, Settings, Users } from 'lucide-react'
import AppShell from '../components/AppShell'

const links = [
  { to: '/god', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/god/organizations', label: 'Organizations', icon: Building2 },
  { to: '/god/users', label: 'All Users', icon: Users },
  { to: '/god/stats', label: 'Platform Stats', icon: BarChart3 },
]

const footerLinks = [
  { to: '/god/stats', label: 'Settings', icon: Settings },
]

function GodLayout() {
  return (
    <AppShell
      roleLabel="god"
      accentClass="bg-gradient-to-br from-[#4a40e0] to-[#702ae1]"
      links={links}
      sidebarFooterLinks={footerLinks}
      showSidebarLogout
      showHeaderLogout={false}
    />
  )
}

export default GodLayout
