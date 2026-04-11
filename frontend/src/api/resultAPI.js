import api from './axios'

export const resultAPI = {
  listResults: () => api.get('/student/results/'),
  getResult: (id) => api.get(`/student/results/${id}/`),
  getReview: (id) => api.get(`/student/results/${id}/review/`),
  downloadResult: (id, format) =>
    api.get(`/student/results/${id}/download/?format=${format}`, {
      responseType: 'blob',
    }),
}
