import api from './axios'

export const questionAPI = {
  listByExam: (examId) => api.get(`/teacher/exams/${examId}/questions/`),
  create: (payload) => api.post('/teacher/questions/', payload),
  update: (questionId, payload) => api.put(`/teacher/questions/${questionId}/`, payload),
  delete: (questionId) => api.delete(`/teacher/questions/${questionId}/`),
}
