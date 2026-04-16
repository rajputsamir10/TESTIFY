"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { authAPI } from '../../api/authAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import ThemeToggleButton from '../../components/ThemeToggleButton'
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
      <ProfilePageHeader
        description="Manage your personal information and account security settings."
        rightAction={<ThemeToggleButton className="profile-theme-toggle" />}
      />

      <ProfileTwoColumnLayout>
        <AccountDetailsCard>
          <ProfileDetailsGrid>
            <ProfileDetailField label="Full Name" value={profile?.full_name || '-'} prominent />
            <ProfileDetailField label="Email Address" value={profile?.email || '-'} valueClassName="leading-tight" />
            <ProfileDetailField label="Role" value={<ProfileRoleBadge label={roleLabel} />} />
            <ProfileDetailField label="Department" value={profile?.department_name || '-'} />
            <ProfileDetailField label="Major / Course" value={profile?.course_name || '-'} />
            <ProfileDetailField label="Roll Number" value={profile?.roll_number || '-'} valueClassName="leading-tight" />
            <ProfileDetailField label="Batch Year" value={profile?.batch_year || '-'} valueClassName="leading-tight" />
          </ProfileDetailsGrid>
        </AccountDetailsCard>

        <SecurityCard
          form={form}
          onSubmit={onChangePassword}
          strengthScore={strengthScore}
          strengthLabel={strengthLabel}
        />
      </ProfileTwoColumnLayout>
    </div>
  )
}

export default Profile
