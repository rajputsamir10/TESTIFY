import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import AuthFrame from '../../components/AuthFrame'
import { authAPI } from '../../api/authAPI'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  identifier: z.string().min(2),
})

function ForgotPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const roleHint = searchParams.get('role')
  const subtitle =
    roleHint === 'teacher'
      ? 'Step 1 of 3: enter email or teacher ID'
      : roleHint === 'student'
        ? 'Step 1 of 3: enter email or roll number'
        : 'Step 1 of 3: enter email, teacher ID, or roll number'

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '' },
  })

  const onSubmit = async (values) => {
    try {
      const payload = {
        identifier: values.identifier,
        ...(roleHint ? { role: roleHint } : {}),
      }
      const { data } = await authAPI.forgotPassword(payload)
      const resolvedEmail = data?.email || values.identifier
      localStorage.setItem('reset_email', resolvedEmail)
      if (roleHint) {
        localStorage.setItem('reset_role', roleHint)
      } else {
        localStorage.removeItem('reset_role')
      }
      toast.success('OTP sent to email')
      navigate('/verify-otp')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to send OTP'))
    }
  }

  return (
    <AuthFrame title="Forgot Password" subtitle={subtitle} tone="marine">
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email / Teacher ID / Roll Number</span>
          <input className="auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" {...form.register('identifier')} />
          {form.formState.errors.identifier && (
            <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.identifier.message}</span>
          )}
        </label>

        <button type="submit" className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white">
          Send OTP
        </button>
      </form>
    </AuthFrame>
  )
}

export default ForgotPassword
