import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import AuthFrame from '../../components/AuthFrame'
import { authAPI } from '../../api/authAPI'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
})

function VerifyOTP() {
  const navigate = useNavigate()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: localStorage.getItem('reset_email') || '',
      otp: '',
      role: localStorage.getItem('reset_role') || '',
    },
  })

  const onSubmit = async (values) => {
    try {
      const resetRole = localStorage.getItem('reset_role') || ''
      const payload = {
        email: values.email,
        otp: values.otp,
        ...(resetRole ? { role: resetRole } : {}),
      }
      await authAPI.verifyOtp(payload)
      localStorage.setItem('reset_email', values.email)
      localStorage.setItem('reset_otp', values.otp)
      toast.success('OTP verified')
      navigate('/reset-password')
    } catch (error) {
      toast.error(getErrorMessage(error, 'OTP verification failed'))
    }
  }

  return (
    <AuthFrame title="Verify OTP" subtitle="Step 2 of 3: enter your 6-digit OTP" tone="marine">
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
          <input type="email" className="auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" {...form.register('email')} />
          {form.formState.errors.email && (
            <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.email.message}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">OTP</span>
          <input className="auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tracking-[0.35em]" {...form.register('otp')} />
          {form.formState.errors.otp && (
            <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.otp.message}</span>
          )}
        </label>

        <button type="submit" className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white">
          Verify OTP
        </button>
      </form>
    </AuthFrame>
  )
}

export default VerifyOTP
