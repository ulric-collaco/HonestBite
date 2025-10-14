import fetch from 'node-fetch'
import FormData from 'form-data'
import { logger } from '../utils/logger.js'

const LOGMEAL_API_KEY = process.env.LOGMEAL_API_KEY || ''
const LOGMEAL_BARCODE_URL = 'https://api.logmeal.es/v2/barcode/scan'

/**
 * Decode barcode using LogMeal Barcode Scanner API
 * @param {Buffer} imageBuffer - Binary image buffer
 * @returns {Promise<string|null>} Decoded barcode or null
 */
export const decodeBarcodeWithLogMeal = async (imageBuffer) => {
  if (!LOGMEAL_API_KEY) {
    logger.warn('LOGMEAL_API_KEY not set; skipping LogMeal barcode decoding')
    return null
  }

  try {
    const form = new FormData()
    form.append('image', imageBuffer, { filename: 'barcode.jpg', contentType: 'image/jpeg' })

    const response = await fetch(LOGMEAL_BARCODE_URL, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${LOGMEAL_API_KEY}`
      },
      body: form
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`LogMeal API error ${response.status}: ${text}`)
    }

    const data = await response.json()
    // Attempt to normalize possible responses
    const barcode = data?.barcode || data?.code || data?.result?.[0]?.code || null
    return barcode || null
  } catch (error) {
    logger.error('Error calling LogMeal API:', error)
    return null
  }
}

export default { decodeBarcodeWithLogMeal }
