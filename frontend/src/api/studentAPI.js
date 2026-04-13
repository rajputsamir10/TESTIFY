import api from './axios'

export const studentAPI = {
  getAvailableExams: () => api.get('/student/exams/available/'),
  generatePlaygroundQuestions: (payload) => api.post('/student/playground/generate/', payload),
  listPlaygroundSessions: () => api.get('/student/playground/sessions/'),
  getPlaygroundSession: (sessionId) => api.get(`/student/playground/sessions/${sessionId}/`),
  submitPlaygroundSession: (sessionId, payload) => api.post(`/student/playground/sessions/${sessionId}/submit/`, payload),
  getPlaygroundSummary: () => api.get('/student/playground/summary/'),
  startExam: (examId) => api.post(`/student/exams/${examId}/start/`),
  getRemainingTime: (attemptId) => api.get(`/student/attempts/${attemptId}/remaining-time/`),
  getAttemptAnswers: (attemptId) => api.get(`/student/attempts/${attemptId}/answers/`),
  getQuestionOptions: (questionId) => api.get(`/student/questions/${questionId}/options/`),
  updateAnswer: (answerId, payload) => api.put(`/student/answers/${answerId}/`, payload),
  runCodingAnswer: (answerId, payload) => api.post(`/student/answers/${answerId}/run-code/`, payload),
  submitAttempt: (attemptId) => api.post(`/student/attempts/${attemptId}/submit/`),
  autoSubmitAttempt: (attemptId) => api.post(`/student/attempts/${attemptId}/auto-submit/`),
  recordViolation: (attemptId) => api.post(`/student/attempts/${attemptId}/violation/`),
}
