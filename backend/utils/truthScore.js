import { logger } from '../utils/logger.js'

/**
 * Calculate truth score for a product (1-10 scale)
 * @param {Object} product - Product data
 * @param {Object} nutritionFacts - Nutrition facts per 100g
 * @returns {number} Truth score (1-10)
 */
export const calculateTruthScore = (product, nutritionFacts) => {
  // Improved truth score using continuous penalties/bonuses and category weights

  const clamp = (x, min, max) => Math.min(max, Math.max(min, x))
  const smooth01 = (x, low, high) => {
    if (x == null || Number.isNaN(x)) return 0
    if (high === low) return x > high ? 1 : 0
    return clamp((x - low) / (high - low), 0, 1)
  }

  const mgToG = v => (v != null ? v / 1000 : null)
  const kjFromKcal = v => (v != null ? v * 4.184 : null)

  // Tries common keys and normalizes to per-100g/100ml
  function normalizeNutrition(n) {
    if (!n) n = {}
    const pick = (...keys) => {
      for (const k of keys) if (n[k] != null) return Number(n[k])
      return null
    }

    // Per-100 normalization best-effort (assumes values already per 100 when typical fields exist)
    const sugars_g = pick('sugars_100g', 'sugar_100g', 'sugars', 'sugar', 'total_sugars_g_per_100g')
    let sodium_g = pick('sodium_100g', 'sodium', 'sodium_g_per_100g')
    const sodium_mg = pick('sodium_mg', 'sodium_mg_per_100g')
    if (sodium_g == null && sodium_mg != null) sodium_g = mgToG(sodium_mg)

    const satFat_g = pick('saturated_fat_100g', 'saturated-fat_100g', 'saturatedFat_100g', 'saturated_fat', 'sat_fat_g_per_100g')
    const transFat_g = pick('trans_fat_100g', 'trans-fat_100g', 'trans_fat', 'trans_fat_g_per_100g')
    const fiber_g = pick('fiber_100g', 'fiber', 'dietary_fiber_g_per_100g')
    const protein_g = pick('proteins_100g', 'protein_100g', 'protein', 'protein_g_per_100g')
    const energy_kcal = pick('energy-kcal_100g', 'energy_kcal_100g', 'energy-kcal', 'energy_kcal')

    return {
      sugars_g, sodium_g, satFat_g, transFat_g, fiber_g, protein_g, energy_kcal
    }
  }

  function categoryWeights(category = 'general') {
    const c = (category || 'general').toLowerCase()
    // Heavier sugar weighting for beverages; higher sodium for savory snacks
    if (c.includes('beverage') || c.includes('drink') || c.includes('juice') || c.includes('soda')) {
      return { sugar: 1.6, sodium: 1.0, satFat: 1.0, transFat: 1.4, energy: 1.2, fiber: 1.2, protein: 0.8 }
    }
    if (c.includes('snack') || c.includes('chips') || c.includes('namkeen') || c.includes('noodles')) {
      return { sugar: 1.2, sodium: 1.6, satFat: 1.3, transFat: 1.6, energy: 1.2, fiber: 1.0, protein: 1.0 }
    }
    if (c.includes('dessert') || c.includes('chocolate') || c.includes('sweet')) {
      return { sugar: 1.6, sodium: 0.8, satFat: 1.4, transFat: 1.6, energy: 1.3, fiber: 1.0, protein: 0.8 }
    }
    return { sugar: 1.3, sodium: 1.3, satFat: 1.2, transFat: 1.6, energy: 1.0, fiber: 1.0, protein: 1.0 }
  }

  // Additive/NOVA/sweetener heuristics
  function productPenalties(product = {}) {
    const additives = Array.isArray(product.additives) ? product.additives.length : (product.additives_count || 0) || 0
    const hasSweetener = (product.ingredients_text || '').toLowerCase().match(/sucralose|acesulfame|aspartame|saccharin|stevia|acesulfame\s*k|acesulfame-k|neotame|advantame|cyclamate/)
    const nova = product.nova_group || product.nova_group_100g || null

    const pAdditives = 2.0 * smooth01(additives, 0, 6) // 0..2
    const pSweeteners = hasSweetener ? 1.0 : 0
    const pNOVA = nova >= 4 ? 2.0 : 0 // ultra-processed
    return pAdditives + pSweeteners + pNOVA
  }

  // Data completeness reduces score uncertainty/over-optimism
  function completenessFactor(norm) {
    const keys = ['sugars_g','sodium_g','satFat_g','transFat_g','fiber_g','protein_g','energy_kcal']
    const present = keys.filter(k => norm[k] != null).length
    // 0.7 base + up to +0.3 with complete data
    return 0.7 + 0.3 * (present / keys.length)
  }

  const norm = normalizeNutrition(nutritionFacts || {})
  const w = categoryWeights((product.category || product.categories_tags?.[0] || '').toString())

  // Continuous penalties (scaled 0..1 via smooth01, then weighted)
  // Thresholds from public guidance (WHO/UK/FSSAI high-in), tuned:
  const sugarP = 4.0 * w.sugar   * smooth01(norm.sugars_g, 5, 25)     // hits max near 25g/100g
  const sodiumP = 4.0 * w.sodium * smooth01(norm.sodium_g, 0.3, 1.5)  // 300mg..1500mg/100g
  const satFatP = 3.0 * w.satFat * smooth01(norm.satFat_g, 1.5, 10)
  const transFatP = 3.0 * w.transFat * smooth01(norm.transFat_g, 0.1, 2) // strong penalty even at low
  const energyKcal = norm.energy_kcal != null ? norm.energy_kcal : null
  const energyP = 2.0 * w.energy * smooth01(energyKcal, 150, 450) // energy density

  const productP = productPenalties(product)

  // Bonuses
  const fiberB = 3.0 * w.fiber   * smooth01(norm.fiber_g, 3, 8)   // reward high fiber
  const proteinB = 2.0 * w.protein * smooth01(norm.protein_g, 5, 12)

  // Aggregate
  let raw = 10
  const totalPenalty = sugarP + sodiumP + satFatP + transFatP + energyP + productP
  const totalBonus = fiberB + proteinB
  raw = raw - totalPenalty + totalBonus

  // Completeness damping
  const c = completenessFactor(norm)
  raw = 1 + (raw - 1) * c

  const score = Math.round(clamp(raw, 1, 10))

  return {
    score,
    breakdown: {
      sugarP, sodiumP, satFatP, transFatP, energyP, productP, fiberB, proteinB,
      completeness: c,
      inputs: { ...norm, category: product.category || null }
    }
  }
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
