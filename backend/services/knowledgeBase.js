import { logger } from '../utils/logger.js'

/**
 * Simple knowledge base for nutrition information
 * In production, this would be replaced with a proper vector database
 */
class NutritionKnowledgeBase {
  constructor() {
    this.nutritionGuidelines = this.initializeGuidelines()
    this.indianFoodData = this.initializeIndianFoods()
    this.healthConditions = this.initializeHealthConditions()
    this.fssaiStandards = this.initializeFSSAIStandards()
  }

  /**
   * Initialize WHO/ICMR nutrition guidelines for India
   */
  initializeGuidelines() {
    return {
      dailyValues: {
        energy: { adult_male: 2320, adult_female: 1900, unit: 'kcal' },
        protein: { adult_male: 54, adult_female: 46, unit: 'g' },
        fat: { max_percentage: 30, unit: '% of total energy' },
        saturated_fat: { max_percentage: 10, unit: '% of total energy' },
        sugar: { max_daily: 25, unit: 'g' },
        sodium: { max_daily: 2.3, unit: 'g' },
        fiber: { min_daily: 25, unit: 'g' }
      },
      foodClassification: {
        high_sugar: { threshold: 22.5, unit: 'g/100g', risk: 'high' },
        medium_sugar: { threshold: 15, unit: 'g/100g', risk: 'medium' },
        high_sodium: { threshold: 1.5, unit: 'g/100g', risk: 'high' },
        medium_sodium: { threshold: 0.6, unit: 'g/100g', risk: 'medium' },
        high_saturated_fat: { threshold: 5, unit: 'g/100g', risk: 'high' },
        high_fiber: { threshold: 6, unit: 'g/100g', benefit: 'high' }
      },
      indianSpecific: {
        commonDeficiencies: ['iron', 'vitamin_d', 'vitamin_b12', 'folate'],
        traditionalFoods: {
          staples: ['rice', 'wheat', 'dal', 'vegetables'],
          spices: ['turmeric', 'cumin', 'coriander', 'cardamom'],
          cookingMethods: ['tadka', 'dum', 'steaming', 'grilling']
        }
      }
    }
  }

  /**
   * Initialize Indian food database for comparisons
   */
  initializeIndianFoods() {
    return {
      staples: {
        rice: { energy: 345, protein: 6.8, carbs: 78, fiber: 0.4, category: 'staple' },
        wheat_flour: { energy: 348, protein: 11.8, carbs: 69, fiber: 11.2, category: 'staple' },
        dal_moong: { energy: 334, protein: 24.5, carbs: 56, fiber: 16.3, category: 'protein' }
      },
      snacks: {
        samosa: { energy: 308, protein: 3.5, carbs: 28, fat: 20, category: 'fried_snack' },
        dhokla: { energy: 160, protein: 6, carbs: 25, fat: 4, category: 'steamed_snack' },
        pakora: { energy: 360, protein: 6, carbs: 20, fat: 28, category: 'fried_snack' }
      },
      sweets: {
        gulab_jamun: { energy: 387, protein: 6, carbs: 52, fat: 17, sugar: 45, category: 'sweet' },
        rasgulla: { energy: 186, protein: 6, carbs: 40, fat: 1, sugar: 35, category: 'sweet' },
        laddu: { energy: 420, protein: 8, carbs: 58, fat: 18, sugar: 40, category: 'sweet' }
      },
      beverages: {
        chai: { energy: 70, protein: 2, carbs: 12, fat: 2, sugar: 8, category: 'beverage' },
        lassi: { energy: 89, protein: 3, carbs: 12, fat: 3, sugar: 12, category: 'beverage' }
      }
    }
  }

  /**
   * Initialize health condition specific guidance
   */
  initializeHealthConditions() {
    return {
      diabetes: {
        avoid: ['high_sugar', 'refined_carbs', 'high_gi_foods'],
        limits: { sugar: 5, carbs_percentage: 45 },
        recommendations: ['high_fiber', 'complex_carbs', 'protein'],
        indian_foods: {
          good: ['dal', 'vegetables', 'brown_rice', 'whole_wheat'],
          avoid: ['white_rice', 'refined_flour', 'sweets', 'sugary_drinks']
        }
      },
      hypertension: {
        avoid: ['high_sodium', 'processed_foods', 'pickles'],
        limits: { sodium: 1.5 },
        recommendations: ['potassium_rich', 'low_sodium', 'dash_diet'],
        indian_foods: {
          good: ['fresh_vegetables', 'fruits', 'unsalted_nuts'],
          avoid: ['namkeen', 'pickles', 'papad', 'processed_foods']
        }
      },
      heart_disease: {
        avoid: ['saturated_fat', 'trans_fat', 'cholesterol'],
        limits: { saturated_fat: 7, trans_fat: 0 },
        recommendations: ['omega3', 'fiber', 'antioxidants'],
        indian_foods: {
          good: ['mustard_oil', 'fish', 'almonds', 'oats'],
          avoid: ['ghee', 'butter', 'fried_foods', 'coconut_oil']
        }
      },
      obesity: {
        avoid: ['high_calorie', 'fried_foods', 'sugary_drinks'],
        limits: { calories: 'caloric_deficit', fat: 25 },
        recommendations: ['high_protein', 'high_fiber', 'low_calorie_density'],
        indian_foods: {
          good: ['grilled_foods', 'steamed_foods', 'salads', 'dal'],
          avoid: ['fried_snacks', 'sweets', 'heavy_gravies']
        }
      }
    }
  }

  /**
   * Initialize FSSAI standards and regulations
   */
  initializeFSSAIStandards() {
    return {
      labeling: {
        mandatory_info: ['ingredients', 'nutrition_facts', 'expiry_date', 'fssai_license'],
        allergen_declaration: ['gluten', 'milk', 'nuts', 'soy'],
        claims_regulation: {
          'sugar_free': { max_sugar: 0.5 },
          'low_fat': { max_fat: 3 },
          'high_fiber': { min_fiber: 6 },
          'no_trans_fat': { max_trans_fat: 0.2 }
        }
      },
      additives: {
        permitted: ['natural_colors', 'approved_preservatives'],
        restricted: ['artificial_colors', 'msg', 'artificial_sweeteners'],
        banned: ['trans_fat_oils', 'certain_food_colors']
      },
      fortification: {
        mandatory: ['iodized_salt', 'fortified_flour'],
        optional: ['vitamin_d_milk', 'iron_fortified_foods']
      }
    }
  }

  /**
   * Search knowledge base for relevant information
   */
  search(query, context = {}) {
    const results = []
    const queryLower = query.toLowerCase()

    // Search nutrition guidelines
    if (queryLower.includes('daily') || queryLower.includes('recommend') || queryLower.includes('guideline')) {
      results.push({
        type: 'guidelines',
        data: this.nutritionGuidelines,
        relevance: 0.9
      })
    }

    // Search health conditions
    const conditions = ['diabetes', 'hypertension', 'heart', 'obesity']
    for (const condition of conditions) {
      if (queryLower.includes(condition)) {
        results.push({
          type: 'health_condition',
          condition,
          data: this.healthConditions[condition],
          relevance: 0.95
        })
      }
    }

    // Search Indian foods for comparison
    if (queryLower.includes('compare') || queryLower.includes('similar') || queryLower.includes('indian')) {
      const relevantFoods = this.findSimilarIndianFoods(context.productInfo)
      if (relevantFoods.length > 0) {
        results.push({
          type: 'indian_foods',
          data: relevantFoods,
          relevance: 0.8
        })
      }
    }

    // Search FSSAI standards
    if (queryLower.includes('fssai') || queryLower.includes('standard') || queryLower.includes('regulation')) {
      results.push({
        type: 'fssai_standards',
        data: this.fssaiStandards,
        relevance: 0.85
      })
    }

    return results.sort((a, b) => b.relevance - a.relevance)
  }

  /**
   * Find similar Indian foods for comparison
   */
  findSimilarIndianFoods(productInfo) {
    if (!productInfo) return []

    const category = productInfo.category?.toLowerCase() || ''
    const name = productInfo.name?.toLowerCase() || ''
    const results = []

    // Match by category
    if (category.includes('biscuit') || category.includes('cookie') || name.includes('biscuit')) {
      results.push({
        name: 'Traditional Homemade Roti',
        nutrition: this.indianFoodData.staples.wheat_flour,
        comparison: 'Much healthier alternative with whole grain benefits'
      })
    }

    if (category.includes('snack') || name.includes('namkeen')) {
      results.push({
        name: 'Dhokla (Steamed Snack)',
        nutrition: this.indianFoodData.snacks.dhokla,
        comparison: 'Healthier steamed alternative to fried snacks'
      })
    }

    if (category.includes('sweet') || name.includes('sweet')) {
      results.push({
        name: 'Traditional Kheer (in moderation)',
        nutrition: { energy: 150, protein: 4, carbs: 25, fat: 4, sugar: 20 },
        comparison: 'Traditional sweet with milk protein and lower sugar'
      })
    }

    return results
  }

  /**
   * Get specific health advice for a condition
   */
  getHealthAdvice(condition, productInfo) {
    const conditionData = this.healthConditions[condition.toLowerCase()]
    if (!conditionData) return null

    const advice = {
      condition,
      recommendations: conditionData.recommendations,
      concerns: [],
      alternatives: []
    }

    // Check product against condition-specific limits
    if (productInfo.nutrition_facts) {
      const nutrition = productInfo.nutrition_facts

      if (condition.toLowerCase() === 'diabetes' && nutrition.sugar > 15) {
        advice.concerns.push(`High sugar content (${nutrition.sugar}g) can spike blood glucose`)
        advice.alternatives = conditionData.indian_foods.good
      }

      if (condition.toLowerCase() === 'hypertension' && nutrition.sodium > 0.6) {
        advice.concerns.push(`High sodium (${Math.round(nutrition.sodium * 1000)}mg) can raise blood pressure`)
        advice.alternatives = conditionData.indian_foods.good
      }
    }

    return advice
  }

  /**
   * Get nutrition comparison with Indian foods
   */
  getIndianFoodComparison(productInfo) {
    const comparisons = []

    if (productInfo.nutrition_facts) {
      const nutrition = productInfo.nutrition_facts

      // Compare with common Indian foods
      Object.entries(this.indianFoodData.sweets).forEach(([name, data]) => {
        if (Math.abs(nutrition.energy - data.energy) < 100) {
          comparisons.push({
            food: name.replace('_', ' '),
            similarity: 'Similar calorie content',
            nutrition: data
          })
        }
      })
    }

    return comparisons
  }

  /**
   * Get FSSAI compliance information
   */
  getFSSAICompliance(productInfo) {
    const compliance = {
      status: 'unknown',
      issues: [],
      requirements: []
    }

    // Check for mandatory labeling
    if (!productInfo.ingredients) {
      compliance.issues.push('Missing ingredient list (FSSAI mandatory)')
    }

    if (!productInfo.nutrition_facts) {
      compliance.issues.push('Missing nutrition facts (FSSAI mandatory)')
    }

    // Check claims
    const name = productInfo.name?.toLowerCase() || ''
    if (name.includes('sugar free') && productInfo.nutrition_facts?.sugar > 0.5) {
      compliance.issues.push('Sugar-free claim invalid - contains more than 0.5g sugar per 100g')
    }

    if (name.includes('low fat') && productInfo.nutrition_facts?.fat > 3) {
      compliance.issues.push('Low-fat claim invalid - contains more than 3g fat per 100g')
    }

    compliance.status = compliance.issues.length === 0 ? 'compliant' : 'non_compliant'
    return compliance
  }
}

// Export singleton instance
export const knowledgeBase = new NutritionKnowledgeBase()

export default knowledgeBase