import express from 'express'
import { enhancedOCR } from '../services/enhancedOCR.js'
import { nutritionAgent } from '../services/aiAgent.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * POST /api/ocr/process
 * Process OCR text with AI enhancement
 */
router.post('/process', async (req, res, next) => {
  try {
    const { ocr_text, image_base64, user_id, context = {} } = req.body

    if (!ocr_text) {
      return res.status(400).json({ 
        error: 'ocr_text is required' 
      })
    }

    logger.info(`Processing OCR text for user: ${user_id}`)

    // Process OCR text with AI enhancement
    const result = await enhancedOCR.processOCRText(ocr_text, image_base64, context)

    if (!result.success) {
      return res.status(422).json({
        error: 'OCR processing failed',
        details: result.error,
        fallback_data: result.fallbackData
      })
    }

    // If we have good nutrition data, get AI analysis
    let aiAnalysis = null
    if (result.extractedData.nutritionData && user_id) {
      try {
        const analysisResult = await nutritionAgent.processQuery(
          user_id,
          'Please analyze this nutrition information extracted from a product label and provide health insights.',
          {
            productInfo: {
              name: 'Product from Label Scan',
              nutrition_facts: result.extractedData.nutritionData,
              ingredients: result.extractedData.ingredients
            },
            requestType: 'ocr_analysis'
          }
        )

        aiAnalysis = {
          insights: analysisResult.response,
          confidence: analysisResult.confidence,
          session_id: analysisResult.sessionId
        }
      } catch (aiError) {
        logger.warn('AI analysis failed for OCR result:', aiError)
      }
    }

    res.json({
      success: true,
      original_text: result.originalText,
      corrected_text: result.correctedText,
      extracted_data: result.extractedData,
      confidence: result.confidence,
      processing_steps: result.processingSteps,
      ai_analysis: aiAnalysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/ocr/extract-nutrition
 * Extract nutrition facts from OCR text
 */
router.post('/extract-nutrition', async (req, res, next) => {
  try {
    const { ocr_text } = req.body

    if (!ocr_text) {
      return res.status(400).json({ 
        error: 'ocr_text is required' 
      })
    }

    // Extract nutrition information only
    const nutritionData = await enhancedOCR.extractNutritionInfo(ocr_text)
    const validation = enhancedOCR.validateNutritionValues(nutritionData)

    res.json({
      nutrition_facts: nutritionData,
      validation: validation,
      confidence: validation.valid ? 0.8 : 0.4,
      extracted_from: 'ocr_text'
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/ocr/extract-ingredients
 * Extract ingredients from OCR text
 */
router.post('/extract-ingredients', async (req, res, next) => {
  try {
    const { ocr_text } = req.body

    if (!ocr_text) {
      return res.status(400).json({ 
        error: 'ocr_text is required' 
      })
    }

    // Extract ingredients only
    const ingredients = await enhancedOCR.extractIngredients(ocr_text)

    res.json({
      ingredients,
      confidence: ingredients && ingredients.length > 10 ? 0.8 : 0.5,
      extracted_from: 'ocr_text'
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/ocr/correct-text
 * Correct OCR errors in text
 */
router.post('/correct-text', async (req, res, next) => {
  try {
    const { ocr_text } = req.body

    if (!ocr_text) {
      return res.status(400).json({ 
        error: 'ocr_text is required' 
      })
    }

    // Correct OCR errors only
    const correctedText = await enhancedOCR.correctOCRErrors(ocr_text)

    res.json({
      original_text: ocr_text,
      corrected_text: correctedText,
      improvements: correctedText.length !== ocr_text.length || correctedText !== ocr_text,
      confidence: 0.85
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/ocr/translate
 * Translate non-English nutrition terms
 */
router.post('/translate', async (req, res, next) => {
  try {
    const { text, from_language = 'auto' } = req.body

    if (!text) {
      return res.status(400).json({ 
        error: 'text is required' 
      })
    }

    // Detect language and translate if needed
    const languageInfo = await enhancedOCR.detectAndTranslate(text)

    res.json({
      detected_language: languageInfo.detectedLanguage,
      original_text: languageInfo.originalText,
      translated_text: languageInfo.translatedText,
      confidence: languageInfo.confidence,
      translation_needed: languageInfo.detectedLanguage !== 'english'
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/ocr/combine-results
 * Combine multiple OCR results for better accuracy
 */
router.post('/combine-results', async (req, res, next) => {
  try {
    const { ocr_results, user_id } = req.body

    if (!ocr_results || !Array.isArray(ocr_results) || ocr_results.length === 0) {
      return res.status(400).json({ 
        error: 'ocr_results array is required' 
      })
    }

    // Combine multiple OCR results
    const result = await enhancedOCR.combinePCRResults(ocr_results)

    if (!result || !result.success) {
      return res.status(422).json({
        error: 'Failed to combine OCR results',
        details: result?.error
      })
    }

    res.json({
      combined_result: result,
      input_count: ocr_results.length,
      confidence: result.confidence,
      method: 'multi_ocr_combination'
    })

  } catch (error) {
    next(error)
  }
})

export default router