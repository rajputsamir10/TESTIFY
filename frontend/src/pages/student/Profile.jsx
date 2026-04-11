import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { Lock, ShieldCheck, UserRoundCog } from 'lucide-react'
import { authAPI } from '../../api/authAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import ThemeToggleButton from '../../components/ThemeToggleButton'
import { getErrorMessage } from '../../utils/errors'

function Profile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)

  const form = useForm({
    defaultValues: {
      old_password: '',
      new_password: '',
    },
  })

  const newPasswordValue = form.watch('new_password') || ''
  const strengthScore = [
    newPasswordValue.length >= 8,
    /[A-Z]/.test(newPasswordValue) && /[a-z]/.test(newPasswordValue),
    /\d/.test(newPasswordValue) || /[^A-Za-z0-9]/.test(newPasswordValue),
  ].filter(Boolean).length
  const strengthLabel = ['Weak', 'Medium', 'Strong'][Math.max(0, strengthScore - 1)] || 'Weak'

  const roleLabel = (profile?.role || '-')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await authAPI.me()
      setProfile(data)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load profile'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onChangePassword = async (values) => {
    try {
      await authAPI.changePassword(values)
      toast.success('Password changed successfully')
      form.reset({ old_password: '', new_password: '' })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Password change failed'))
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading profile" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight text-[#242f41]">Profile</h1>
          <p className="mt-1.5 text-base font-medium text-[#515c70]">Manage your personal information and account security settings.</p>
        </div>
        <ThemeToggleButton className="profile-theme-toggle" />
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        <div className="rounded-[1.6rem] border border-slate-200/70 bg-white/70 p-6 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)] backdrop-blur xl:col-span-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ecf1ff] text-[#4a40e0]">
                <UserRoundCog className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-[1.6rem] font-extrabold tracking-tight text-[#242f41]">Account Details</h2>
            </div>

            <button type="button" className="text-sm font-bold text-[#4a40e0] transition-colors hover:text-[#3d30d4]">
              Edit Profile
            </button>
          </div>

          <div className="grid gap-y-6 sm:grid-cols-2 sm:gap-x-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Full Name</p>
              <p className="mt-1.5 text-[1.75rem] font-bold leading-tight text-[#242f41] sm:text-[1.5rem]">{profile?.full_name || '-'}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Email Address</p>
              <p className="mt-1.5 text-xl font-bold text-[#242f41]">{profile?.email || '-'}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Role</p>
              <span className="mt-2 inline-flex rounded-full bg-[#e9ddff] px-3 py-1 text-xs font-bold text-[#6411d5]">
                {roleLabel}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Department</p>
              <p className="mt-1.5 text-xl font-bold leading-snug text-[#242f41]">{profile?.department_name || '-'}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Major / Course</p>
              <p className="mt-1.5 text-xl font-bold leading-snug text-[#242f41]">{profile?.course_name || '-'}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Roll Number</p>
              <p className="mt-1.5 text-xl font-bold text-[#242f41]">{profile?.roll_number || '-'}</p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Batch Year</p>
              <p className="mt-1.5 text-xl font-bold text-[#242f41]">{profile?.batch_year || '-'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-slate-200/70 bg-white/70 p-6 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)] backdrop-blur xl:col-span-4">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ecf1ff] text-[#4a40e0]">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-[1.6rem] font-extrabold tracking-tight text-[#242f41]">Security</h2>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(onChangePassword)}>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#515c70]">Old Password</span>
              <input
                type="password"
                className="w-full rounded-xl border border-transparent bg-[#ecf1ff] px-3.5 py-2.5 text-sm text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                {...form.register('old_password', { required: true })}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-[#515c70]">New Password</span>
              <input
                type="password"
                placeholder="Min. 8 characters"
                className="w-full rounded-xl border border-transparent bg-[#ecf1ff] px-3.5 py-2.5 text-sm text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                {...form.register('new_password', { required: true })}
              />
            </label>

            <div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((segment) => (
                  <div
                    key={segment}
                    className={[
                      'h-1.5 rounded-full transition-colors',
                      segment <= strengthScore ? 'bg-[#6f66ef]' : 'bg-[#d7deef]',
                    ].join(' ')}
                  />
                ))}
              </div>
              <p className="mt-1 text-[11px] font-semibold text-[#6c778c]">Password strength: {strengthLabel}</p>
            </div>

            <button
              type="submit"
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4a40e0] to-[#7d7bf0] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_22px_-14px_rgba(74,64,224,0.9)] transition-all hover:brightness-105"
            >
              <Lock className="h-4 w-4" />
              Update password
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between border-t border-slate-200/70 pt-4">
            <div>
              <p className="text-sm font-bold text-[#242f41]">Two-Factor Auth</p>
              <p className="text-xs font-medium text-[#6c778c]">Recommended for security</p>
            </div>
            <button type="button" className="flex h-6 w-11 items-center rounded-full bg-[#d7deef] p-1" aria-label="Two-factor authentication">
              <span className="h-4 w-4 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
