import { logger } from '../utils/logger.js'
import { knowledgeBase } from './knowledgeBase.js'

// Note: We use Google Gemini via generateWithGemini; no OpenAI client is needed

/**
 * Enhanced OCR service with AI-powered text extraction and correction
 */
export class EnhancedOCRService {
  constructor() {
    this.supportedLanguages = ['english', 'hindi', 'tamil', 'bengali', 'gujarati', 'marathi']
    this.nutritionKeywords = this.initializeNutritionKeywords()
  }

  /**
   * Safely parse JSON from LLM output that may include extra text or code fences
   */
  parseJSONSafe(text) {
    if (!text) return null
    // Strip code fences if present
    let cleaned = text.trim()
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    // If still not valid JSON, try to extract the first JSON object
    try {
      return JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) {
        try { return JSON.parse(match[0]) } catch {}
      }
      return null
    }
  }

  /**
   * Initialize nutrition-related keywords in multiple Indian languages
   */
  initializeNutritionKeywords() {
    return {
      english: {
        energy: ['energy', 'calories', 'kcal', 'cal'],
        protein: ['protein', 'proteins'],
        carbohydrates: ['carbohydrates', 'carbs', 'total carbohydrates'],
        sugar: ['sugar', 'sugars', 'total sugars'],
        fat: ['fat', 'total fat', 'fats'],
        saturated_fat: ['saturated fat', 'saturated fats'],
        fiber: ['fiber', 'fibre', 'dietary fiber'],
        sodium: ['sodium', 'salt'],
        ingredients: ['ingredients', 'contains'],
        allergens: ['allergens', 'allergy information', 'contains']
      },
      hindi: {
        energy: ['ऊर्जा', 'कैलोरी'],
        protein: ['प्रोटीन', 'प्रतिजन'],
        carbohydrates: ['कार्बोहाइड्रेट'],
        sugar: ['चीनी', 'शक्कर'],
        fat: ['वसा', 'चर्बी'],
        fiber: ['फाइबर', 'रेशा'],
        sodium: ['नमक', 'सोडियम'],
        ingredients: ['सामग्री', 'घटक']
      }
    }
  }

  /**
   * Process OCR text with AI enhancement
   */
  async processOCRText(rawOCRText, imageBase64 = null, context = {}) {
    try {
      logger.info('Processing OCR text with AI enhancement')

      // Step 1: Clean and correct OCR errors (local)
      const correctedText = await this.correctOCRErrors(rawOCRText)

      // Step 2: Extract structured nutrition information (local)
      const nutritionData = await this.extractNutritionInfo(correctedText)

      // Step 3: Extract ingredients list (local)
      const ingredients = await this.extractIngredients(correctedText)

      // Step 4: Detect language and translate if needed (local dictionary)
      const languageInfo = await this.detectAndTranslate(correctedText)

      // Step 5: Validate and enhance data
      const enhancedData = await this.enhanceExtractedData({
        rawText: rawOCRText,
        correctedText,
        nutritionData,
        ingredients,
        languageInfo
      })

      return {
        success: true,
        originalText: rawOCRText,
        correctedText,
        extractedData: enhancedData,
        confidence: this.calculateExtractionConfidence(enhancedData),
        processingSteps: ['error_correction', 'nutrition_extraction', 'ingredient_extraction', 'language_detection', 'data_enhancement']
      }

    } catch (error) {
      logger.error('OCR processing error:', error)
      return {
        success: false,
        error: error.message,
        originalText: rawOCRText,
        fallbackData: this.getFallbackExtraction(rawOCRText)
      }
    }
  }

  /**
   * Correct OCR errors using AI
   */
  async correctOCRErrors(ocrText) {
    try {
      if (!ocrText || typeof ocrText !== 'string') return ''
      let text = ocrText
      // Normalize whitespace
      text = text.replace(/\u00A0/g, ' ').replace(/[\t ]+/g, ' ')
      // Fix common ligatures and OCR artifacts
      text = text
        .replace(/[‘’‚‛`´]/g, "'")
        .replace(/[“”„‟]/g, '"')
        .replace(/ﬁ/g, 'fi')
        .replace(/ﬂ/g, 'fl')
        .replace(/–|—/g, '-')
        .replace(/[·•]/g, '-')
      // Targeted nutrition term fixes (case-insensitive)
      const fixes = new Map([
        [/pr0tein/gi, 'protein'],
        [/proteln/gi, 'protein'],
        [/ener0y/gi, 'energy'],
        [/kca1/gi, 'kcal'],
        [/carbohydrat[cs]/gi, 'carbohydrates'],
        [/saturat(?:ed|cd)/gi, 'saturated'],
        [/ﬁbre/gi, 'fibre'],
        [/flbre/gi, 'fibre'],
        [/sugats|sugars?/gi, 'sugar'],
        [/s0dium/gi, 'sodium']
      ])
      fixes.forEach((val, key) => { text = text.replace(key, val) })
      // Insert missing spaces between letters and numbers (e.g., Protein10g → Protein 10 g)
      text = text.replace(/([A-Za-z])(?=\d)/g, '$1 ').replace(/(\d)(?=[A-Za-z])/g, '$1 ')
      // Normalize units spacing
      text = text.replace(/\s*(mg|g|kcal)\b/gi, ' $1')
      // Collapse multiple newlines
      text = text.replace(/\n{3,}/g, '\n\n')
      return text.trim()
    } catch (error) {
      logger.warn('OCR correction failed, using original text:', error)
      return ocrText
    }
  }

  /**
   * Extract nutrition information using AI
   */
  async extractNutritionInfo(text) {
    try {
      if (!text) return {}
      const clean = text.replace(/:,/g, ':').replace(/\s+/g, ' ')
      const grams = (n) => (typeof n === 'number' ? n : parseFloat(String(n).replace(',', '.')))

      // Helper to parse numeric with optional unit
      const parseWithUnit = (pattern) => {
        const m = clean.match(pattern)
        if (!m) return null
        const value = grams(m[2])
        const unit = (m[3] || '').toLowerCase()
        if (!isFinite(value)) return null
        if (unit === 'mg') return value / 1000
        return value
      }

      // Energy (prefer kcal)
      let energy = null
      const energyKcal = clean.match(/(?:energy|calories)\s*[:\-]?\s*([\d.,]+)\s*(kcal|cal)?/i)
      if (energyKcal) {
        energy = grams(energyKcal[1])
      }

      const nutrition = {
        energy: isFinite(energy) ? Number(energy) : null,
        protein: parseWithUnit(/(?:protein)[\s:]*([\d.,]+)\s*(mg|g)?/i) ?? null,
        carbohydrates: parseWithUnit(/(?:carbohydrates?|carbs?)[\s:]*([\d.,]+)\s*(mg|g)?/i) ?? null,
        sugar: parseWithUnit(/(?:sugars?|sugar)[\s:]*([\d.,]+)\s*(mg|g)?/i) ?? null,
        fat: parseWithUnit(/(?:total\s+)?fat[\s:]*([\d.,]+)\s*(mg|g)?/i) ?? null,
        saturated_fat: parseWithUnit(/(?:saturated(?:\s+fat)?)[\s:]*([\d.,]+)\s*(mg|g)?/i) ?? null,
        fiber: parseWithUnit(/(?:fi[bv]re|fibre|fiber|dietary\s+fiber)[\s:]*([\d.,]+)\s*(mg|g)?/i) ?? null,
        sodium: parseWithUnit(/(?:sodium|salt)[\s:]*([\d.,]+)\s*(mg|g)?/i) ?? null,
        serving_size: /per\s*100\s*(g|ml)/i.test(clean) ? 'per 100g' : null
      }

      // Fallback merge with regex fallback for any missing keys
      const fallback = this.fallbackNutritionExtraction(clean)
      for (const k of Object.keys(fallback)) {
        if (nutrition[k] == null && fallback[k] != null) nutrition[k] = fallback[k]
      }
      return nutrition
    } catch (error) {
      logger.warn('Nutrition extraction failed:', error)
      return this.fallbackNutritionExtraction(text)
    }
  }

  /**
   * Extract ingredients list using AI
   */
  async extractIngredients(text) {
    try {
      if (!text) return ''
      // Prefer the longest plausible ingredients section
      const lower = text.toLowerCase()
      const markers = ['ingredients:', 'contains:', 'composition:', 'सामग्री:', 'घटक:']
      let best = null
      for (const marker of markers) {
        const idx = lower.indexOf(marker)
        if (idx !== -1) {
          const after = text.substring(idx + marker.length)
          // Stop at next section header or max length
          const stopMatch = after.match(/\b(nutrition|nutritional|per\s*100|allergen|storage|manufactured|address|net\s*wt)\b/i)
          const end = stopMatch ? stopMatch.index : Math.min(after.length, 300)
          const candidate = after.substring(0, end).replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').trim()
          if (!best || candidate.length > best.length) best = candidate
        }
      }
      return best || this.fallbackIngredientExtraction(text) || ''
    } catch (error) {
      logger.warn('Ingredient extraction failed:', error)
      return this.fallbackIngredientExtraction(text)
    }
  }

  /**
   * Detect language and translate if needed
   */
  async detectAndTranslate(text) {
    try {
      // Simple language detection based on script
      const hasDevanagari = /[\u0900-\u097F]/.test(text)
      const hasTamil = /[\u0B80-\u0BFF]/.test(text)
      const hasBengali = /[\u0980-\u09FF]/.test(text)

      let detectedLanguage = 'english'
      if (hasDevanagari) detectedLanguage = 'hindi'
      else if (hasTamil) detectedLanguage = 'tamil'
      else if (hasBengali) detectedLanguage = 'bengali'

      // If non-English, translate key nutrition terms
      let translatedText = text
      if (detectedLanguage !== 'english') {
        translatedText = await this.translateNutritionTerms(text, detectedLanguage)
      }

      return {
        detectedLanguage,
        originalText: text,
        translatedText,
        confidence: detectedLanguage === 'english' ? 0.9 : 0.7
      }

    } catch (error) {
      logger.warn('Language detection failed:', error)
      return {
        detectedLanguage: 'english',
        originalText: text,
        translatedText: text,
        confidence: 0.5
      }
    }
  }

  /**
   * Translate nutrition terms to English
   */
  async translateNutritionTerms(text, fromLanguage) {
    try {
      if (!text) return ''
      let result = text
      const maps = {
        hindi: [
          [/ऊर्जा/gi, 'energy'],
          [/कैलोरी/gi, 'calories'],
          [/प्रोटीन/gi, 'protein'],
          [/कार्बोहाइड्रेट/gi, 'carbohydrates'],
          [/चीनी|शक्कर/gi, 'sugar'],
          [/वसा|चर्बी/gi, 'fat'],
          [/फाइबर|रेशा/gi, 'fiber'],
          [/सोडियम|नमक/gi, 'sodium'],
          [/सामग्री|घटक/gi, 'ingredients']
        ],
        tamil: [
          [/ஆற்றல்/gi, 'energy'],
          [/புரதம்/gi, 'protein'],
          [/கார்போஹைட்ரேட்டுகள்/gi, 'carbohydrates'],
          [/சர்க்கரை/gi, 'sugar'],
          [/கொழுப்பு/gi, 'fat'],
          [/நார்/gi, 'fiber'],
          [/சோடியம்/gi, 'sodium'],
          [/சேர்மங்கள்|பொருட்கள்/gi, 'ingredients']
        ],
        bengali: [
          [/শক্তি/gi, 'energy'],
          [/প্রোটিন/gi, 'protein'],
          [/কার্বোহাইড্রেট/gi, 'carbohydrates'],
          [/চিনি/gi, 'sugar'],
          [/চর্বি/gi, 'fat'],
          [/আঁশ/gi, 'fiber'],
          [/সোডিয়াম|লবণ/gi, 'sodium'],
          [/উপাদান/gi, 'ingredients']
        ]
      }
      const repl = maps[fromLanguage] || []
      for (const [pattern, english] of repl) {
        result = result.replace(pattern, english)
      }
      return result
    } catch (error) {
      logger.warn('Translation failed:', error)
      return text
    }
  }

  /**
   * Enhance extracted data with validation and knowledge base
   */
  async enhanceExtractedData(extractedInfo) {
    const enhanced = {
      ...extractedInfo,
      validationResults: {},
      knowledgeBaseSuggestions: []
    }

    // Validate nutrition values
    if (extractedInfo.nutritionData) {
      enhanced.validationResults = this.validateNutritionValues(extractedInfo.nutritionData)
    }

    // Get knowledge base insights
    if (extractedInfo.ingredients) {
      const kbResults = knowledgeBase.search(`ingredients ${extractedInfo.ingredients}`)
      enhanced.knowledgeBaseSuggestions = kbResults
    }

    // Estimate missing nutrition values
    if (extractedInfo.nutritionData && extractedInfo.ingredients) {
      enhanced.estimatedValues = this.estimateMissingNutrition(
        extractedInfo.nutritionData,
        extractedInfo.ingredients
      )
    }

    return enhanced
  }

  /**
   * Validate nutrition values for reasonableness
   */
  validateNutritionValues(nutrition) {
    const validation = {
      errors: [],
      warnings: [],
      valid: true
    }

    // Check for impossible values
    if (nutrition.energy && (nutrition.energy < 0 || nutrition.energy > 900)) {
      validation.errors.push(`Unrealistic energy value: ${nutrition.energy} kcal/100g`)
      validation.valid = false
    }

    if (nutrition.protein && nutrition.protein > 100) {
      validation.errors.push(`Protein cannot exceed 100g per 100g`)
      validation.valid = false
    }

    if (nutrition.sugar && nutrition.carbohydrates && nutrition.sugar > nutrition.carbohydrates) {
      validation.errors.push(`Sugar content cannot exceed total carbohydrates`)
      validation.valid = false
    }

    // Check for missing critical values
    if (!nutrition.energy) {
      validation.warnings.push('Missing energy/calorie information')
    }

    return validation
  }

  /**
   * Estimate missing nutrition values based on ingredients
   */
  estimateMissingNutrition(nutritionData, ingredients) {
    const estimates = {}

    if (!nutritionData.fiber && ingredients) {
      const fiberIngredients = ['whole wheat', 'oats', 'vegetables', 'fruits']
      const hasFiberIngredients = fiberIngredients.some(ing => 
        ingredients.toLowerCase().includes(ing)
      )
      
      if (hasFiberIngredients) {
        estimates.fiber = { value: 3, confidence: 'low', reason: 'Estimated from fiber-rich ingredients' }
      }
    }

    if (!nutritionData.sodium && ingredients.toLowerCase().includes('salt')) {
      estimates.sodium = { value: 0.8, confidence: 'low', reason: 'Estimated from salt presence in ingredients' }
    }

    return estimates
  }

  /**
   * Calculate confidence score for extraction
   */
  calculateExtractionConfidence(enhancedData) {
    let confidence = 0.5

    // Boost confidence for successful data extraction
    if (enhancedData.nutritionData && Object.keys(enhancedData.nutritionData).length > 3) {
      confidence += 0.2
    }

    if (enhancedData.ingredients && enhancedData.ingredients.length > 10) {
      confidence += 0.15
    }

    if (enhancedData.validationResults?.valid) {
      confidence += 0.15
    }

    // Reduce confidence for validation errors
    if (enhancedData.validationResults?.errors?.length > 0) {
      confidence -= 0.3
    }

    return Math.max(0.1, Math.min(1.0, confidence))
  }

  /**
   * Fallback nutrition extraction using regex
   */
  fallbackNutritionExtraction(text) {
    const nutrition = {}

    // Simple regex patterns for common nutrition facts
    const patterns = {
      energy: /(?:energy|calories?|kcal)[\s:]*(\d+(?:\.\d+)?)/i,
      protein: /protein[\s:]*(\d+(?:\.\d+)?)/i,
      carbohydrates: /(?:carbohydrates?|carbs?)[\s:]*(\d+(?:\.\d+)?)/i,
      sugar: /sugars?[\s:]*(\d+(?:\.\d+)?)/i,
      fat: /(?:total\s+)?fat[\s:]*(\d+(?:\.\d+)?)/i,
      fiber: /(?:dietary\s+)?fi[bv]re?[\s:]*(\d+(?:\.\d+)?)/i,
      sodium: /(?:sodium|salt)[\s:]*(\d+(?:\.\d+)?)/i
    }

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern)
      if (match) {
        nutrition[key] = parseFloat(match[1])
      }
    }

    return nutrition
  }

  /**
   * Fallback ingredient extraction using simple parsing
   */
  fallbackIngredientExtraction(text) {
    const ingredientMarkers = [
      'ingredients:',
      'contains:',
      'composition:',
      'सामग्री:',
      'घटक:'
    ]

    for (const marker of ingredientMarkers) {
      const index = text.toLowerCase().indexOf(marker)
      if (index !== -1) {
        // Extract text after the marker
        const afterMarker = text.substring(index + marker.length)
        // Take until next section or reasonable length
        const endIndex = Math.min(afterMarker.indexOf('\n\n'), 200)
        return afterMarker.substring(0, endIndex > 0 ? endIndex : 200).trim()
      }
    }

    return null
  }

  /**
   * Get fallback extraction when AI processing fails
   */
  getFallbackExtraction(text) {
    return {
      nutritionData: this.fallbackNutritionExtraction(text),
      ingredients: this.fallbackIngredientExtraction(text),
      confidence: 0.3,
      method: 'regex_fallback'
    }
  }

  /**
   * Process multiple OCR results and combine them
   */
  async combinePCRResults(ocrResults) {
    if (!ocrResults || ocrResults.length === 0) return null

    // If only one result, process it normally
    if (ocrResults.length === 1) {
      return this.processOCRText(ocrResults[0])
    }

    // Combine multiple OCR results for better accuracy
    const combinedText = ocrResults.join('\n')
    return this.processOCRText(combinedText, null, { multipleInputs: true })
  }
}

// Export singleton instance
export const enhancedOCR = new EnhancedOCRService()

export default enhancedOCR