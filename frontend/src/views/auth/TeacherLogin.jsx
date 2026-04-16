"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import {
  ArrowRight,
  Award,
  Badge,
  GraduationCap,
  Headset,
  Loader2,
  LineChart,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { authAPI } from '../../api/authAPI'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../utils/errors'

const schema = z.object({
  teacher_id: z.string().min(1),
  password: z.string().min(1),
})

function TeacherLogin() {
  const router = useRouter()
  const { login } = useAuth()

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { teacher_id: '', password: '' },
  })

  const onSubmit = async (values) => {
    try {
      const { data } = await authAPI.teacherLogin(values)
      login(data.user || data.access, data.refresh)
      toast.success('Teacher login successful')
      router.push('/teacher')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Teacher login failed'))
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
                <span className="text-indigo-200">Educator</span>
              </h2>
              <p className="max-w-md text-lg font-medium text-indigo-100 opacity-90 lg:text-xl">
                Access your teaching dashboard to streamline your classroom management and focus on what matters most: student growth.
              </p>
            </div>

            <div className="mt-16 grid gap-6">
              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Grade Assessments</h4>
                  <p className="text-sm text-indigo-200">Quick and intuitive evaluation tools</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Manage Classes</h4>
                  <p className="text-sm text-indigo-200">Organize students and schedules</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <LineChart className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Track Progress</h4>
                  <p className="text-sm text-indigo-200">Real-time insights and analytics</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel flex flex-col items-center justify-center bg-[#f4f6ff] p-8 lg:w-1/2 lg:p-16">
          <div className="mb-8 flex w-full justify-end lg:hidden">
            <span className="font-headline text-xl font-extrabold text-[#4a40e0]">Testify</span>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-10 text-left">
              <h2 className="mb-2 text-3xl font-bold tracking-tight text-[#242f41]">Teacher Portal</h2>
              <p className="font-medium text-[#515c70]">Please enter your credentials to continue</p>
            </div>

            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <label className="block px-1 text-xs font-bold uppercase tracking-widest text-[#515c70]" htmlFor="teacher-id">
                  Teacher ID
                </label>
                <div className="group relative">
                  <Badge className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a2adc4] transition-colors group-focus-within:text-[#4a40e0]" />
                  <input
                    id="teacher-id"
                    className="auth-input w-full rounded-xl border-none bg-[#ecf1ff] py-4 pl-12 pr-4 text-sm text-[#242f41] placeholder:text-[#a2adc4] transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                    placeholder="Enter your unique ID"
                    {...form.register('teacher_id')}
                  />
                </div>
                {form.formState.errors.teacher_id && (
                  <span className="block px-1 text-xs text-rose-600">{form.formState.errors.teacher_id.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <label className="block px-1 text-xs font-bold uppercase tracking-widest text-[#515c70]" htmlFor="password">
                  Password
                </label>
                <div className="group relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a2adc4] transition-colors group-focus-within:text-[#4a40e0]" />
                  <input
                    id="password"
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
                    Login to Teacher Portal
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <Link href="/forgot-password?role=teacher" className="text-sm font-semibold text-[#4a40e0] transition-colors hover:text-[#3d30d4]">
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#242f41]">Secure Access</h3>
                <p className="mt-0.5 text-[11px] text-[#515c70]">Your teacher session is protected with enterprise-grade encryption.</p>
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
        </section>
      </div>
    </div>
  )
}

export default TeacherLogin
