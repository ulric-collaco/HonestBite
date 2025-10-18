import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { logger } from '../utils/logger.js'
import { detectBarcodesHF } from '../services/barcodeDetector.js'
import { decodeBarcodeWithZXing } from '../services/zxingDecode.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

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

// POST /api/barcode/extract
// Accepts multipart/form-data with field name 'image'
// Returns: { boxes: [{box:[x,y,w,h], score, label}], barcodes: [{text, box:[x,y,w,h], score}] }
router.post('/extract', upload.single('image'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No image uploaded. Use form field "image".' })
    }

    const imageBuffer = req.file.buffer

    // 1) Detect barcode boxes using Hugging Face
    let detections = []
    try {
      detections = await detectBarcodesHF(imageBuffer)
    } catch (e) {
      logger.error('HF detection error:', e)
      return res.status(502).json({ error: 'Barcode detection service unavailable', details: e.message })
    }

    // 2) For each detection, crop region and attempt to decode via ZXing
    const barcodes = []
    for (const det of detections) {
      const [x, y, w, h] = det.box
      if (w < 5 || h < 5) continue
      try {
        const cropBuf = await sharp(imageBuffer).extract({ left: Math.max(0, x), top: Math.max(0, y), width: Math.max(1, w), height: Math.max(1, h) })
          .toFormat('png')
          .toBuffer()
        // Try multiple scales to improve decoding robustness
        const scales = [1, 1.5, 2]
        let decoded = null
        for (const s of scales) {
          const scaled = s === 1 ? cropBuf : await sharp(cropBuf).resize({ width: Math.round(w * s), height: Math.round(h * s), fit: 'fill' }).toBuffer()
          decoded = await decodeBarcodeWithZXing(scaled)
          if (decoded) break
        }

        if (decoded) {
          // sanitize to digits when appropriate
          const clean = decoded.toString().trim()
          barcodes.push({ text: clean, box: det.box, score: det.score ?? 0.0 })
        }
      } catch (e) {
        logger.warn('Crop/decode error for box', det.box, e.message)
      }
    }

    // 3) Response
    return res.json({ boxes: detections, barcodes })
  } catch (error) {
    logger.error('extract-barcode endpoint error:', error)
    return res.status(500).json({ error: 'Failed to extract barcodes', details: error.message })
  }
})

export default router
