import express from 'express'
import { logger } from '../utils/logger.js'

const router = express.Router()

// POST /api/barcode/decode
// Body: { image_base64: 'data:image/jpeg;base64,...' }
router.post('/decode', async (req, res, next) => {
  try {
    const { image_base64 } = req.body

    if (!image_base64 || typeof image_base64 !== 'string') {
      return res.status(400).json({ error: 'image_base64 is required' })
    }

    // LogMeal integration removed; we don't perform server-side decoding anymore.
    // Keep the endpoint to satisfy the frontend contract and return a neutral response quickly.
    const base64 = image_base64.includes(',') ? image_base64.split(',')[1] : image_base64
    if (!base64 || base64.length < 20) {
      return res.json({ barcode: null, provider: 'none', detected: false })
    }

    // Optionally: future place to plug a local decoder
    res.json({ barcode: null, provider: 'none', detected: false })
  } catch (error) {
    logger.error('Barcode decode endpoint error:', error)
    // Return graceful failure so client can proceed with local decode fallback
    res.status(200).json({ barcode: null, provider: 'none', detected: false, error: 'decode_failed' })
  }
})

export default router
