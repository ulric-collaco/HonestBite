import express from 'express'
import { db } from '../config/database.js'
import { getProductByBarcode } from '../services/openFoodFacts.js'
import { detectGreenwashing } from '../services/nlpService.js'
import { calculateTruthScore, generateHealthAlerts, identifyRiskFactors } from '../utils/truthScore.js'
import { nutritionAgent } from '../services/aiAgent.js'
import { logger } from '../utils/logger.js'

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
        const t = Date.now()
        const fssaiProduct = await db.single('SELECT * FROM fssai_products WHERE barcode = ?', [barcode])
        
        if (fssaiProduct) {
          const nutritionInfo = JSON.parse(fssaiProduct.nutrition_info || '{}')
          productData = {
            name: fssaiProduct.name,
            brand: fssaiProduct.brand,
            category: fssaiProduct.category,
            barcode: fssaiProduct.barcode,
            ingredients: nutritionInfo.ingredients || '',
            nutrition_facts: nutritionInfo.nutrition_facts || {},
            data_source: 'FSSAI Manual Database'
          }
          dataSource = 'FSSAI Manual Database'
          tDB = Date.now() - t
        }
      }

      // Store product in database if not exists (Upsert)
      if (productData) {
        await db.query(`
          INSERT INTO products (barcode, name, ingredients, nutrition_facts, data_source, last_updated)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(barcode) DO UPDATE SET
            name = excluded.name,
            ingredients = excluded.ingredients,
            nutrition_facts = excluded.nutrition_facts,
            last_updated = CURRENT_TIMESTAMP
        `, [
          productData.barcode,
          productData.name,
          productData.ingredients,
          JSON.stringify(productData.nutrition_facts),
          dataSource
        ])
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
    const user = await db.single('SELECT * FROM users WHERE user_id = ?', [user_id])
    const userData = user ? {
      ...user,
      health_conditions: JSON.parse(user.health_conditions || '[]'),
      allergies: JSON.parse(user.allergies || '[]')
    } : null

    if (!userData) {
      logger.warn('User not found, proceeding without profile:', user_id)
    }

    // Calculate truth score
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
    await db.query(
      'INSERT INTO scans (user_id, product_name, barcode, truth_score, risk_factors, scan_type) VALUES (?, ?, ?, ?, ?, ?)',
      [
        user_id,
        productData.name,
        productData.barcode,
        truthScore ?? 0,
        JSON.stringify(riskFactors),
        scan_type || 'barcode'
      ]
    )

    // Get the ID of the scan we just created
    const scanRow = await db.single('SELECT id FROM scans WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 1', [user_id])

    // Get AI agent analysis for enhanced insights
    let aiInsights = null
    try {
      const aiResult = await nutritionAgent.processQuery(
        user_id,
        `Please provide detailed analysis and personalized recommendations for this product.`,
        {
          productInfo: productData,
          userProfile: userData,
          requestType: 'scan_analysis'
        }
      )

      aiInsights = {
        analysis: aiResult.response,
        confidence: aiResult.confidence,
        session_id: aiResult.sessionId
      }
    } catch (aiError) {
      logger.warn('AI analysis skipped or timed out:', aiError.message)
    }

    // Return response
    res.json({
      scan_id: scanRow?.id,
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

