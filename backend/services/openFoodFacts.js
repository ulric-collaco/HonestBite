import fetch from 'node-fetch'
import { logger } from '../utils/logger.js'

const OPEN_FOOD_FACTS_URL = process.env.OPEN_FOOD_FACTS_API_URL || 'https://world.openfoodfacts.org/api/v0'
const DEFAULT_TIMEOUT_MS = parseInt(process.env.OFF_TIMEOUT_MS || '7000')

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    return res
  } finally {
    clearTimeout(to)
  }
}

/**
 * Get product data from Open Food Facts
 * @param {string} barcode - Product barcode
 * @returns {Promise<Object>} Product data
 */
export const getProductByBarcode = async (barcode) => {
  try {
  const response = await fetchWithTimeout(`${OPEN_FOOD_FACTS_URL}/product/${barcode}.json`)
    
    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 0 || !data.product) {
      return null // Product not found
    }

    // Parse and format product data
    const product = data.product
    
    return {
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || 'Unknown Brand',
      category: product.categories || 'Unknown Category',
      barcode: barcode,
      ingredients: product.ingredients_text || product.ingredients_text_en || '',
      nutrition_facts: {
        energy: product.nutriments?.['energy-kcal_100g'] || product.nutriments?.energy_100g || 0,
        protein: product.nutriments?.proteins_100g || 0,
        carbohydrates: product.nutriments?.carbohydrates_100g || 0,
        sugar: product.nutriments?.sugars_100g || 0,
        fat: product.nutriments?.fat_100g || 0,
        saturated_fat: product.nutriments?.['saturated-fat_100g'] || 0,
        sodium: product.nutriments?.sodium_100g || product.nutriments?.salt_100g * 0.4 || 0,
        fiber: product.nutriments?.fiber_100g || 0
      },
      additives: product.additives_tags || [],
      allergens: product.allergens_tags || [],
      image_url: product.image_url || product.image_front_url || '',
      data_source: 'Open Food Facts'
    }
  } catch (error) {
    logger.error('Error fetching from Open Food Facts:', error)
    throw error
  }
}

/**
 * Search products by name
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @returns {Promise<Array>} List of products
 */
export const searchProducts = async (query, page = 1) => {
  try {
    const response = await fetchWithTimeout(
      `${OPEN_FOOD_FACTS_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=20&json=1`
    )

    if (!response.ok) {
      throw new Error(`Open Food Facts API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.products.map(product => ({
      name: product.product_name || 'Unknown',
      brand: product.brands || 'Unknown',
      barcode: product.code,
      image_url: product.image_url || product.image_front_url || ''
    }))
  } catch (error) {
    logger.error('Error searching Open Food Facts:', error)
    throw error
  }
}

export default {
  getProductByBarcode,
  searchProducts
}
