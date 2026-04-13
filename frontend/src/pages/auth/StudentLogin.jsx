import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import {
  ArrowRight,
  Badge,
  Bolt,
  GraduationCap,
  Headset,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { authAPI } from '../../api/authAPI'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  roll_number: z.string().min(1),
  password: z.string().min(1),
})

function StudentLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { roll_number: '', password: '' },
  })

  const onSubmit = async (values) => {
    try {
      const { data } = await authAPI.studentLogin(values)
      login(data.user || data.access, data.refresh)
      toast.success('Student login successful')
      navigate('/student')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Student login failed'))
    }
  }

  return (
    <div className="auth-page min-h-screen bg-[#f4f6ff] font-body text-[#242f41]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="relative flex items-center justify-center overflow-hidden bg-[#4a40e0] p-8 text-white lg:w-1/2 lg:p-16">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-indigo-600/50 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-indigo-900/50 blur-3xl" />

          <div className="relative z-10 w-full max-w-xl">
            <div className="mb-16 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg">
                <GraduationCap className="h-7 w-7 text-[#4a40e0]" />
              </div>
              <span className="font-headline text-3xl font-extrabold tracking-tight">Testify</span>
            </div>

            <div className="space-y-6">
              <h2 className="font-headline text-4xl font-extrabold leading-tight lg:text-6xl">
                Welcome back,
                <br />
                <span className="text-indigo-200">Student</span>
              </h2>
              <p className="max-w-md text-lg font-medium text-indigo-100 opacity-90 lg:text-xl">
                Your portal to academic excellence. Access your assessments and track your progress in real-time.
              </p>
            </div>

            <div className="mt-16 grid gap-6">
              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Secure Testing</h4>
                  <p className="text-sm text-indigo-200">Proctored and encrypted environment</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <Bolt className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Instant Results</h4>
                  <p className="text-sm text-indigo-200">Immediate feedback after submission</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <Headset className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">24/7 Support</h4>
                  <p className="text-sm text-indigo-200">Dedicated help desk for technical assistance</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main className="auth-panel flex flex-col items-center justify-center bg-[#f4f6ff] p-8 lg:w-1/2 lg:p-16">
          <div className="mb-8 flex w-full justify-end lg:hidden">
            <span className="font-headline text-xl font-extrabold text-[#4a40e0]">Testify</span>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-10">
              <h1 className="font-headline mb-2 text-3xl font-extrabold tracking-tight text-[#242f41]">Student Login</h1>
              <p className="font-medium text-[#515c70]">Please enter your credentials to continue.</p>
            </div>

            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <label className="block px-1 text-xs font-bold uppercase tracking-widest text-[#515c70]">
                  Roll Number
                </label>
                <div className="group relative">
                  <Badge className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a2adc4] transition-colors group-focus-within:text-[#4a40e0]" />
                  <input
                    className="auth-input w-full rounded-xl border-none bg-[#ecf1ff] py-4 pl-12 pr-4 text-sm text-[#242f41] placeholder:text-[#a2adc4] transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                    placeholder="e.g. 2024-ST-001"
                    {...form.register('roll_number')}
                  />
                </div>
                {form.formState.errors.roll_number && (
                  <span className="block px-1 text-xs text-rose-600">{form.formState.errors.roll_number.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="block px-1 text-xs font-bold uppercase tracking-widest text-[#515c70]">
                  Password
                </label>
                <div className="group relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a2adc4] transition-colors group-focus-within:text-[#4a40e0]" />
                  <input
                    type="password"
                    className="auth-input w-full rounded-xl border-none bg-[#ecf1ff] py-4 pl-12 pr-4 text-sm text-[#242f41] placeholder:text-[#a2adc4] transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                    placeholder="••••••••"
                    {...form.register('password')}
                  />
                </div>
                {form.formState.errors.password && (
                  <span className="block px-1 text-xs text-rose-600">{form.formState.errors.password.message}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4a40e0] py-4 font-bold text-[#f4f1ff] shadow-lg shadow-[#4a40e0]/20 transition-all hover:bg-[#3d30d4] hover:shadow-[#4a40e0]/40 active:scale-[0.98]"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login to Student Portal
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <Link to="/forgot-password?role=student" className="text-sm font-semibold text-[#4a40e0] transition-colors hover:text-[#3d30d4]">
                Forgot Password?
              </Link>

              <button type="button" className="text-sm font-semibold text-[#6c778c] transition-colors hover:text-[#242f41]">
                Need Help?
              </button>
            </div>

            <div className="auth-support-card mt-12 flex items-center gap-4 rounded-xl border border-[#a2adc4]/20 bg-[#ecf1ff] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4a40e0]/10">
                <ShieldCheck className="h-5 w-5 text-[#4a40e0]" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#242f41]">Secure Connection</h3>
                <p className="mt-0.5 text-[11px] text-[#515c70]">Your assessment session is encrypted and monitored.</p>
              </div>
            </div>
          </div>

          <div className="mt-auto w-full max-w-md pt-16">
            <div className="flex flex-col items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-widest text-[#a2adc4] sm:flex-row">
              <span>© 2026Testify Rajput's Project</span>
              <div className="flex gap-4">
                <button type="button" className="transition-colors hover:text-[#4a40e0]">Privacy</button>
                <button type="button" className="transition-colors hover:text-[#4a40e0]">Terms</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default StudentLogin
