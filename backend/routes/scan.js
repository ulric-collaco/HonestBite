import express from 'express'
import { supabase } from '../config/database.js'
import { getProductByBarcode } from '../services/openFoodFacts.js'
import { detectGreenwashing } from '../services/nlpService.js'
import { calculateTruthScore, generateHealthAlerts, identifyRiskFactors } from '../utils/truthScore.js'
import { nutritionAgent } from '../services/aiAgent.js'
import { logger } from '../utils/logger.js'
import { generateWithGeminiSafe } from '../services/gemini.js'

const router = express.Router()

router.post('/', async (req, res, next) => {
  try {
    const { user_id, barcode, scan_type, ocr_text, nutrition_data } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    let productData = null
    let dataSource = 'unknown'

    // Get product data
    if (barcode) {
      // Try Open Food Facts first
      try {
        productData = await getProductByBarcode(barcode)
        if (productData) {
          dataSource = 'Open Food Facts'
        }
      } catch (error) {
        logger.warn('Open Food Facts lookup failed:', error)
      }

      // Fallback to local FSSAI database
      if (!productData) {
        const { data, error } = await supabase
          .from('fssai_products')
          .select('*')
          .eq('barcode', barcode)
          .single()

        if (data && !error) {
          productData = {
            name: data.name,
            brand: data.brand,
            category: data.category,
            barcode: data.barcode,
            ingredients: data.nutrition_info?.ingredients || '',
            nutrition_facts: data.nutrition_info?.nutrition_facts || {},
            data_source: 'FSSAI Manual Database'
          }
          dataSource = 'FSSAI Manual Database'
        }
      }

      // Store product in database if not exists
      if (productData) {
        await supabase
          .from('products')
          .upsert([
            {
              barcode: productData.barcode,
              name: productData.name,
              ingredients: productData.ingredients,
              nutrition_facts: productData.nutrition_facts,
              data_source: dataSource
            }
          ])
          .select()
      }
    }

    // Handle OCR-based scans
    if (!productData && nutrition_data) {
      productData = {
        name: 'Product from Label Scan',
        brand: 'Unknown',
        category: 'Unknown',
        barcode: barcode || 'N/A',
        ingredients: ocr_text || '',
        nutrition_facts: nutrition_data,
        data_source: 'OCR Scan'
      }
      dataSource = 'OCR Scan'
    }

    if (!productData) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'Product not found in any database. Please try scanning the label or entering product details manually.'
      })
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (userError) {
      logger.warn('User not found, proceeding without profile:', user_id)
    }

    // Calculate truth score
    const truthScore = calculateTruthScore(productData, productData.nutrition_facts)

    // Generate health alerts
    const alerts = userData
      ? generateHealthAlerts(userData, productData, productData.nutrition_facts)
      : []

    // Identify risk factors
    const riskFactors = identifyRiskFactors(productData, productData.nutrition_facts)

    // Detect greenwashing
    const greenwashingFlags = await detectGreenwashing(
      `${productData.name} ${productData.brand} ${productData.ingredients}`
    )

    // Save scan record
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .insert([
        {
          user_id,
          product_name: productData.name,
          barcode: productData.barcode,
          truth_score: truthScore,
          risk_factors: riskFactors,
          scan_type: scan_type || 'barcode'
        }
      ])
      .select()
      .single()

    if (scanError) {
      logger.error('Error saving scan:', scanError)
    }

    // Get AI agent analysis for enhanced insights
    let aiInsights = null
    try {
      const aiResultPromise = nutritionAgent.processQuery(
        user_id,
        `Please provide detailed analysis and personalized recommendations for this product.`,
        {
          productInfo: productData,
          userProfile: userData,
          requestType: 'scan_analysis'
        }
      )

      // Enforce max wait for AI insights
      const aiResult = await Promise.race([
        aiResultPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('ai_timeout')), 7000))
      ])

      aiInsights = {
        analysis: aiResult.response,
        confidence: aiResult.confidence,
        session_id: aiResult.sessionId
      }
    } catch (aiError) {
      logger.warn('AI analysis skipped or timed out:', aiError.message)
      // Continue without AI insights
    }

    // Note: Consumption guidance is now generated via the Nutrition Assistant chat UI
    // to avoid delaying the scan result. The chat component will request it separately.

    // Return response
    res.json({
      scan_id: scanData?.id,
      product_info: productData,
      truth_score: truthScore,
      alerts,
      risk_factors: riskFactors,
      greenwashing_flags: greenwashingFlags,
      data_source: dataSource,
      ai_insights: aiInsights
    })

    logger.info(`Scan completed for user ${user_id}: ${productData.name} (Score: ${truthScore})`)
  } catch (error) {
    next(error)
  }
})

export default router
