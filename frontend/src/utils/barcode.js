import { BrowserMultiFormatReader } from '@zxing/browser'

/**
 * Scan barcode from image file
 * @param {File|Blob} imageFile - Image file containing barcode
 * @returns {Promise<string>} Barcode value
 */
export const scanBarcodeFromImage = async (imageFile) => {
  try {
    const reader = new BrowserMultiFormatReader()
    
    // Convert file to data URL
    const imageUrl = await fileToDataURL(imageFile)
    
    // Create image element
    const img = document.createElement('img')
    img.src = imageUrl
    
    await new Promise((resolve) => {
      img.onload = resolve
    })
    
    // Decode barcode
    const result = await reader.decodeFromImageElement(img)
    
    console.log('Barcode detected:', result.getText())
    return result.getText()
  } catch (error) {
    console.error('Barcode scanning error:', error)
    throw new Error('No barcode detected in image')
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
