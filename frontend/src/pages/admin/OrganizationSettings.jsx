import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { adminAPI } from '../../api/adminAPI'
import { authAPI } from '../../api/authAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import ThemeToggleButton from '../../components/ThemeToggleButton'
import { Building2 } from 'lucide-react'
import {
  AccountDetailsCard,
  ProfileDetailField,
  ProfileDetailsGrid,
  ProfilePageHeader,
  ProfileRoleBadge,
  ProfileTwoColumnLayout,
  SecurityCard,
} from '../../components/profile/ProfileCards'
import { getErrorMessage } from '../../utils/errors'

function OrganizationSettings() {
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState(null)
  const [profile, setProfile] = useState(null)

  const orgForm = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
  })

  const passwordForm = useForm({
    defaultValues: {
      old_password: '',
      new_password: '',
    },
  })

  const newPasswordValue = passwordForm.watch('new_password') || ''
  const strengthScore = [
    newPasswordValue.length >= 8,
    /[A-Z]/.test(newPasswordValue) && /[a-z]/.test(newPasswordValue),
    /\d/.test(newPasswordValue) || /[^A-Za-z0-9]/.test(newPasswordValue),
  ].filter(Boolean).length
  const strengthLabel = ['Weak', 'Medium', 'Strong'][Math.max(0, strengthScore - 1)] || 'Weak'

  const roleLabel = (profile?.role || 'admin')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: org }, { data: plan }, { data: me }] = await Promise.all([
        adminAPI.getOrganization(),
        adminAPI.getOrganizationPlan(),
        authAPI.me(),
      ])

      setMeta(plan)
      setProfile(me)
      orgForm.reset({
        name: org.name || '',
        email: org.email || '',
      })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load organization settings'))
    } finally {
      setLoading(false)
    }
  }, [orgForm])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onSubmit = async (values) => {
    try {
      await adminAPI.updateOrganization(values)
      toast.success('Organization updated')
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update organization'))
    }
  }

  const onChangePassword = async (values) => {
    try {
      await authAPI.changePassword(values)
      toast.success('Password changed successfully')
      passwordForm.reset({ old_password: '', new_password: '' })
    } catch (error) {
      toast.error(getErrorMessage(error, 'Password change failed'))
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading organization settings" />
  }

  return (
    <div className="space-y-6">
      <ProfilePageHeader
        description="Manage your admin profile and organization identity settings."
        rightAction={<ThemeToggleButton className="profile-theme-toggle" />}
      />

      <ProfileTwoColumnLayout>
        <AccountDetailsCard
          footer={
            <div className="mt-8 space-y-4 border-t border-slate-200/70 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#242f41]">
                  <Building2 className="h-4 w-4 text-[#4a40e0]" />
                  <p className="text-sm font-bold">Organization Settings</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="chip">Plan: {meta?.plan || 'free'}</span>
                  <span className="chip">{meta?.is_active ? 'Active' : 'Suspended'}</span>
                </div>
              </div>

              <form className="grid gap-3 md:max-w-xl" onSubmit={orgForm.handleSubmit(onSubmit)}>
                <label className="text-sm font-semibold text-slate-700">
                  Organization name
                  <input
                    className="mt-1 w-full rounded-xl border border-transparent bg-[#ecf1ff] px-3 py-2.5 text-sm text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                    {...orgForm.register('name', { required: true })}
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Organization email
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-transparent bg-[#ecf1ff] px-3 py-2.5 text-sm text-[#242f41] outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#4a40e0]/10"
                    {...orgForm.register('email', { required: true })}
                  />
                </label>

                <button
                  type="submit"
                  className="mt-2 w-fit rounded-xl bg-gradient-to-r from-[#4a40e0] to-[#7d7bf0] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_22px_-14px_rgba(74,64,224,0.9)] transition-all hover:brightness-105"
                >
                  Save changes
                </button>
              </form>
            </div>
          }
        >
          <ProfileDetailsGrid>
            <ProfileDetailField label="Full Name" value={profile?.full_name || '-'} prominent />
            <ProfileDetailField label="Email Address" value={profile?.email || '-'} valueClassName="leading-tight" />
            <ProfileDetailField label="Role" value={<ProfileRoleBadge label={roleLabel} />} />
            <ProfileDetailField label="Organization" value={orgForm.watch('name') || '-'} />
          </ProfileDetailsGrid>
        </AccountDetailsCard>

        <SecurityCard
          form={passwordForm}
          onSubmit={onChangePassword}
          strengthScore={strengthScore}
          strengthLabel={strengthLabel}
        />
      </ProfileTwoColumnLayout>
    </div>
  )
}

export default OrganizationSettings
