import express from 'express'
import { nutritionAgent } from '../services/aiAgent.js'
import { supabase } from '../config/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

/**
 * POST /api/agent/chat
 * Send a message to the AI nutrition agent
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { user_id, message, session_id, context = {} } = req.body

    if (!user_id || !message) {
      return res.status(400).json({ 
        error: 'user_id and message are required' 
      })
    }

    // Get user profile for context
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    // Get recent scan history for context
    const { data: scanHistory } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', user_id)
      .order('scanned_at', { ascending: false })
      .limit(5)

    // Build context for the agent
    const agentContext = {
      sessionId: session_id,
      userProfile,
      scanHistory,
      ...context
    }

    // Process the query with the AI agent
    const result = await nutritionAgent.processQuery(user_id, message, agentContext)

    // Log the interaction
    logger.info(`AI Agent interaction - User: ${user_id}, Tools: ${result.toolsUsed.join(', ')}`)

    res.json({
      response: result.response,
      session_id: result.sessionId,
      tools_used: result.toolsUsed,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/agent/analyze-product
 * Get AI analysis of a specific product
 */
router.post('/analyze-product', async (req, res, next) => {
  try {
    const { user_id, product_info, specific_question } = req.body

    if (!user_id || !product_info) {
      return res.status(400).json({ 
        error: 'user_id and product_info are required' 
      })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    const query = specific_question || 
      `Please analyze this product for my health profile and provide personalized recommendations.`

    const context = {
      productInfo: product_info,
      userProfile,
      requestType: 'product_analysis'
    }

    const result = await nutritionAgent.processQuery(user_id, query, context)

    res.json({
      analysis: result.response,
      product_name: product_info.name,
      session_id: result.sessionId,
      tools_used: result.toolsUsed,
      confidence: result.confidence
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/agent/research-unknown
 * Research a product that's not in the database
 */
router.post('/research-unknown', async (req, res, next) => {
  try {
    const { user_id, product_name, ingredients, ocr_text, barcode } = req.body

    if (!user_id || (!product_name && !ingredients && !ocr_text)) {
      return res.status(400).json({ 
        error: 'user_id and at least one of product_name, ingredients, or ocr_text is required' 
      })
    }

    const query = `I scanned a product that's not in your database. Please help me understand this product and its health impact.`

    const context = {
      productInfo: {
        name: product_name,
        ingredients,
        barcode,
        ocr_text
      },
      requestType: 'product_research'
    }

    // Get user profile for personalized advice
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (userProfile) {
      context.userProfile = userProfile
    }

    const result = await nutritionAgent.processQuery(user_id, query, context)

    res.json({
      research_result: result.response,
      session_id: result.sessionId,
      tools_used: result.toolsUsed,
      confidence: result.confidence,
      product_data: {
        name: product_name,
        ingredients,
        barcode
      }
    })

  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/agent/suggest-alternatives/:barcode
 * Get alternative product suggestions
 */
router.get('/suggest-alternatives/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ 
        error: 'user_id is required' 
      })
    }

    // Get the current product
    const { data: currentProduct } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (!currentProduct) {
      return res.status(404).json({ 
        error: 'Product not found' 
      })
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    const query = `Can you suggest healthier alternatives to this product that are available in Indian markets?`

    const context = {
      productInfo: currentProduct,
      userProfile,
      requestType: 'alternative_suggestions'
    }

    const result = await nutritionAgent.processQuery(user_id, query, context)

    res.json({
      current_product: currentProduct.name,
      suggestions: result.response,
      session_id: result.sessionId,
      confidence: result.confidence
    })

  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/agent/status
 * Get AI agent status and health
 */
router.get('/status', async (req, res, next) => {
  try {
    const status = nutritionAgent.getStatus()
    
    res.json({
      agent_status: status,
      api_health: 'active',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/agent/explain
 * Get detailed explanation of nutrition concepts
 */
router.post('/explain', async (req, res, next) => {
  try {
    const { user_id, topic, context_product, user_condition } = req.body

    if (!user_id || !topic) {
      return res.status(400).json({ 
        error: 'user_id and topic are required' 
      })
    }

    const query = `Can you explain ${topic} in simple terms with Indian context?`

    const context = {
      requestType: 'explanation',
      topic,
      contextProduct: context_product,
      userCondition: user_condition
    }

    const result = await nutritionAgent.processQuery(user_id, query, context)

    res.json({
      explanation: result.response,
      topic,
      session_id: result.sessionId,
      confidence: result.confidence
    })

  } catch (error) {
    next(error)
  }
})

export default router