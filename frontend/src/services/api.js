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
    console.log('Request data:', config.data)
    console.log('Base URL:', config.baseURL)
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
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

// Legacy remote decode removed; server-first /extract is used instead

// Extract barcodes using server-side detector + ZXing
export const extractBarcodes = async (file) => {
  const form = new FormData()
  form.append('image', file)
  // Use axios directly to set correct headers for multipart
  const response = await api.post('/api/barcode/extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  })
  return response.data
}

// AI Agent APIs
export const chatWithAgent = async (userId, message, sessionId = null, context = {}) => {
  const response = await api.post('/api/agent/chat', {
    user_id: userId,
    message,
    session_id: sessionId,
    context
  })
  return response.data
}

export const analyzeProductWithAI = async (userId, productInfo, specificQuestion = null) => {
  const response = await api.post('/api/agent/analyze-product', {
    user_id: userId,
    product_info: productInfo,
    specific_question: specificQuestion
  })
  return response.data
}

export const researchUnknownProduct = async (userId, productName, ingredients, ocrText, barcode) => {
  const response = await api.post('/api/agent/research-unknown', {
    user_id: userId,
    product_name: productName,
    ingredients,
    ocr_text: ocrText,
    barcode
  })
  return response.data
}

export const getProductAlternatives = async (userId, barcode) => {
  const response = await api.get(`/api/agent/suggest-alternatives/${barcode}?user_id=${userId}`)
  return response.data
}

export const explainNutritionConcept = async (userId, topic, contextProduct = null, userCondition = null) => {
  const response = await api.post('/api/agent/explain', {
    user_id: userId,
    topic,
    context_product: contextProduct,
    user_condition: userCondition
  })
  return response.data
}

export const getAgentStatus = async () => {
  const response = await api.get('/api/agent/status')
  return response.data
}

// Enhanced OCR APIs
// OCR endpoints removed from current workflow

export default api
