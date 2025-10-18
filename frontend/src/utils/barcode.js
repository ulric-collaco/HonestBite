import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { preprocessImage } from './ocr'
import Quagga from 'quagga'
import Tesseract from 'tesseract.js'

/**
 * Scan barcode from image file
 * @param {File|Blob} imageFile - Image file containing barcode
 * @returns {Promise<string>} Barcode value
 */
export const scanBarcodeFromImage = async (imageFile, options = {}) => {
  try {
    // 0) If we can detect a bounding box, crop ROI first to avoid digits outside the barcode
    const img = await fileToImage(imageFile)
    const roiCanvases = await detectRoiCanvases(img)

    // 1) Try Quagga first (good at 1D barcodes like EAN/UPC) on ROIs then full image
    try {
      // Try each ROI with Quagga
      for (const roi of roiCanvases) {
        const qRoi = await quaggaDecodeCanvas(roi)
        if (qRoi) {
          console.log('Barcode detected via Quagga (ROI):', qRoi)
          return qRoi
        }
      }
      const q = await quaggaDecodeImage(imageFile)
      if (q) {
        console.log('Barcode detected via Quagga:', q)
        return q
      }
    } catch (e) {
      // proceed to ZXing pipeline
    }
    const reader = new BrowserMultiFormatReader()
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.ALSO_INVERTED, true)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF
    ])
    reader.hints = hints

    // Prepare canvases with different scales, rotations, crops and preprocess variants
  const attempts = [] // array of { canvas, label }

    const scales = [600, 1000, 1400, 2000]

    const pushVariants = (sourceCanvas, baseLabel = 'base') => {
      attempts.push({ canvas: sourceCanvas, label: `${baseLabel}@0` })
      attempts.push({ canvas: rotateCanvas(sourceCanvas, 90), label: `${baseLabel}@90` })
      attempts.push({ canvas: rotateCanvas(sourceCanvas, 180), label: `${baseLabel}@180` })
      attempts.push({ canvas: rotateCanvas(sourceCanvas, 270), label: `${baseLabel}@270` })
      // Add central crops (horizontal and vertical bands) to reduce noise
      const hBand = cropCenterBand(sourceCanvas, 'horizontal', 0.5)
      const vBand = cropCenterBand(sourceCanvas, 'vertical', 0.5)
      attempts.push({ canvas: hBand, label: `${baseLabel}@hband` })
      attempts.push({ canvas: vBand, label: `${baseLabel}@vband` })
    }

    // ROI canvases get highest priority across scales
    for (const [idx, roi] of roiCanvases.entries()) {
      const scaledRoi = drawScaled(roi, 1600)
      pushVariants(scaledRoi, `roi-${idx}`)
      const contrastRoi = toHighContrast(scaledRoi)
      pushVariants(contrastRoi, `roi-contrast-${idx}`)
    }

    for (const s of scales) {
      const base = drawScaled(img, s)
      pushVariants(base, `base-${s}`)
      const contrast = toHighContrast(base)
      pushVariants(contrast, `contrast-${s}`)
    }

    // OCR-oriented preprocess (costly): only do the largest size once
    try {
      const preprocessedUrl = await preprocessImage(imageFile)
      const preImg = await dataUrlToImage(preprocessedUrl)
      const ocrCanvas = drawScaled(preImg, 1600)
      pushVariants(ocrCanvas, 'ocr-1600')
    } catch (_) {
      // ignore preprocess failures
    }

    // Try decode across all attempts
    let lastError = null
    const diag = { attempts: [], success: null, engine: null }
    for (const { canvas, label } of attempts) {
      try {
        const res = await reader.decodeFromCanvas(canvas)
        if (res && res.getText) {
          const text = res.getText()
          if (options.diagnostics) {
            diag.success = { label }
            diag.engine = 'ZXing'
            window.__HB_SCAN_DIAGNOSTICS = diag
            console.log('[ScanDiagnostics] Success via ZXing:', { label, text })
          }
          console.log('Barcode detected:', text)
          return text
        }
      } catch (err) {
        lastError = err
        if (options.diagnostics) diag.attempts.push({ label, error: err?.name || 'fail' })
      }
    }

  // If ZXing failed, try BarcodeDetector API as a last resort (Chrome/Edge)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']
        })
        // Use the largest base variant for detection
        const largest = drawScaled(img, 2000)
        const bitmap = await createImageBitmap(largest)
        const detections = await detector.detect(bitmap)
        if (detections && detections.length > 0) {
          const raw = detections[0].rawValue
          if (raw) {
            if (options.diagnostics) {
              diag.success = { label: 'BarcodeDetector' }
              diag.engine = 'BarcodeDetector'
              window.__HB_SCAN_DIAGNOSTICS = diag
              console.log('[ScanDiagnostics] Success via BarcodeDetector:', raw)
            }
            console.log('Barcode detected via BarcodeDetector:', raw)
            return raw
          }
        }
      } catch (bdErr) {
        lastError = bdErr
        if (options.diagnostics) diag.attempts.push({ label: 'BarcodeDetector', error: bdErr?.name || 'fail' })
      }
    }

    // 3) OCR digits fallback on ROIs then full image (last resort)
    for (const roi of roiCanvases) {
      const digits = await ocrDigitsFromCanvas(roi)
      const candidate = findValidBarcodeInString(digits)
      if (candidate) {
        console.log('Barcode detected via OCR(ROI):', candidate)
        return candidate
      }
    }
    const digitsFull = await ocrDigitsFromFile(imageFile)
    const candidateFull = findValidBarcodeInString(digitsFull)
    if (candidateFull) {
      console.log('Barcode detected via OCR(Full):', candidateFull)
      return candidateFull
    }

    // If everything failed
    throw lastError || new Error('No barcode detected in image')
  } catch (error) {
    console.error('Barcode scanning error:', error)
    throw new Error('No barcode detected in image')
  }
}

/**
 * Decode barcode directly from a canvas (e.g., a cropped ROI)
 */
export const scanBarcodeFromCanvas = async (canvas, options = {}) => {
  // Try Quagga on canvas
  try {
    const q = await quaggaDecodeCanvas(canvas)
    if (q) return q
  } catch {}

  // ZXing attempts on canvas
  const reader = new BrowserMultiFormatReader()
  const hints = new Map()
  hints.set(DecodeHintType.TRY_HARDER, true)
  hints.set(DecodeHintType.ALSO_INVERTED, true)
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF
  ])
  reader.hints = hints

  const attempts = []
  const pushVariants = (source, baseLabel) => {
    attempts.push({ canvas: source, label: `${baseLabel}@0` })
    attempts.push({ canvas: rotateCanvas(source, 90), label: `${baseLabel}@90` })
    attempts.push({ canvas: rotateCanvas(source, 180), label: `${baseLabel}@180` })
    attempts.push({ canvas: rotateCanvas(source, 270), label: `${baseLabel}@270` })
    attempts.push({ canvas: cropCenterBand(source, 'horizontal', 0.6), label: `${baseLabel}@hband` })
    attempts.push({ canvas: cropCenterBand(source, 'vertical', 0.6), label: `${baseLabel}@vband` })
  }

  pushVariants(canvas, 'roi-base')
  pushVariants(toHighContrast(canvas), 'roi-contrast')

  for (const { canvas: c } of attempts) {
    try {
      const res = await reader.decodeFromCanvas(c)
      if (res?.getText) return res.getText()
    } catch {}
  }

  // BarcodeDetector on canvas
  if ('BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']
      })
      const bitmap = await createImageBitmap(canvas)
      const detections = await detector.detect(bitmap)
      if (detections?.length) {
        const raw = detections[0].rawValue
        if (raw) return raw
      }
    } catch {}
  }

  // OCR fallback
  const digits = await ocrDigitsFromCanvas(canvas)
  const candidate = findValidBarcodeInString(digits)
  if (candidate) return candidate

  throw new Error('No barcode detected in ROI')
}

/**
 * Public helper: normalize arbitrary raw string to a valid barcode if possible
 */
export const normalizeAndValidateBarcode = (raw) => {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  return findValidBarcodeInString(digits)
}

/**
 * Try Quagga decodeSingle on an image file
 */
const quaggaDecodeImage = (imageFile) => {
  return new Promise(async (resolve, reject) => {
    try {
      const dataUrl = await fileToDataURL(imageFile)
      Quagga.decodeSingle({
        src: dataUrl,
        numOfWorkers: 0, // required in browser without web worker bundling
        inputStream: {
          size: 1600
        },
        decoder: {
          readers: [
            'ean_reader',
            'ean_8_reader',
            'upc_reader',
            'upc_e_reader',
            'code_128_reader',
            'code_39_reader',
            'i2of5_reader'
          ]
        },
        locate: true
      }, (result) => {
        if (result && result.codeResult && result.codeResult.code) {
          resolve(result.codeResult.code)
        } else {
          resolve(null)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Use Quagga on a prepared canvas ROI
 */
const quaggaDecodeCanvas = async (canvas) => {
  const dataUrl = canvas.toDataURL('image/png')
  return new Promise((resolve) => {
    Quagga.decodeSingle({
      src: dataUrl,
      numOfWorkers: 0,
      inputStream: { size: 800 },
      decoder: {
        readers: [
          'ean_reader',
          'ean_8_reader',
          'upc_reader',
          'upc_e_reader',
          'code_128_reader',
          'code_39_reader',
          'i2of5_reader'
        ]
      },
      locate: true
    }, (result) => {
      if (result && result.codeResult && result.codeResult.code) {
        resolve(result.codeResult.code)
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Detect barcode regions via BarcodeDetector and return cropped canvases
 */
const detectRoiCanvases = async (img) => {
  const rois = []
  if (!('BarcodeDetector' in window)) return rois
  try {
    const detector = new window.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']
    })

    const base = drawScaled(img, 2000)
    const bitmap = await createImageBitmap(base)
    const detections = await detector.detect(bitmap)
    if (!detections || detections.length === 0) return rois

    for (const d of detections) {
      const { boundingBox } = d
      if (!boundingBox) continue
      // Expand box slightly to ensure full bars captured
      const pad = 12
      const x = Math.max(0, Math.floor(boundingBox.x - pad))
      const y = Math.max(0, Math.floor(boundingBox.y - pad))
      const w = Math.min(base.width - x, Math.ceil(boundingBox.width + pad * 2))
      const h = Math.min(base.height - y, Math.ceil(boundingBox.height + pad * 2))

      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(base, x, y, w, h, 0, 0, w, h)
      rois.push(c)
    }
  } catch (_) {
    // ignore detector failures
  }
  return rois
}

// =====================
// Validation & OCR Utils
// =====================

const findValidBarcodeInString = (digits) => {
  if (!digits) return null
  // Try EAN-13 windows
  const win = (len, validator) => {
    for (let i = 0; i + len <= digits.length; i++) {
      const sub = digits.slice(i, i + len)
      if (validator(sub)) return sub
    }
    return null
  }

  let sub = win(13, isValidEAN13)
  if (sub) return sub
  sub = win(12, isValidUPCA)
  if (sub) return sub
  sub = win(8, isValidEAN8)
  if (sub) return sub

  // Heuristic: sometimes a 14-digit includes leading 0 + EAN-13
  if (digits.length >= 14) {
    sub = win(14, (s) => isValidEAN13(s.slice(1)))
    if (sub) return sub.slice(1)
  }
  return null
}

const isValidEAN13 = (code) => {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits[12]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === check
}

const isValidUPCA = (code) => {
  if (!/^\d{12}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const check = digits[11]
  let sumOdd = 0, sumEven = 0
  for (let i = 0; i < 11; i++) {
    if (i % 2 === 0) sumOdd += digits[i] // positions 1,3,5... from left
    else sumEven += digits[i]
  }
  const calc = (10 - ((sumOdd * 3 + sumEven) % 10)) % 10
  return calc === check
}

const isValidEAN8 = (code) => {
  if (!/^\d{8}$/.test(code)) return false
  const d = code.split('').map(Number)
  const check = d[7]
  const calc = (10 - ((3 * (d[0] + d[2] + d[4] + d[6]) + (d[1] + d[3] + d[5])) % 10)) % 10
  return calc === check
}

const ocrDigitsFromCanvas = async (canvas) => {
  try {
    const res = await Tesseract.recognize(canvas.toDataURL('image/png'), 'eng', {
      tessedit_char_whitelist: '0123456789',
      preserve_interword_spaces: 0,
      classify_bln_numeric_mode: 1
    })
    return (res?.data?.text || '').replace(/\D/g, '')
  } catch {
    return ''
  }
}

const ocrDigitsFromFile = async (file) => {
  try {
    const dataUrl = await fileToDataURL(file)
    const res = await Tesseract.recognize(dataUrl, 'eng', {
      tessedit_char_whitelist: '0123456789',
      preserve_interword_spaces: 0,
      classify_bln_numeric_mode: 1
    })
    return (res?.data?.text || '').replace(/\D/g, '')
  } catch {
    return ''
  }
}

/**
 * Scan barcode from video stream
 * @param {HTMLVideoElement} videoElement - Video element with camera stream
 * @returns {Promise<string>} Barcode value
 */
export const scanBarcodeFromVideo = (videoElement) => {
  return new Promise((resolve, reject) => {
    const reader = new BrowserMultiFormatReader()
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39
    ])
    reader.hints = hints
    
    const timeout = setTimeout(() => {
      reader.reset()
      reject(new Error('Barcode scan timeout'))
    }, 15000) // 15 second timeout
    
    reader.decodeFromVideoElement(videoElement, (result, error) => {
      if (result) {
        clearTimeout(timeout)
        reader.reset()
        console.log('Barcode detected:', result.getText())
        resolve(result.getText())
      }
      
      if (error && error.name !== 'NotFoundException') {
        clearTimeout(timeout)
        reader.reset()
        reject(error)
      }
    })
  })
}

/**
 * Validate barcode format
 * @param {string} barcode - Barcode string to validate
 * @returns {boolean} True if valid barcode
 */
export const isValidBarcode = (barcode) => {
  if (!barcode || typeof barcode !== 'string') {
    return false
  }
  
  // Remove any whitespace
  const cleanBarcode = barcode.trim()
  
  // Common barcode formats:
  // EAN-13: 13 digits
  // EAN-8: 8 digits
  // UPC-A: 12 digits
  // UPC-E: 6 or 8 digits
  const validLengths = [6, 8, 12, 13, 14]
  
  // Check if only digits
  if (!/^\d+$/.test(cleanBarcode)) {
    return false
  }
  
  // Check length
  return validLengths.includes(cleanBarcode.length)
}

/**
 * Format barcode for display
 * @param {string} barcode - Raw barcode string
 * @returns {string} Formatted barcode
 */
export const formatBarcode = (barcode) => {
  if (!barcode) return ''
  
  const clean = barcode.trim()
  
  // Format based on length
  if (clean.length === 13) {
    // EAN-13: 1-234567-890123
    return `${clean.slice(0, 1)}-${clean.slice(1, 7)}-${clean.slice(7)}`
  } else if (clean.length === 12) {
    // UPC-A: 123456-789012
    return `${clean.slice(0, 6)}-${clean.slice(6)}`
  }
  
  return clean
}

/**
 * Convert File/Blob to data URL
 * @param {File|Blob} file - File to convert
 * @returns {Promise<string>} Data URL
 */
const fileToDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Load a File/Blob into an HTMLImageElement
 */
const fileToImage = async (file) => {
  const url = await fileToDataURL(file)
  return dataUrlToImage(url)
}

const dataUrlToImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Draw image to canvas with max dimension constraint
 */
const drawScaled = (img, maxDim = 1600) => {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

/**
 * Rotate a canvas by degrees
 */
const rotateCanvas = (sourceCanvas, degrees) => {
  const radians = (degrees * Math.PI) / 180
  const s = Math.sin(radians)
  const c = Math.cos(radians)
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const newW = Math.abs(w * c) + Math.abs(h * s)
  const newH = Math.abs(w * s) + Math.abs(h * c)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(newW)
  canvas.height = Math.round(newH)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(radians)
  ctx.drawImage(sourceCanvas, -w / 2, -h / 2)
  return canvas
}

/**
 * Convert canvas to high-contrast grayscale to help ZXing
 */
const toHighContrast = (sourceCanvas) => {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(sourceCanvas, 0, 0)
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data
  // Simple grayscale + slight contrast bump + optional threshold
  const contrast = 1.3
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    let v = (r + g + b) / 3
    v = factor * (v - 128) + 128
    data[i] = data[i + 1] = data[i + 2] = v
  }
  ctx.putImageData(imgData, 0, 0)
  return canvas
}

/**
 * Crop a central horizontal or vertical band from the canvas
 * mode: 'horizontal' | 'vertical'
 * ratio: portion of height/width to keep (0-1)
 */
const cropCenterBand = (sourceCanvas, mode = 'horizontal', ratio = 0.5) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const r = Math.min(1, Math.max(0.1, ratio))

  if (mode === 'vertical') {
    const bandW = Math.round(w * r)
    const x = Math.round((w - bandW) / 2)
    canvas.width = bandW
    canvas.height = h
    ctx.drawImage(sourceCanvas, x, 0, bandW, h, 0, 0, bandW, h)
  } else {
    const bandH = Math.round(h * r)
    const y = Math.round((h - bandH) / 2)
    canvas.width = w
    canvas.height = bandH
    ctx.drawImage(sourceCanvas, 0, y, w, bandH, 0, 0, w, bandH)
  }

  return canvas
}

/**
 * Get supported barcode formats
 * @returns {Array<string>} List of supported formats
 */
export const getSupportedFormats = () => {
  return [
    'EAN-13',
    'EAN-8',
    'UPC-A',
    'UPC-E',
    'Code 128',
    'Code 39',
    'ITF',
    'QR Code'
  ]
}
