import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-toastify'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Badge,
  Building2,
  CircleHelp,
  GraduationCap,
  Loader2,
  Lock,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import PasswordStrengthChecklist from '../../components/PasswordStrengthChecklist'
import { authAPI } from '../../api/authAPI'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../utils/errors'
import { isPasswordStrong } from '../../utils/passwordRules'

const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (value) => isPasswordStrong(value),
    'Password must include uppercase, lowercase, number, and special character',
  )

const signupSchema = z
  .object({
    full_name: z.string().min(2),
    email: z.string().email(),
    otp: z.string().optional(),
    password: strongPasswordSchema,
    confirm_password: z.string().min(8),
    organization_name: z.string().min(2),
    organization_email: z.string().email(),
  })
  .refine((value) => value.password === value.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function Input({ label, type = 'text', register, name, error, placeholder, icon: Icon }) {
  return (
    <label className="block space-y-2">
      <span className="block px-1 text-xs font-bold uppercase tracking-widest text-[#515c70]">{label}</span>
      <div className="group relative">
        {Icon ? <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a2adc4] transition-colors group-focus-within:text-[#4a40e0]" /> : null}
        <input
          type={type}
          placeholder={placeholder}
          className="auth-input w-full rounded-xl border-none bg-[#ecf1ff] py-4 pl-12 pr-4 text-sm text-[#242f41] placeholder:text-[#a2adc4] transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
          {...register(name)}
        />
      </div>
      {error && <span className="mt-1 block text-xs text-rose-600">{error.message}</span>}
    </label>
  )
}

function AdminAuth() {
  const [tab, setTab] = useState('login')
  const navigate = useNavigate()
  const { login } = useAuth()

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      otp: '',
      password: '',
      confirm_password: '',
      organization_name: '',
      organization_email: '',
    },
  })

  const [otpSent, setOtpSent] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpBusy, setOtpBusy] = useState(false)
  const [otpResendSeconds, setOtpResendSeconds] = useState(0)
  const previousSignupEmailRef = useRef('')

  const signupPassword = useWatch({ control: signupForm.control, name: 'password' }) || ''
  const signupConfirmPassword = useWatch({ control: signupForm.control, name: 'confirm_password' }) || ''
  const signupEmail = useWatch({ control: signupForm.control, name: 'email' }) || ''

  useEffect(() => {
    const normalizedEmail = signupEmail.trim().toLowerCase()
    if (
      previousSignupEmailRef.current
      && previousSignupEmailRef.current !== normalizedEmail
    ) {
      setOtpSent(false)
      setOtpVerified(false)
      setOtpResendSeconds(0)
      signupForm.setValue('otp', '')
    }
    previousSignupEmailRef.current = normalizedEmail
  }, [signupEmail, signupForm])

  useEffect(() => {
    if (otpResendSeconds <= 0) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      setOtpResendSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timerId)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [otpResendSeconds])

  const disableSignupSubmit =
    !isPasswordStrong(signupPassword) ||
    !signupPassword ||
    !signupConfirmPassword ||
    signupPassword !== signupConfirmPassword ||
    !otpVerified

  const onSendSignupOtp = async () => {
    const email = signupForm.getValues('email')
    if (!email) {
      toast.error('Please enter admin email first')
      return
    }

    try {
      setOtpBusy(true)
      await authAPI.requestAdminSignupOtp({ email })
      setOtpSent(true)
      setOtpVerified(false)
      setOtpResendSeconds(60)
      toast.success('Verification code sent to your email')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to send verification code'))
    } finally {
      setOtpBusy(false)
    }
  }

  const onVerifySignupOtp = async () => {
    const email = signupForm.getValues('email')
    const otp = (signupForm.getValues('otp') || '').trim()

    if (!email) {
      toast.error('Please enter admin email first')
      return
    }

    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit verification code')
      return
    }

    try {
      setOtpBusy(true)
      await authAPI.verifyAdminSignupOtp({ email, otp })
      setOtpVerified(true)
      toast.success('Email verified successfully')
    } catch (error) {
      setOtpVerified(false)
      toast.error(getErrorMessage(error, 'OTP verification failed'))
    } finally {
      setOtpBusy(false)
    }
  }

  const onLogin = async (values) => {
    try {
      const { data } = await authAPI.adminLogin(values)
      login(data.user || data.access, data.refresh)
      toast.success('Welcome back')
      navigate('/admin')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Admin login failed'))
    }
  }

  const onSignup = async (values) => {
    if (!otpVerified) {
      toast.error('Please verify your email before creating workspace')
      return
    }

    try {
      const { data } = await authAPI.adminSignup(values)
      login(data.user || data.access, data.refresh)
      toast.success('Organization created')
      navigate('/admin')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Admin signup failed'))
    }
  }

  return (
    <div className="auth-page min-h-screen bg-[#f4f6ff] font-body text-[#242f41]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="relative flex items-center justify-center overflow-hidden bg-[#4a40e0] p-8 text-white lg:sticky lg:top-0 lg:h-screen lg:w-1/2 lg:p-16">
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
                <span className="text-indigo-200">Admin</span>
              </h2>
              <p className="max-w-md text-lg font-medium text-indigo-100 opacity-90 lg:text-xl">
                Manage institutions, users, and global configurations from your central dashboard.
              </p>
            </div>

            <div className="mt-16 grid gap-6">
              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Manage Organizations</h4>
                  <p className="text-sm text-indigo-200">Oversee all tenant structures and policies.</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">System Health</h4>
                  <p className="text-sm text-indigo-200">Real-time metrics on platform performance.</p>
                </div>
              </div>

              <div className="group flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all group-hover:bg-white group-hover:text-[#4a40e0]">
                  <UserCog className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">Global User Control</h4>
                  <p className="text-sm text-indigo-200">Comprehensive access management tools.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <main
          className={[
            'auth-panel flex flex-col items-center bg-[#f4f6ff] p-8 lg:min-h-screen lg:w-1/2 lg:p-16',
            tab === 'signup' ? 'lg:justify-start lg:overflow-visible' : 'lg:justify-center lg:overflow-visible',
          ].join(' ')}
        >
          <div className="mb-8 flex w-full justify-end lg:hidden">
            <span className="font-headline text-xl font-extrabold text-[#4a40e0]">Testify</span>
          </div>

          <div className="w-full max-w-md">
            <div className="mb-10">
              <h1 className="font-headline mb-2 text-3xl font-extrabold tracking-tight text-[#242f41]">Admin Portal</h1>
              <p className="font-medium text-[#515c70]">Please authenticate to access the cockpit.</p>
            </div>

            <div className="auth-tabs mb-6 grid grid-cols-2 rounded-xl border border-[#d7deef] bg-[#ecf1ff] p-1">
              <button
                type="button"
                className={[
                  'rounded-lg px-3 py-2 text-sm font-semibold transition',
                  tab === 'login' ? 'bg-white text-[#242f41] shadow' : 'text-[#6c778c]',
                ].join(' ')}
                onClick={() => setTab('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={[
                  'rounded-lg px-3 py-2 text-sm font-semibold transition',
                  tab === 'signup' ? 'bg-white text-[#242f41] shadow' : 'text-[#6c778c]',
                ].join(' ')}
                onClick={() => setTab('signup')}
              >
                Sign up
              </button>
            </div>

            {tab === 'login' ? (
              <form className="space-y-6" onSubmit={loginForm.handleSubmit(onLogin)}>
                <Input
                  label="ADMIN EMAIL"
                  type="email"
                  register={loginForm.register}
                  name="email"
                  error={loginForm.formState.errors.email}
                  placeholder="Enter your email"
                  icon={Badge}
                />

                <Input
                  label="PASSWORD"
                  type="password"
                  register={loginForm.register}
                  name="password"
                  error={loginForm.formState.errors.password}
                  placeholder="••••••••"
                  icon={Lock}
                />

                <button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4a40e0] py-4 font-bold text-[#f4f1ff] shadow-lg shadow-[#4a40e0]/20 transition-all hover:bg-[#3d30d4] hover:shadow-[#4a40e0]/40 active:scale-[0.98]"
                >
                  {loginForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      Login to Admin Portal
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={signupForm.handleSubmit(onSignup)}>
                <Input
                  label="FULL NAME"
                  register={signupForm.register}
                  name="full_name"
                  error={signupForm.formState.errors.full_name}
                  placeholder="Enter your name"
                  icon={Badge}
                />
                <Input
                  label="EMAIL"
                  type="email"
                  register={signupForm.register}
                  name="email"
                  error={signupForm.formState.errors.email}
                  placeholder="Enter your email"
                  icon={Badge}
                />
                <button
                  type="button"
                  onClick={onSendSignupOtp}
                  disabled={otpBusy || !signupEmail || otpResendSeconds > 0}
                  className="w-full rounded-xl border border-[#4a40e0]/25 bg-white px-4 py-2.5 text-sm font-bold text-[#4a40e0] transition-colors hover:bg-[#ecf1ff] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {otpResendSeconds > 0
                    ? `Resend Verification Code (${otpResendSeconds}s)`
                    : otpSent
                      ? 'Resend Verification Code'
                      : 'Send Verification Code'}
                </button>

                {otpSent && (
                  <>
                    <Input
                      label="EMAIL VERIFICATION CODE"
                      register={signupForm.register}
                      name="otp"
                      error={signupForm.formState.errors.otp}
                      placeholder="Enter 6-digit code"
                      icon={Badge}
                    />
                    <button
                      type="button"
                      onClick={onVerifySignupOtp}
                      disabled={otpBusy || otpVerified}
                      className="w-full rounded-xl border border-[#4a40e0]/25 bg-[#ecf1ff] px-4 py-2.5 text-sm font-bold text-[#4a40e0] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {otpVerified ? 'Email Verified' : 'Verify Code'}
                    </button>
                  </>
                )}
                <Input
                  label="PASSWORD"
                  type="password"
                  register={signupForm.register}
                  name="password"
                  error={signupForm.formState.errors.password}
                  placeholder="Create password"
                  icon={Lock}
                />
                <PasswordStrengthChecklist password={signupPassword} />
                <Input
                  label="CONFIRM PASSWORD"
                  type="password"
                  register={signupForm.register}
                  name="confirm_password"
                  error={signupForm.formState.errors.confirm_password}
                  placeholder="Re-enter password"
                  icon={Lock}
                />
                <Input
                  label="ORGANIZATION NAME"
                  register={signupForm.register}
                  name="organization_name"
                  error={signupForm.formState.errors.organization_name}
                  placeholder="Enter organization"
                  icon={Building2}
                />
                <Input
                  label="ORGANIZATION EMAIL"
                  type="email"
                  register={signupForm.register}
                  name="organization_email"
                  error={signupForm.formState.errors.organization_email}
                  placeholder="Enter organization email"
                  icon={Badge}
                />

                <button
                  type="submit"
                  disabled={disableSignupSubmit || signupForm.formState.isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4a40e0] py-4 font-bold text-[#f4f1ff] shadow-lg shadow-[#4a40e0]/20 transition-all hover:bg-[#3d30d4] hover:shadow-[#4a40e0]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signupForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      Create admin workspace
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
              <Link to="/forgot-password?role=admin" className="text-sm font-semibold text-[#4a40e0] transition-colors hover:text-[#3d30d4]">
                Forgot Password?
              </Link>
              <div className="flex gap-4">
                <button type="button" className="flex items-center gap-1 text-sm font-semibold text-[#6c778c] transition-colors hover:text-[#242f41]">
                  <CircleHelp className="h-4 w-4" />
                  Need Help?
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-semibold text-[#6c778c] transition-colors hover:text-[#242f41]"
                  onClick={() => navigate('/login-selection')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              </div>
            </div>

            <div className="auth-support-card mt-12 flex items-center gap-4 rounded-xl border border-[#a2adc4]/20 bg-[#ecf1ff] p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4a40e0]/10">
                <ShieldCheck className="h-5 w-5 text-[#4a40e0]" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#242f41]">Secure Access</h3>
                <p className="mt-0.5 text-[11px] text-[#515c70]">Admin sessions are monitored for security and compliance.</p>
              </div>
            </div>
          </div>

          <div className="mt-auto w-full max-w-md pt-16">
            <div className="flex flex-col items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-widest text-[#a2adc4] sm:flex-row">
              <span>© 2026Testify Rajput's Project</span>
              <div className="flex gap-4">
                <button type="button" className="transition-colors hover:text-[#4a40e0]">Privacy</button>
                <button type="button" className="transition-colors hover:text-[#4a40e0]">Terms</button>
                <button type="button" className="transition-colors hover:text-[#4a40e0]">Status</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminAuth
