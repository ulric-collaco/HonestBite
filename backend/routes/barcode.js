import express from 'express'
import { logger } from '../utils/logger.js'
import { decodeBarcodeWithLogMeal } from '../services/logmeal.js'

const router = express.Router()

// POST /api/barcode/decode
// Body: { image_base64: 'data:image/jpeg;base64,...' }
router.post('/decode', async (req, res, next) => {
  try {
    const { image_base64 } = req.body

    if (!image_base64 || typeof image_base64 !== 'string') {
      return res.status(400).json({ error: 'image_base64 is required' })
    }

    const base64 = image_base64.includes(',') ? image_base64.split(',')[1] : image_base64
    const buffer = Buffer.from(base64, 'base64')

    const barcode = await decodeBarcodeWithLogMeal(buffer)

    if (!barcode) {
      return res.status(404).json({ error: 'No barcode detected by LogMeal' })
    }

    res.json({ barcode })
  } catch (error) {
    logger.error('LogMeal barcode decode failed:', error)
    next(error)
  }
})

export default router
