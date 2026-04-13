import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import { Loader2 } from 'lucide-react'
import AuthFrame from '../../components/AuthFrame'
import { authAPI } from '../../api/authAPI'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function GodLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values) => {
    try {
      const { data } = await authAPI.godLogin(values)
      login(data.user || data.access, data.refresh)
      toast.success('God mode enabled')
      navigate('/god')
    } catch (error) {
      const message = error?.response?.status === 403 ? 'Access denied. Not a god user.' : getErrorMessage(error, 'God login failed')
      toast.error(message)
    }
  }

  return (
    <AuthFrame title="God Login" subtitle="Platform super-admin access" tone="god">
      <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span>
          <input type="email" className="auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" {...form.register('email')} />
          {form.formState.errors.email && (
            <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.email.message}</span>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</span>
          <input type="password" className="auth-input w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" {...form.register('password')} />
          {form.formState.errors.password && (
            <span className="mt-1 block text-xs text-rose-600">{form.formState.errors.password.message}</span>
          )}
        </label>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Entering god mode...
            </>
          ) : (
            'Enter god mode'
          )}
        </button>
      </form>
    </AuthFrame>
  )
}

export default GodLogin
