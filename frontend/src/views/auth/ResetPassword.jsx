"use client"

import { useRouter } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import AuthFrame from '../../components/AuthFrame'
import PasswordInput from '../../components/PasswordInput'
import PasswordStrengthChecklist from '../../components/PasswordStrengthChecklist'
import { authAPI } from '../../api/authAPI'
import { getErrorMessage } from '../../utils/errors'
import { isPasswordStrong } from '../../utils/passwordRules'

const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (value) => isPasswordStrong(value),
    'Password must include uppercase, lowercase, number, and special character',
  )

const schema = z
  .object({
    email: z.string().email(),
    otp: z.string().length(6),
    new_password: strongPasswordSchema,
    confirm_password: z.string().min(8),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

function ResetPassword() {
  const router = useRouter()
  const storedEmail = typeof window !== 'undefined' ? window.localStorage.getItem('reset_email') || '' : ''
  const storedOtp = typeof window !== 'undefined' ? window.localStorage.getItem('reset_otp') || '' : ''
  const storedRole = typeof window !== 'undefined' ? window.localStorage.getItem('reset_role') || '' : ''
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: storedEmail,
      otp: storedOtp,
      role: storedRole,
      new_password: '',
      confirm_password: '',
    },
  })

  const newPassword = useWatch({ control: form.control, name: 'new_password' }) || ''
  const confirmPassword = useWatch({ control: form.control, name: 'confirm_password' }) || ''
  const disableSubmit =
    !isPasswordStrong(newPassword) ||
    !newPassword ||
    !confirmPassword ||
    newPassword !== confirmPassword

  const onSubmit = async (values) => {
    try {
      const resetRole = localStorage.getItem('reset_role') || ''
      await authAPI.resetPassword({
        email: values.email,
        otp: values.otp,
        new_password: values.new_password,
        ...(resetRole ? { role: resetRole } : {}),
      })
      localStorage.removeItem('reset_email')
      localStorage.removeItem('reset_otp')
      localStorage.removeItem('reset_role')
      toast.success('Password reset successful')
      router.push('/login/admin')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Password reset failed'))
    }
  }

  return (
    <AuthFrame title="Reset Password" subtitle="Step 3 of 3: set your new password" tone="marine">
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

        <PasswordInput
          label="New password"
          register={form.register}
          name="new_password"
          error={form.formState.errors.new_password}
          inputClassName="auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm"
        />

        <PasswordStrengthChecklist password={newPassword} />

        <PasswordInput
          label="Confirm password"
          register={form.register}
          name="confirm_password"
          error={form.formState.errors.confirm_password}
          inputClassName="auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm"
        />

        <button
          type="submit"
          disabled={disableSubmit}
          className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          Reset password
        </button>
      </form>
    </AuthFrame>
  )
}

export default ResetPassword
