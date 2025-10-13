import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health')
  return response.data
}

// User APIs
export const createUser = async (userData) => {
  const response = await api.post('/api/user', userData)
  return response.data
}

export const getUser = async (userId) => {
  const response = await api.get(`/api/user/${userId}`)
  return response.data
}

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/api/user/${userId}`, userData)
  return response.data
}

// Scan APIs
export const scanProduct = async (scanData) => {
  const response = await api.post('/api/scan', scanData)
  return response.data
}

export const getUserScans = async (userId) => {
  const response = await api.get(`/api/user/${userId}/scans`)
  return response.data
}

// Product APIs
export const getProduct = async (barcode) => {
  const response = await api.get(`/api/product/${barcode}`)
  return response.data
}

// Doctor APIs
export const getDoctorDashboard = async (patientId) => {
  const response = await api.get(`/api/doctor/${patientId}`)
  return response.data
}

export const exportDoctorReport = async (patientId) => {
  const response = await api.get(`/api/doctor/${patientId}/report`, {
    responseType: 'blob'
  })
  return response.data
}

export default api
