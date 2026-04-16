import api from './axios'

export const authAPI = {
  requestAdminSignupOtp: (payload) => api.post('/auth/admin/signup/request-otp/', payload),
  verifyAdminSignupOtp: (payload) => api.post('/auth/admin/signup/verify-otp/', payload),
  adminSignup: (payload) => api.post('/auth/admin/signup/', payload),
  adminLogin: (payload) => api.post('/auth/admin/login/', payload),
  teacherLogin: (payload) => api.post('/auth/teacher/login/', payload),
  studentLogin: (payload) => api.post('/auth/student/login/', payload),
  godLogin: (payload) => api.post('/auth/god/login/', payload),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  changePassword: (payload) => api.post('/auth/change-password/', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password/', payload),
  verifyOtp: (payload) => api.post('/auth/verify-otp/', payload),
  resetPassword: (payload) => api.post('/auth/reset-password/', payload),
}
