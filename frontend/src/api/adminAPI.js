import api from './axios'

export const adminAPI = {
  getOrganization: () => api.get('/admin/organization/'),
  updateOrganization: (payload) => api.put('/admin/organization/', payload),
  getOrganizationStats: () => api.get('/admin/organization/stats/'),
  getOrganizationPlan: () => api.get('/admin/organization/plan/'),

  listUsers: () => api.get('/admin/users/'),
  createUser: (payload) => api.post('/admin/users/create/', payload),
  deleteUser: (id) => api.delete(`/admin/users/${id}/`),
  resetUserPassword: (id, newPassword) => api.post(`/admin/users/${id}/reset-password/`, { new_password: newPassword }),

  listDepartments: () => api.get('/admin/departments/'),
  createDepartment: (payload) => api.post('/admin/departments/', payload),
  updateDepartment: (id, payload) => api.put(`/admin/departments/${id}/`, payload),
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}/`),

  listCourses: () => api.get('/admin/courses/'),
  createCourse: (payload) => api.post('/admin/courses/', payload),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}/`),
}
