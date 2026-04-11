const PASSWORD_RULES = [
  {
    key: 'minLength',
    label: 'Minimum 8 characters',
    test: (value) => value.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least 1 uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    key: 'lowercase',
    label: 'At least 1 lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  {
    key: 'number',
    label: 'At least 1 number',
    test: (value) => /\d/.test(value),
  },
  {
    key: 'special',
    label: 'At least 1 special character',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
]

export function getPasswordChecklist(password = '') {
  const safePassword = String(password)
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(safePassword),
  }))
}

export function isPasswordStrong(password = '') {
  return getPasswordChecklist(password).every((item) => item.passed)
}
