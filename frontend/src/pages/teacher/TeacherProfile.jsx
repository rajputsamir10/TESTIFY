import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import { authAPI } from '../../api/authAPI'
import { examAPI } from '../../api/examAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import ThemeToggleButton from '../../components/ThemeToggleButton'
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Profile</h1>
          <p className="text-sm text-slate-600">Your teaching identity, profile photo, and account security.</p>
        </div>
        <ThemeToggleButton className="profile-theme-toggle" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Account details</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p><span className="font-semibold">Name:</span> {profile?.full_name}</p>
            <p><span className="font-semibold">Email:</span> {profile?.email}</p>
            <p><span className="font-semibold">Teacher ID:</span> {profile?.teacher_id || '-'}</p>
            <p><span className="font-semibold">Department:</span> {profile?.department_name || '-'}</p>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700">Profile photo</p>
            {profile?.profile_photo && (
              <img
                src={profile.profile_photo}
                alt="Teacher profile"
                className="h-24 w-24 rounded-xl border border-slate-200 object-cover"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
              className="block w-full text-sm"
            />
            <button
              type="button"
              onClick={onUploadPhoto}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
            >
              Upload photo
            </button>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-bold text-slate-900">Change password</h2>
          <form className="mt-3 space-y-3" onSubmit={passwordForm.handleSubmit(onChangePassword)}>
            <label className="block text-sm font-semibold text-slate-700">
              Old password
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                {...passwordForm.register('old_password', { required: true })}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              New password
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                {...passwordForm.register('new_password', { required: true })}
              />
            </label>

            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TeacherProfile
