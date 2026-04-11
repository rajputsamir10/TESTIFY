import api from './axios'

export const godAPI = {
  getStats: () => api.get('/god/stats/'),
  listOrganizations: () => api.get('/god/organizations/'),
  createOrganization: (payload) => api.post('/god/organizations/', payload),
  getOrganization: (id) => api.get(`/god/organizations/${id}/`),
  updateOrganization: (id, payload) => api.put(`/god/organizations/${id}/`, payload),
  deleteOrganization: (id) => api.delete(`/god/organizations/${id}/`),
  patchPlan: (id, plan) => api.patch(`/god/organizations/${id}/plan/`, { plan }),
  patchSuspend: (id, isActive) => api.patch(`/god/organizations/${id}/suspend/`, { is_active: isActive }),
  listUsers: () => api.get('/god/users/'),
  createUser: (payload) => api.post('/god/users/', payload),
  getUser: (id) => api.get(`/god/users/${id}/`),
  updateUser: (id, payload) => api.put(`/god/users/${id}/`, payload),
  deleteUser: (id) => api.delete(`/god/users/${id}/`),
  resetUserPassword: (id, newPassword) => api.patch(`/god/users/${id}/reset-password/`, { new_password: newPassword }),
}
