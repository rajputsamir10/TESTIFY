export function getErrorMessage(error, fallback = 'Something went wrong') {
  const data = error?.response?.data

  if (typeof data === 'string') {
    return data
  }

  if (data?.detail) {
    return String(data.detail)
  }

  if (data && typeof data === 'object') {
    const firstKey = Object.keys(data)[0]
    const value = data[firstKey]
    if (Array.isArray(value)) {
      return String(value[0])
    }
    if (value) {
      return String(value)
    }
  }

  return fallback
}
