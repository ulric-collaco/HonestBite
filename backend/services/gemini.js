import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger.js'

let genAI = null
let model = null

export const initGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    logger.warn('GEMINI_API_KEY not set. AI features will be limited.')
    return null
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey)
    // Choose a strong default model; can be overridden via env
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro'
    model = genAI.getGenerativeModel({ model: modelName })
    logger.info(`Gemini model initialized: ${modelName}`)
    return model
  } catch (err) {
    logger.error('Failed to initialize Gemini client:', err)
    return null
  }
}

export const getGeminiModel = () => {
  if (model) return model
  return initGemini()
}

export const generateWithGemini = async (prompt) => {
  const m = getGeminiModel()
  if (!m) throw new Error('Gemini model not initialized. Please set GEMINI_API_KEY in environment.')
  
  try {
    const result = await m.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (err) {
    logger.error('Gemini generation error:', err)
    throw new Error('Failed to generate response with Gemini')
  }
}
