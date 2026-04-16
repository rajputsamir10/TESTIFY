"use client"

import { BarChart3, Building2, LayoutDashboard, Settings, ShieldAlert, Users } from 'lucide-react'
import AppShell from '../components/AppShell'

const links = [
  { to: '/god', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/god-mode', label: 'God Mode', icon: ShieldAlert },
  { to: '/god/organizations', label: 'Organizations', icon: Building2 },
  { to: '/god/users', label: 'All Users', icon: Users },
  { to: '/god/stats', label: 'Platform Stats', icon: BarChart3 },
]

const footerLinks = [
  { to: '/god/stats', label: 'Settings', icon: Settings },
]

function GodLayout({ children }) {
  return (
    <AppShell
      roleLabel="god"
      accentClass="bg-gradient-to-br from-[#4a40e0] to-[#702ae1]"
      links={links}
      sidebarFooterLinks={footerLinks}
      showSidebarLogout
      showHeaderLogout={false}
    >
      {children}
    </AppShell>
  )
}

export default GodLayout
