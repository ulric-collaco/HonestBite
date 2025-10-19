import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { logger } from '../utils/logger.js'
import { detectBarcodesHF } from '../services/barcodeDetector.js'
import { decodeBarcodeWithZXing } from '../services/zxingDecode.js'

const router = express.Router()

// Upload constraints: 6MB max, common image MIME types only
const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimes.has(file.mimetype)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Unsupported file type'))
    }
    cb(null, true)
  }
})

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

    // Deprecated: placeholder for legacy client fallback; consider removal
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
router.post('/extract', (req, res, next) => {
  // Wrap multer so we can customize error responses
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Image too large. Please upload an image under 6MB.' })
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(415).json({ error: 'Unsupported image type. Please upload a JPG, PNG, or WebP file.' })
      }
      return res.status(400).json({ error: 'Invalid upload', details: err.message })
    } else if (err) {
      return res.status(415).json({ error: 'Unsupported image type. Please upload a JPG, PNG, or WebP file.' })
    }
    return extractHandler(req, res, next)
  })
})

async function extractHandler(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No image uploaded. Use form field "image".' })
    }

    const imageBuffer = req.file.buffer
    const startedAt = Date.now()

    // 1) Detect barcode boxes using Hugging Face
    let detections = []
    const tDetectStart = Date.now()
    try {
      detections = await detectBarcodesHF(imageBuffer)
    } catch (e) {
      logger.error('HF detection error:', e)
      return res.status(502).json({ error: 'Barcode detection service unavailable', details: e.message })
    }
    const tDetectMs = Date.now() - tDetectStart

    // 2) For each detection, crop region and attempt to decode via ZXing
    const barcodes = []
    const tDecodeStart = Date.now()
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
    const tDecodeMs = Date.now() - tDecodeStart
    const totalMs = Date.now() - startedAt
    logger.info(`extract: detections=${detections.length}, decoded=${barcodes.length}, t_detect=${tDetectMs}ms, t_decode=${tDecodeMs}ms, total=${totalMs}ms`)

    // 3) Response
    return res.json({ boxes: detections, barcodes })
  } catch (error) {
    logger.error('extract-barcode endpoint error:', error)
    return res.status(500).json({ error: 'Failed to extract barcodes', details: error.message })
  }
}

export default router
