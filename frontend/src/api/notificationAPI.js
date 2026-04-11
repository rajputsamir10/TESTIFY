import api from './axios'

export const notificationAPI = {
  list: () => api.get('/notifications/'),
  readOne: (id) => api.patch(`/notifications/${id}/read/`),
  readAll: () => api.patch('/notifications/read-all/'),
  unreadCount: () => api.get('/notifications/unread-count/'),
}
