import { logger } from '../utils/logger.js'

/**
 * Calculate truth score for a product (1-10 scale)
 * @param {Object} product - Product data
 * @param {Object} nutritionFacts - Nutrition facts per 100g
 * @returns {number} Truth score (1-10)
 */
export const calculateTruthScore = (product, nutritionFacts) => {
  let score = 10 // Start with perfect score

  // Sugar content scoring (per 100g)
  const sugar = nutritionFacts?.sugar || 0
  if (sugar > 22.5) score -= 3       // High sugar (>22.5g)
  else if (sugar > 15) score -= 2    // Medium-high sugar (15-22.5g)
  else if (sugar > 5) score -= 1     // Medium sugar (5-15g)

  // Sodium content scoring (per 100g, in grams)
  const sodium = nutritionFacts?.sodium || 0
  if (sodium > 1.5) score -= 3        // High sodium (>1500mg)
  else if (sodium > 0.6) score -= 2   // Medium-high sodium (600-1500mg)
  else if (sodium > 0.3) score -= 1   // Medium sodium (300-600mg)

  // Saturated fat scoring (per 100g)
  const saturatedFat = nutritionFacts?.saturated_fat || 0
  if (saturatedFat > 5) score -= 2    // High saturated fat (>5g)
  else if (saturatedFat > 1.5) score -= 1  // Medium saturated fat (1.5-5g)

  // Artificial additives scoring
  const additives = product?.additives || []
  if (additives.length > 5) score -= 2
  else if (additives.length > 2) score -= 1

  // Fiber bonus (positive score)
  const fiber = nutritionFacts?.fiber || 0
  if (fiber > 6) score += 1           // High fiber bonus

  // Ensure score is between 1 and 10
  score = Math.max(1, Math.min(10, score))

  return Math.round(score)
}

/**
 * Generate health alerts based on user profile and product
 * @param {Object} userProfile - User health conditions and allergies
 * @param {Object} product - Product data
 * @param {Object} nutritionFacts - Nutrition facts
 * @returns {Array} List of alerts
 */
export const generateHealthAlerts = (userProfile, product, nutritionFacts) => {
  const alerts = []

  // Check for allergens
  if (userProfile.allergies && product.allergens) {
    for (const allergy of userProfile.allergies) {
      const allergyLower = allergy.toLowerCase()
      const productAllergens = product.allergens.join(' ').toLowerCase()
      const ingredients = (product.ingredients || '').toLowerCase()

      if (productAllergens.includes(allergyLower) || ingredients.includes(allergyLower)) {
        alerts.push({
          severity: 'high',
          message: `🚨 CONTAINS ${allergy.toUpperCase()} - Unsafe for your allergy profile`,
          category: 'allergy'
        })
      }
    }
  }

  // Health condition-specific alerts
  if (userProfile.health_conditions) {
    const conditions = userProfile.health_conditions

    // Diabetes alerts
    if (conditions.includes('Diabetes') && nutritionFacts.sugar > 15) {
      alerts.push({
        severity: conditions.includes('Diabetes') && nutritionFacts.sugar > 22.5 ? 'high' : 'medium',
        message: `⚠️ HIGH SUGAR (${nutritionFacts.sugar}g/100g) - Risky for diabetes management`,
        category: 'health'
      })
    }

    // Hypertension alerts
    if (conditions.includes('Hypertension') && nutritionFacts.sodium > 0.6) {
      alerts.push({
        severity: nutritionFacts.sodium > 1.5 ? 'high' : 'medium',
        message: `⚠️ HIGH SODIUM (${Math.round(nutritionFacts.sodium * 1000)}mg/100g) - Risky for hypertension`,
        category: 'health'
      })
    }

    // Heart Disease alerts
    if (conditions.includes('Heart Disease') && nutritionFacts.saturated_fat > 3) {
      alerts.push({
        severity: nutritionFacts.saturated_fat > 5 ? 'high' : 'medium',
        message: `⚠️ HIGH SATURATED FAT (${nutritionFacts.saturated_fat}g/100g) - Risky for heart health`,
        category: 'health'
      })
    }

    // High Cholesterol alerts
    if (conditions.includes('High Cholesterol') && nutritionFacts.saturated_fat > 2) {
      alerts.push({
        severity: 'medium',
        message: `⚠️ SATURATED FAT CONTENT - Monitor cholesterol levels`,
        category: 'health'
      })
    }

    // Obesity/Weight management alerts
    if (conditions.includes('Obesity') && nutritionFacts.energy > 400) {
      alerts.push({
        severity: 'medium',
        message: `⚠️ HIGH CALORIE CONTENT (${nutritionFacts.energy} kcal/100g) - Monitor portion size`,
        category: 'health'
      })
    }

    // Kidney Disease alerts (sodium + protein)
    if (conditions.includes('Kidney Disease')) {
      if (nutritionFacts.sodium > 0.4) {
        alerts.push({
          severity: 'high',
          message: `⚠️ HIGH SODIUM - Risky for kidney disease patients`,
          category: 'health'
        })
      }
      if (nutritionFacts.protein > 20) {
        alerts.push({
          severity: 'medium',
          message: `⚠️ HIGH PROTEIN CONTENT - Consult doctor for kidney disease management`,
          category: 'health'
        })
      }
    }

    // Celiac Disease / Gluten alerts
    if (conditions.includes('Celiac Disease')) {
      const ingredients = (product.ingredients || '').toLowerCase()
      if (ingredients.includes('wheat') || ingredients.includes('gluten') || ingredients.includes('barley') || ingredients.includes('rye')) {
        alerts.push({
          severity: 'high',
          message: `🚨 CONTAINS GLUTEN - Unsafe for celiac disease`,
          category: 'allergy'
        })
      }
    }

    // Lactose Intolerance alerts
    if (conditions.includes('Lactose Intolerance')) {
      const ingredients = (product.ingredients || '').toLowerCase()
      if (ingredients.includes('milk') || ingredients.includes('lactose') || ingredients.includes('dairy') || ingredients.includes('whey')) {
        alerts.push({
          severity: 'high',
          message: `🚨 CONTAINS DAIRY/LACTOSE - May cause discomfort`,
          category: 'allergy'
        })
      }
    }
  }

  return alerts
}

/**
 * Identify risk factors in product
 * @param {Object} product - Product data
 * @param {Object} nutritionFacts - Nutrition facts
 * @returns {Array} List of risk factors
 */
export const identifyRiskFactors = (product, nutritionFacts) => {
  const risks = []

  if (nutritionFacts.sugar > 15) {
    risks.push(`High Sugar Content: ${nutritionFacts.sugar}g per 100g`)
  }

  if (nutritionFacts.sodium > 0.6) {
    risks.push(`High Sodium: ${Math.round(nutritionFacts.sodium * 1000)}mg per 100g`)
  }

  if (nutritionFacts.saturated_fat > 3) {
    risks.push(`High Saturated Fat: ${nutritionFacts.saturated_fat}g per 100g`)
  }

  if (product.additives && product.additives.length > 3) {
    risks.push(`Contains ${product.additives.length} artificial additives`)
  }

  if (nutritionFacts.energy > 500) {
    risks.push(`High Calorie Density: ${nutritionFacts.energy} kcal per 100g`)
  }

  return risks
}

export default {
  calculateTruthScore,
  generateHealthAlerts,
  identifyRiskFactors
}
