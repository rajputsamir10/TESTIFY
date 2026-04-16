import { Suspense } from 'react'
import ForgotPassword from '../../views/auth/ForgotPassword'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotPassword />
    </Suspense>
  )
}
