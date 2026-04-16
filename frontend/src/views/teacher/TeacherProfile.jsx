"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { ImagePlus } from 'lucide-react'
import { authAPI } from '../../api/authAPI'
import { examAPI } from '../../api/examAPI'
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

function TeacherProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)

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

  const roleLabel = (profile?.role || 'teacher')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await examAPI.getTeacherProfile()
      setProfile(data)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load teacher profile'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onUploadPhoto = async () => {
    if (!photoFile) {
      toast.error('Please choose an image file first')
      return
    }

    try {
      const formData = new FormData()
      formData.append('profile_photo', photoFile)
      await examAPI.uploadTeacherProfilePhoto(formData)
      toast.success('Profile photo updated')
      setPhotoFile(null)
      await loadData()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to upload profile photo'))
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
    return <LoadingSpinner text="Loading teacher profile" />
  }

  return (
    <div className="space-y-6">
      <ProfilePageHeader
        description="Your teaching identity, profile photo, and account security settings."
        rightAction={<ThemeToggleButton className="profile-theme-toggle" />}
      />

      <ProfileTwoColumnLayout>
        <AccountDetailsCard
          footer={
            <div className="mt-8 space-y-3 border-t border-slate-200/70 pt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8a96ad]">Profile Photo</p>
                <span className="rounded-full bg-[#ecf1ff] px-3 py-1 text-[10px] font-bold text-[#4a40e0]">Optional</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {profile?.profile_photo ? (
                  <img
                    src={profile.profile_photo}
                    alt="Teacher profile"
                    className="h-20 w-20 rounded-2xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}

                <div className="min-w-[220px] flex-1 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={onUploadPhoto}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4a40e0] to-[#7d7bf0] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_22px_-14px_rgba(74,64,224,0.9)] transition-all hover:brightness-105"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload photo
                  </button>
                </div>
              </div>
            </div>
          }
        >
          <ProfileDetailsGrid>
            <ProfileDetailField label="Full Name" value={profile?.full_name || '-'} prominent />
            <ProfileDetailField label="Email Address" value={profile?.email || '-'} valueClassName="leading-tight" />
            <ProfileDetailField label="Role" value={<ProfileRoleBadge label={roleLabel} />} />
            <ProfileDetailField label="Department" value={profile?.department_name || '-'} />
            <ProfileDetailField label="Teacher ID" value={profile?.teacher_id || '-'} valueClassName="leading-tight" />
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

export default TeacherProfile
