import fetch from 'node-fetch'
import { logger } from '../utils/logger.js'

const HF_API_KEY = process.env.HUGGING_FACE_API_KEY || process.env.HF_TOKEN
const HF_API_URL = 'https://api-inference.huggingface.co/models'

// Greenwashing buzzwords to detect
const GREENWASHING_BUZZWORDS = [
  'all-natural',
  'natural',
  'organic',
  'immune-boosting',
  'immunity',
  'superfood',
  'chemical-free',
  'detox',
  'cleanse',
  'fat-burning',
  'heart-healthy',
  'clinically proven',
  'doctor recommended',
  'ancient formula',
  'traditional recipe',
  'zero sugar',
  'sugar-free',
  'fat-free',
  'no artificial',
  'preservative-free',
  'made with real',
  'wholesome',
  'pure',
  'authentic',
  'premium quality'
]

/**
 * Detect greenwashing buzzwords in product description
 * @param {string} text - Product description or marketing text
 * @returns {Promise<Array>} List of detected buzzwords
 */
export const detectGreenwashing = async (text) => {
  if (!text) return []

  const lowerText = text.toLowerCase()
  const detected = []

  // Simple keyword matching
  for (const buzzword of GREENWASHING_BUZZWORDS) {
    if (lowerText.includes(buzzword)) {
      detected.push(buzzword)
    }
  }

  // Return unique buzzwords
  return [...new Set(detected)]
}

/**
 * Analyze sentiment using Hugging Face API (optional enhancement)
 * @param {string} text - Text to analyze
 * @returns {Promise<Object>} Sentiment analysis result
 */
export const analyzeSentiment = async (text) => {
  if (!HF_API_KEY) {
    logger.warn('Hugging Face API key not configured, skipping sentiment analysis')
    return null
  }

  try {
    const response = await fetch(
      `${HF_API_URL}/distilbert-base-uncased-finetuned-sst-2-english`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: text })
      }
    )

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    logger.error('Error calling Hugging Face API:', error)
    return null
  }
}

/**
 * Classify marketing claims
 * @param {Array<string>} claims - List of marketing claims
 * @returns {Object} Classification results
 */
export const classifyMarketingClaims = (claims) => {
  const classifications = {
    health_claims: [],
    environmental_claims: [],
    quality_claims: [],
    suspicious: []
  }

  const healthKeywords = ['immune', 'health', 'vitamin', 'mineral', 'probiotic', 'antioxidant']
  const envKeywords = ['organic', 'natural', 'eco', 'sustainable', 'green']
  const qualityKeywords = ['premium', 'authentic', 'pure', 'real', 'traditional']

  for (const claim of claims) {
    const lower = claim.toLowerCase()
    
    if (healthKeywords.some(k => lower.includes(k))) {
      classifications.health_claims.push(claim)
    }
    if (envKeywords.some(k => lower.includes(k))) {
      classifications.environmental_claims.push(claim)
    }
    if (qualityKeywords.some(k => lower.includes(k))) {
      classifications.quality_claims.push(claim)
    }
    
    // Flag suspicious claims
    if (lower.includes('doctor') || lower.includes('clinically') || lower.includes('proven')) {
      classifications.suspicious.push(claim)
    }
  }

  return classifications
}

export default {
  detectGreenwashing,
  analyzeSentiment,
  classifyMarketingClaims
}
