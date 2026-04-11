import api from './axios'

export const examAPI = {
  listTeacherDepartments: () => api.get('/teacher/departments/'),
  listTeacherCourses: (departmentId) =>
    api.get('/teacher/courses/', {
      params: departmentId ? { department_id: departmentId } : {},
    }),
  getTeacherProfile: () => api.get('/teacher/profile/'),
  uploadTeacherProfilePhoto: (formData) => api.patch('/teacher/profile/photo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  listTeacherExams: () => api.get('/teacher/exams/'),
  createTeacherExam: (payload) => api.post('/teacher/exams/', payload),
  updateTeacherExam: (id, payload) => api.put(`/teacher/exams/${id}/`, payload),
  deleteTeacherExam: (id) => api.delete(`/teacher/exams/${id}/`),
  publishTeacherExam: (id) => api.post(`/teacher/exams/${id}/publish/`),
  publishTeacherResults: (id) => api.post(`/teacher/exams/${id}/publish-results/`),

  listExamQuestions: (id) => api.get(`/teacher/exams/${id}/questions/`),
  createQuestion: (payload) => api.post('/teacher/questions/', payload),
  updateQuestion: (id, payload) => api.put(`/teacher/questions/${id}/`, payload),
  deleteQuestion: (id) => api.delete(`/teacher/questions/${id}/`),

  listExamAttempts: (id) => api.get(`/teacher/exams/${id}/attempts/`),
  listAttemptAnswersForTeacher: (id) => api.get(`/teacher/attempts/${id}/answers/`),
  evaluateAnswer: (id, marks) => api.put(`/teacher/answers/${id}/evaluate/`, { marks_awarded: marks }),
  getPerformance: () => api.get('/teacher/students/performance/'),

  getStudentAvailableExams: () => api.get('/student/exams/available/'),
  startStudentExam: (id) => api.post(`/student/exams/${id}/start/`),
  getRemainingTime: (attemptId) => api.get(`/student/attempts/${attemptId}/remaining-time/`),
  getStudentAttemptAnswers: (attemptId) => api.get(`/student/attempts/${attemptId}/answers/`),
  getQuestionOptions: (questionId) => api.get(`/student/questions/${questionId}/options/`),
  updateStudentAnswer: (answerId, payload) => api.put(`/student/answers/${answerId}/`, payload),
  submitAttempt: (attemptId) => api.post(`/student/attempts/${attemptId}/submit/`),
  autoSubmitAttempt: (attemptId) => api.post(`/student/attempts/${attemptId}/auto-submit/`),
  reportViolation: (attemptId) => api.post(`/student/attempts/${attemptId}/violation/`),
}
