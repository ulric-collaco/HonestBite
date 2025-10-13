import Tesseract from 'tesseract.js'

/**
 * Extract text from an image using Tesseract.js OCR
 * @param {File|Blob|string} image - Image file, blob, or data URL
 * @returns {Promise<string>} Extracted text
 */
export const extractTextFromImage = async (image) => {
  try {
    console.log('Starting OCR processing...')
    
    const result = await Tesseract.recognize(
      image,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        }
      }
    )
    
    console.log('OCR completed successfully')
    return result.data.text
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error('Failed to extract text from image')
  }
}

/**
 * Parse nutrition information from OCR text
 * @param {string} text - Raw OCR text
 * @returns {Object} Parsed nutrition data
 */
export const parseNutritionInfo = (text) => {
  const nutritionData = {
    calories: null,
    protein: null,
    carbohydrates: null,
    sugar: null,
    fat: null,
    sodium: null,
    fiber: null
  }

  // Common patterns for nutrition facts
  const patterns = {
    calories: /(?:calories|energy)[:\s]+(\d+(?:\.\d+)?)/i,
    protein: /protein[:\s]+(\d+(?:\.\d+)?)/i,
    carbohydrates: /(?:carbohydrate|carbs)[:\s]+(\d+(?:\.\d+)?)/i,
    sugar: /sugar[s]?[:\s]+(\d+(?:\.\d+)?)/i,
    fat: /(?:total\s+)?fat[:\s]+(\d+(?:\.\d+)?)/i,
    sodium: /sodium[:\s]+(\d+(?:\.\d+)?)/i,
    fiber: /(?:dietary\s+)?fiber[:\s]+(\d+(?:\.\d+)?)/i
  }

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern)
    if (match && match[1]) {
      nutritionData[key] = parseFloat(match[1])
    }
  }

  return nutritionData
}

/**
 * Extract ingredients list from OCR text
 * @param {string} text - Raw OCR text
 * @returns {Array<string>} List of ingredients
 */
export const parseIngredients = (text) => {
  // Look for "Ingredients:" section
  const ingredientsMatch = text.match(/ingredients[:\s]+([^.]+)/i)
  
  if (!ingredientsMatch) {
    return []
  }

  const ingredientsText = ingredientsMatch[1]
  
  // Split by commas and clean up
  const ingredients = ingredientsText
    .split(',')
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 2)

  return ingredients
}

/**
 * Preprocess image for better OCR results
 * @param {File} imageFile - Image file to preprocess
 * @returns {Promise<string>} Preprocessed image as data URL
 */
export const preprocessImage = async (imageFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Set canvas size to image size
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw image
        ctx.drawImage(img, 0, 0)
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Simple contrast enhancement
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          
          // Increase contrast
          const contrast = 1.5
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
          const newValue = factor * (avg - 128) + 128
          
          data[i] = newValue     // Red
          data[i + 1] = newValue // Green
          data[i + 2] = newValue // Blue
        }
        
        ctx.putImageData(imageData, 0, 0)
        
        resolve(canvas.toDataURL('image/png'))
      }
      
      img.onerror = reject
      img.src = e.target.result
    }
    
    reader.onerror = reject
    reader.readAsDataURL(imageFile)
  })
}
