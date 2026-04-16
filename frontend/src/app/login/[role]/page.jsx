import { redirect } from 'next/navigation'

const ROLE_LOGIN_PATHS = {
  admin: '/admin-login',
  teacher: '/teacher-login',
  student: '/student-login',
  god: '/god-login',
}

export default async function Page({ params }) {
  const resolvedParams = await params
  const role = String(resolvedParams?.role || '').toLowerCase()
  redirect(ROLE_LOGIN_PATHS[role] || '/login-selection')
}