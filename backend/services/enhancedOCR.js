import { OpenAI } from 'openai'
import { logger } from '../utils/logger.js'
import { knowledgeBase } from './knowledgeBase.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * Enhanced OCR service with AI-powered text extraction and correction
 */
export class EnhancedOCRService {
  constructor() {
    this.supportedLanguages = ['english', 'hindi', 'tamil', 'bengali', 'gujarati', 'marathi']
    this.nutritionKeywords = this.initializeNutritionKeywords()
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

      // Step 1: Clean and correct OCR errors
      const correctedText = await this.correctOCRErrors(rawOCRText)

      // Step 2: Extract structured nutrition information
      const nutritionData = await this.extractNutritionInfo(correctedText)

      // Step 3: Extract ingredients list
      const ingredients = await this.extractIngredients(correctedText)

      // Step 4: Detect language and translate if needed
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
      const prompt = `You are an OCR error correction specialist for Indian food product labels. 
      
Correct the following OCR text from a food label, fixing common errors while preserving the original meaning:

Common OCR errors to fix:
- "0" instead of "O" (e.g., "Pr0tein" → "Protein")
- "l" instead of "I" (e.g., "lngrédients" → "Ingredients")
- "rn" instead of "m" (e.g., "Vitarnin" → "Vitamin")
- Missing spaces between words
- Garbled nutrition values
- Mixed up numbers and letters

OCR Text:
"${ocrText}"

Return ONLY the corrected text, maintaining the original structure and format:`

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      })

      return response.choices[0].message.content.trim()

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
      const prompt = `Extract nutrition information from this Indian food product label text.
      
Text: "${text}"

Extract the following nutrition values per 100g (if per 100g info is not available, note the serving size):
- Energy (kcal)
- Protein (g)
- Carbohydrates (g)
- Sugar (g)
- Fat (g)
- Saturated Fat (g)
- Fiber (g)
- Sodium (g or mg)

Return ONLY a JSON object with the extracted values. Use null for missing values:
{"energy": 250, "protein": 5.2, "carbohydrates": 60, "sugar": 12, "fat": 8, "saturated_fat": 3, "fiber": 2, "sodium": 0.5, "serving_size": "per 100g"}`

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      })

      const jsonStr = response.choices[0].message.content.trim()
      return JSON.parse(jsonStr)

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
      const prompt = `Extract the ingredients list from this Indian food product label text.

Text: "${text}"

Find the ingredients section and return ONLY the ingredients list as a clean, comma-separated string. 
Remove any parenthetical information about allergens or processing aids.
If ingredients are in Hindi or other Indian languages, provide both original and English translation.

Example output: "Wheat flour, sugar, vegetable oil, salt, baking powder"`

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 400
      })

      return response.choices[0].message.content.trim()

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
      const prompt = `Translate only the nutrition-related terms from ${fromLanguage} to English in this food label text, keeping the rest intact:

"${text}"

Focus on translating: nutrition facts, ingredients, energy, protein, carbohydrates, sugar, fat, fiber, sodium, vitamins, minerals.
Keep numbers and measurements unchanged.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 800
      })

      return response.choices[0].message.content.trim()

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