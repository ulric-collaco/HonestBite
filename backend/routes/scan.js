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
    const t0 = Date.now()
    const { user_id, barcode, scan_type, ocr_text, nutrition_data } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    let productData = null
    let dataSource = 'unknown'

    // Get product data
    let tOFF = 0, tDB = 0, tScore = 0, tAlerts = 0, tGreen = 0, tAI = 0
    if (barcode) {
      // Try Open Food Facts first
      try {
        const t = Date.now()
        productData = await getProductByBarcode(barcode)
        tOFF = Date.now() - t
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
          const t = Date.now()
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
          tDB = Date.now() - t
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
      const bc = barcode || null
      return res.json({
        not_found: true,
        barcode: bc,
        message: `Product not found in Open Food Facts or local database. You can try scanning again in better light or enter the barcode manually. (Barcode: ${bc || 'N/A'})`
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

  // Calculate truth score (handle both legacy numeric and new object-with-breakdown forms)
  const tScoreStart = Date.now()
  const scoreResult = calculateTruthScore(productData, productData.nutrition_facts)
  const truthScore = typeof scoreResult === 'number' ? scoreResult : (scoreResult?.score ?? null)
  const truthScoreBreakdown = typeof scoreResult === 'object' ? (scoreResult.breakdown ? scoreResult.breakdown : scoreResult) : null
  tScore = Date.now() - tScoreStart

    // Generate health alerts
    const tAlertsStart = Date.now()
    const alerts = userData
      ? generateHealthAlerts(userData, productData, productData.nutrition_facts)
      : []
    tAlerts = Date.now() - tAlertsStart

    // Identify risk factors
  const riskFactors = identifyRiskFactors(productData, productData.nutrition_facts)

    // Detect greenwashing
    const tGreenStart = Date.now()
    const greenwashingFlags = await detectGreenwashing(
      `${productData.name} ${productData.brand} ${productData.ingredients}`
    )
    tGreen = Date.now() - tGreenStart

    // Save scan record
    const { data: scanData, error: scanError } = await supabase
      .from('scans')
      .insert([
        {
          user_id,
          product_name: productData.name,
          barcode: productData.barcode,
          truth_score: truthScore ?? 0,
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
      const tAIStart = Date.now()
      const aiResult = await Promise.race([
        aiResultPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('ai_timeout')), 7000))
      ])
      tAI = Date.now() - tAIStart

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
      truth_score: truthScore ?? 0,
      truth_score_breakdown: truthScoreBreakdown || null,
      alerts,
      risk_factors: riskFactors,
      greenwashing_flags: greenwashingFlags,
      data_source: dataSource,
      ai_insights: aiInsights
    })

  const totalMs = Date.now() - t0
  logger.info(`scan: user=${user_id} name="${productData.name}" score=${truthScore ?? 'n/a'} t_total=${totalMs}ms t_off=${tOFF}ms t_db=${tDB}ms t_score=${tScore}ms t_alerts=${tAlerts}ms t_green=${tGreen}ms t_ai=${tAI}ms`)
  } catch (error) {
    next(error)
  }
})

export default router
