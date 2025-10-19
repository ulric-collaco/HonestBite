// Switched from OpenAI to Google Gemini
import { generateWithGemini } from './gemini.js'
import { logger } from '../utils/logger.js'
import { knowledgeBase } from './knowledgeBase.js'
import { getProductByBarcode } from './openFoodFacts.js'
import { supabase } from '../config/database.js'
import { randomUUID } from 'node:crypto'


export class NutritionAgent {
  constructor() {
    this.memory = new Map() // Simple in-memory storage for conversation context
    this.tools = new Map() // Available tools for the agent
    this.systemPrompt = this.buildSystemPrompt()
    
    // Initialize available tools
    this.initializeTools()
  }

  /**
   * Build the system prompt for the nutrition agent
   */
  buildSystemPrompt() {
    return `You are an intelligent nutrition assistant for HonestBite, a food transparency platform focused on Indian consumers. Your role is to:

CORE RESPONSIBILITIES:
1. Analyze food products for health impact using Indian dietary context
2. Provide personalized nutrition advice based on user health conditions
3. Research unknown products using ingredient analysis
4. Suggest healthier alternatives available in Indian markets
5. Explain nutrition concepts in simple, culturally relevant terms

INDIAN CONTEXT KNOWLEDGE:
- Traditional Indian foods and ingredients (dal, roti, rice, spices)
- Common cooking methods (tadka, dum, tandoor)
- Regional dietary preferences (North/South Indian, Bengali, Punjabi, etc.)
- Festival foods and their nutritional impact
- Ayurvedic principles and modern nutrition science
- FSSAI regulations and Indian food standards

COMMUNICATION STYLE:
- Use simple Hindi/English mix when appropriate
- Reference familiar Indian foods for comparisons
- Be empathetic about cultural food attachments
- Provide practical, actionable advice for Indian households
- Consider economic constraints of average Indian families

HEALTH CONDITIONS EXPERTISE:
- Diabetes (very common in India)
- Hypertension 
- Heart disease
- Obesity
- Kidney disease
- Celiac disease
- Lactose intolerance

SAFETY RULES:
- Never provide medical diagnoses
- Always recommend consulting doctors for serious health issues
- Be conservative with health claims
- Clearly distinguish between nutrition advice and medical advice

You have access to tools to research products, analyze nutrition data, and query databases. Use them wisely to provide comprehensive, accurate responses.
Dont send the response in markdown send it in normal properly formated text`
  }

  /**
   * Initialize available tools for the agent
   */
  initializeTools() {
    this.tools.set('analyze_nutrition', {
      name: 'analyze_nutrition',
      description: 'Analyze nutrition facts and calculate health impact',
      parameters: {
        type: 'object',
        properties: {
          nutrition_facts: { type: 'object' },
          user_health_profile: { type: 'object' },
          product_info: { type: 'object' }
        }
      }
    })

    this.tools.set('research_product', {
      name: 'research_product',
      description: 'Research unknown products by ingredients or name',
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string' },
          ingredients: { type: 'string' },
          ocr_text: { type: 'string' }
        }
      }
    })

    this.tools.set('suggest_alternatives', {
      name: 'suggest_alternatives',
      description: 'Suggest healthier alternative products',
      parameters: {
        type: 'object',
        properties: {
          current_product: { type: 'object' },
          user_health_conditions: { type: 'array' },
          budget_range: { type: 'string' }
        }
      }
    })

    this.tools.set('explain_health_impact', {
      name: 'explain_health_impact',
      description: 'Explain health impact in simple terms with Indian context',
      parameters: {
        type: 'object',
        properties: {
          nutrition_concern: { type: 'string' },
          user_condition: { type: 'string' },
          comparison_food: { type: 'string' }
        }
      }
    })
  }

  /**
   * Process a user query with context
   */
  async processQuery(userId, query, context = {}) {
    try {
      const sessionId = context.sessionId || randomUUID()
      
      // Build conversation context
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.getConversationHistory(userId, sessionId),
        { role: 'user', content: this.buildUserMessage(query, context) }
      ]

      // Build a structured prompt to emulate tool usage with Gemini
      const toolCatalog = Array.from(this.tools.values()).map(t => ({ name: t.name, description: t.description }))
      const toolEmulationPrompt = `You can conceptually use these tools: ${JSON.stringify(toolCatalog)}.
If detailed nutrition analysis is needed, ask yourself to run analyze_nutrition using provided productInfo, nutrition_facts, and userProfile and include the results.
If product is unknown, emulate research_product and suggest_alternatives as needed.
Always answer as HonestBite assistant with Indian context.`

      const composed = [
        ...messages.map(m => `${m.role.toUpperCase()}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`),
        `ASSISTANT_INSTRUCTIONS: ${toolEmulationPrompt}`
      ].join('\n\n')

      const finalMessage = await generateWithGemini(composed)

      // Store conversation in memory
      this.storeConversation(userId, sessionId, query, finalMessage, context)
      
      return {
        response: finalMessage,
        sessionId,
        toolsUsed: [],
        confidence: this.calculateConfidence(finalMessage, context)
      }

    } catch (error) {
      logger.error('AI Agent processing error:', error)
      throw new Error('Unable to process query at the moment')
    }
  }

  /**
   * Build user message with context
   */
  buildUserMessage(query, context) {
    let message = query

    if (context.productInfo) {
      message += `\n\nProduct Context: ${JSON.stringify(context.productInfo, null, 2)}`
    }

    if (context.userProfile) {
      message += `\n\nUser Health Profile: ${JSON.stringify(context.userProfile, null, 2)}`
    }

    if (context.scanHistory) {
      message += `\n\nRecent Scans: ${JSON.stringify(context.scanHistory.slice(-3), null, 2)}`
    }

    return message
  }

  /**
   * Execute tool calls
   */
  async executeTools(toolCalls, context) {
    const toolResults = []

    for (const toolCall of toolCalls) {
      try {
        const result = await this.executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments), context)
        
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        })
      } catch (error) {
        logger.error(`Tool execution error (${toolCall.function.name}):`, error)
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: 'Tool execution failed' })
        })
      }
    }

    return toolResults
  }

  /**
   * Execute individual tool
   */
  async executeTool(toolName, args, context) {
    switch (toolName) {
      case 'analyze_nutrition':
        return this.analyzeNutrition(args, context)
      case 'research_product':
        return this.researchProduct(args, context)
      case 'suggest_alternatives':
        return this.suggestAlternatives(args, context)
      case 'explain_health_impact':
        return this.explainHealthImpact(args, context)
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }

  /**
   * Tool: Analyze nutrition facts
   */
  async analyzeNutrition(args, context) {
    const { nutrition_facts, user_health_profile, product_info } = args
    
    // Get relevant knowledge from knowledge base
    const knowledgeResults = knowledgeBase.search('nutrition analysis guidelines', context)
    
    // Get health-specific advice if user has conditions
    let healthAdvice = []
    if (user_health_profile?.health_conditions) {
      for (const condition of user_health_profile.health_conditions) {
        const advice = knowledgeBase.getHealthAdvice(condition, product_info)
        if (advice) healthAdvice.push(advice)
      }
    }

    // Get Indian food comparisons
    const indianComparisons = knowledgeBase.getIndianFoodComparison(product_info)
    
    // Get FSSAI compliance info
    const fssaiCompliance = knowledgeBase.getFSSAICompliance(product_info)

    return {
      analysis: {
        nutrition_assessment: this.assessNutritionValues(nutrition_facts),
        health_impact: healthAdvice,
        indian_comparisons: indianComparisons,
        fssai_compliance: fssaiCompliance,
        knowledge_sources: knowledgeResults.map(r => r.type)
      },
      recommendations: this.generateNutritionRecommendations(nutrition_facts, user_health_profile),
      warnings: this.generateNutritionWarnings(nutrition_facts, user_health_profile)
    }
  }

  /**
   * Tool: Research unknown products
   */
  async researchProduct(args, context) {
    const { product_name, ingredients, ocr_text } = args
    
    try {
      // Try to find similar products in Open Food Facts
      let similarProducts = []
      if (product_name) {
        // This would use OpenFoodFacts search API
        // For now, we'll simulate the research
        similarProducts = await this.searchSimilarProducts(product_name)
      }

      // Analyze ingredients if available
      let ingredientAnalysis = null
      if (ingredients || ocr_text) {
        ingredientAnalysis = this.analyzeIngredients(ingredients || ocr_text)
      }

      // Get knowledge base insights
      const knowledgeResults = knowledgeBase.search(`research ${product_name} ingredients`, context)

      return {
        productData: {
          name: product_name,
          estimated_nutrition: this.estimateNutritionFromIngredients(ingredients || ocr_text),
          ingredient_analysis: ingredientAnalysis,
          similar_products: similarProducts
        },
        confidence: similarProducts.length > 0 ? 0.7 : 0.4,
        sources: ['ingredient_analysis', 'knowledge_base', ...knowledgeResults.map(r => r.type)],
        research_notes: 'Product researched using ingredient analysis and similar product matching'
      }
    } catch (error) {
      logger.error('Product research error:', error)
      throw error
    }
  }

  /**
   * Tool: Suggest alternatives
   */
  async suggestAlternatives(args, context) {
    const { current_product, user_health_conditions, budget_range } = args
    
    try {
      // Query database for healthier alternatives
      const { data: alternatives } = await supabase
        .from('products')
        .select('*')
        .neq('barcode', current_product.barcode || '')
        .order('truth_score', { ascending: false })
        .limit(5)

      // Get Indian food alternatives from knowledge base
      const indianAlternatives = knowledgeBase.findSimilarIndianFoods(current_product)

      // Filter alternatives based on health conditions
      const healthRelevantAlternatives = this.filterAlternativesByHealth(
        alternatives || [],
        user_health_conditions
      )

      return {
        alternatives: healthRelevantAlternatives,
        indian_alternatives: indianAlternatives,
        reasoning: this.explainAlternativeChoices(current_product, healthRelevantAlternatives),
        availability: 'Available in most Indian supermarkets and online stores'
      }
    } catch (error) {
      logger.error('Alternative suggestion error:', error)
      return {
        alternatives: [],
        indian_alternatives: knowledgeBase.findSimilarIndianFoods(current_product),
        reasoning: 'Unable to query database for alternatives',
        availability: 'Check local stores for similar healthier products'
      }
    }
  }

  /**
   * Tool: Explain health impact
   */
  async explainHealthImpact(args, context) {
    const { nutrition_concern, user_condition, comparison_food } = args
    
    // Get specific health condition info from knowledge base
    const healthInfo = user_condition ? 
      knowledgeBase.getHealthAdvice(user_condition, context.productInfo) : null

    // Get Indian food comparison
    const indianComparison = comparison_food ?
      knowledgeBase.getIndianFoodComparison({ name: comparison_food }) : null

    return {
      explanation: this.generateHealthExplanation(nutrition_concern, user_condition),
      comparison: indianComparison || this.getDefaultIndianComparison(nutrition_concern),
      actionable_advice: this.generateActionableAdvice(nutrition_concern, user_condition),
      cultural_context: this.addIndianCulturalContext(nutrition_concern)
    }
  }

  /**
   * Get conversation history for context
   */
  getConversationHistory(userId, sessionId) {
    const key = `${userId}:${sessionId}`
    return this.memory.get(key) || []
  }

  /**
   * Store conversation in memory
   */
  storeConversation(userId, sessionId, query, response, context) {
    const key = `${userId}:${sessionId}`
    const history = this.memory.get(key) || []
    
    history.push(
      { role: 'user', content: query },
      { role: 'assistant', content: response }
    )

    // Keep only last 10 messages to manage memory
    if (history.length > 10) {
      history.splice(0, history.length - 10)
    }

    this.memory.set(key, history)
  }

  /**
   * Calculate confidence score for response
   */
  calculateConfidence(response, context) {
    // Simple confidence calculation based on available context
    let confidence = 0.5 // Base confidence
    
    if (context.productInfo) confidence += 0.2
    if (context.userProfile) confidence += 0.15
    if (context.scanHistory) confidence += 0.1
    if (response.length > 100) confidence += 0.05
    
    return Math.min(confidence, 1.0)
  }

  /**
   * Helper: Assess nutrition values against guidelines
   */
  assessNutritionValues(nutritionFacts) {
    const guidelines = knowledgeBase.nutritionGuidelines.foodClassification
    const assessment = {}

    if (nutritionFacts.sugar > guidelines.high_sugar.threshold) {
      assessment.sugar = { level: 'high', concern: 'May cause blood sugar spikes' }
    } else if (nutritionFacts.sugar > guidelines.medium_sugar.threshold) {
      assessment.sugar = { level: 'medium', concern: 'Moderate sugar content' }
    }

    if (nutritionFacts.sodium > guidelines.high_sodium.threshold) {
      assessment.sodium = { level: 'high', concern: 'May contribute to high blood pressure' }
    } else if (nutritionFacts.sodium > guidelines.medium_sodium.threshold) {
      assessment.sodium = { level: 'medium', concern: 'Moderate sodium content' }
    }

    if (nutritionFacts.fiber > guidelines.high_fiber.threshold) {
      assessment.fiber = { level: 'high', benefit: 'Good for digestion and blood sugar control' }
    }

    return assessment
  }

  /**
   * Helper: Generate nutrition recommendations
   */
  generateNutritionRecommendations(nutritionFacts, userProfile) {
    const recommendations = []

    if (nutritionFacts.fiber < 3) {
      recommendations.push('Consider adding more fiber-rich foods like vegetables and whole grains')
    }

    if (nutritionFacts.protein > 0 && nutritionFacts.protein < 10) {
      recommendations.push('Pair with protein-rich foods like dal or paneer for balanced nutrition')
    }

    if (userProfile?.health_conditions?.includes('Diabetes') && nutritionFacts.sugar > 10) {
      recommendations.push('Consider smaller portions or seek sugar-free alternatives')
    }

    return recommendations
  }

  /**
   * Helper: Generate nutrition warnings
   */
  generateNutritionWarnings(nutritionFacts, userProfile) {
    const warnings = []

    if (nutritionFacts.sugar > 25) {
      warnings.push('Very high sugar content - may cause rapid blood sugar spike')
    }

    if (nutritionFacts.sodium > 1.5) {
      warnings.push('Very high sodium - exceeds recommended daily limit in small serving')
    }

    if (userProfile?.health_conditions?.includes('Heart Disease') && nutritionFacts.saturated_fat > 5) {
      warnings.push('High saturated fat content may not be suitable for heart conditions')
    }

    return warnings
  }

  /**
   * Helper: Search for similar products
   */
  async searchSimilarProducts(productName) {
    try {
      // This would use OpenFoodFacts search API
      // For now, return mock data
      return [
        {
          name: `Similar to ${productName}`,
          confidence: 0.8,
          source: 'OpenFoodFacts'
        }
      ]
    } catch (error) {
      return []
    }
  }

  /**
   * Helper: Analyze ingredients text
   */
  analyzeIngredients(ingredientsText) {
    if (!ingredientsText) return null

    const text = ingredientsText.toLowerCase()
    const analysis = {
      concerns: [],
      positives: [],
      allergens: []
    }

    // Check for concerning ingredients
    if (text.includes('high fructose corn syrup') || text.includes('corn syrup')) {
      analysis.concerns.push('Contains high fructose corn syrup (linked to obesity)')
    }

    if (text.includes('trans fat') || text.includes('partially hydrogenated')) {
      analysis.concerns.push('Contains trans fats (harmful to heart health)')
    }

    if (text.includes('msg') || text.includes('monosodium glutamate')) {
      analysis.concerns.push('Contains MSG (may cause sensitivity in some people)')
    }

    // Check for positive ingredients
    if (text.includes('whole grain') || text.includes('whole wheat')) {
      analysis.positives.push('Contains whole grains (good source of fiber)')
    }

    if (text.includes('vitamin') || text.includes('mineral')) {
      analysis.positives.push('Fortified with vitamins/minerals')
    }

    // Check for common allergens
    const allergens = ['milk', 'wheat', 'soy', 'nuts', 'eggs']
    for (const allergen of allergens) {
      if (text.includes(allergen)) {
        analysis.allergens.push(allergen)
      }
    }

    return analysis
  }

  /**
   * Helper: Estimate nutrition from ingredients
   */
  estimateNutritionFromIngredients(ingredients) {
    if (!ingredients) return null

    // Simple estimation based on common ingredients
    const text = ingredients.toLowerCase()
    let estimatedNutrition = {
      energy: 300, // Default estimate
      protein: 5,
      carbohydrates: 50,
      fat: 10,
      confidence: 'low'
    }

    if (text.includes('sugar') || text.includes('glucose') || text.includes('fructose')) {
      estimatedNutrition.energy += 100
      estimatedNutrition.carbohydrates += 20
    }

    if (text.includes('oil') || text.includes('fat') || text.includes('butter')) {
      estimatedNutrition.energy += 150
      estimatedNutrition.fat += 15
    }

    if (text.includes('flour') || text.includes('wheat') || text.includes('rice')) {
      estimatedNutrition.carbohydrates += 30
    }

    return estimatedNutrition
  }

  /**
   * Helper: Filter alternatives by health conditions
   */
  filterAlternativesByHealth(alternatives, healthConditions) {
    if (!healthConditions || !alternatives) return alternatives

    return alternatives.filter(product => {
      if (healthConditions.includes('Diabetes') && 
          product.nutrition_facts?.sugar > 15) {
        return false
      }

      if (healthConditions.includes('Hypertension') && 
          product.nutrition_facts?.sodium > 1.0) {
        return false
      }

      return true
    })
  }

  /**
   * Helper: Explain alternative choices
   */
  explainAlternativeChoices(currentProduct, alternatives) {
    if (!alternatives || alternatives.length === 0) {
      return 'No suitable alternatives found in database'
    }

    return `These alternatives have better nutrition profiles: lower sugar, sodium, or higher fiber content compared to ${currentProduct.name}`
  }

  /**
   * Helper: Generate health explanation
   */
  generateHealthExplanation(concern, condition) {
    const explanations = {
      'high_sugar': {
        general: 'High sugar can cause rapid blood glucose spikes and contribute to weight gain',
        diabetes: 'High sugar is particularly concerning for diabetes as it can cause dangerous blood sugar spikes'
      },
      'high_sodium': {
        general: 'High sodium can contribute to high blood pressure and water retention',
        hypertension: 'High sodium can worsen high blood pressure and increase cardiovascular risk'
      }
    }

    return explanations[concern]?.[condition] || explanations[concern]?.general || 'General health concern identified'
  }

  /**
   * Helper: Get default Indian comparison
   */
  getDefaultIndianComparison(concern) {
    const comparisons = {
      'high_sugar': 'This product has more sugar than 2-3 gulab jamuns',
      'high_sodium': 'This product has more salt than a serving of pickle',
      'high_fat': 'This product has more fat than a handful of cashews'
    }

    return comparisons[concern] || 'Compare with traditional Indian foods for better context'
  }

  /**
   * Helper: Generate actionable advice
   */
  generateActionableAdvice(concern, condition) {
    const advice = {
      'high_sugar': 'Consider having smaller portions or choosing sugar-free alternatives',
      'high_sodium': 'Drink extra water and avoid adding salt to other foods today',
      'high_fat': 'Balance with low-fat foods and increase physical activity'
    }

    return advice[concern] || 'Monitor portion sizes and balance with healthier foods'
  }

  /**
   * Helper: Add Indian cultural context
   */
  addIndianCulturalContext(concern) {
    const contexts = {
      'high_sugar': 'In Indian tradition, sweets are for special occasions. Consider this product as an occasional treat rather than daily consumption.',
      'high_sodium': 'Traditional Indian cooking uses spices for flavor instead of excessive salt. Try adding turmeric, cumin, or coriander for taste.',
      'high_fat': 'Traditional Indian cooking methods like steaming (idli) and grilling (tandoor) are healthier than deep frying.'
    }

    return contexts[concern] || 'Traditional Indian diet emphasizes balance and moderation'
  }

  /**
   * Get agent status and health
   */
  getStatus() {
    return {
      status: 'active',
      conversationsActive: this.memory.size,
      toolsAvailable: this.tools.size,
      lastActivity: new Date().toISOString()
    }
  }
}

// Export singleton instance
export const nutritionAgent = new NutritionAgent()

export default nutritionAgent