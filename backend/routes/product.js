import express from 'express'
import { supabase } from '../config/database.js'
import { getProductByBarcode } from '../services/openFoodFacts.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

router.get('/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params

    // Check local database first
    const { data: localProduct, error: localError } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (localProduct && !localError) {
      return res.json({
        product_data: localProduct,
        source: 'local_cache'
      })
    }

    // Try Open Food Facts
    try {
      const productData = await getProductByBarcode(barcode)
      
      if (productData) {
        // Cache in local database
        await supabase
          .from('products')
          .upsert([
            {
              barcode: productData.barcode,
              name: productData.name,
              ingredients: productData.ingredients,
              nutrition_facts: productData.nutrition_facts,
              data_source: 'Open Food Facts'
            }
          ])

        return res.json({
          product_data: productData,
          source: 'openfoodfacts'
        })
      }
    } catch (error) {
      logger.warn('Open Food Facts lookup failed:', error)
    }

    // Check FSSAI manual database
    const { data: fssaiProduct, error: fssaiError } = await supabase
      .from('fssai_products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (fssaiProduct && !fssaiError) {
      return res.json({
        product_data: {
          name: fssaiProduct.name,
          brand: fssaiProduct.brand,
          category: fssaiProduct.category,
          barcode: fssaiProduct.barcode,
          nutrition_facts: fssaiProduct.nutrition_info?.nutrition_facts || {}
        },
        source: 'fssai_manual'
      })
    }

    res.status(404).json({
      error: 'Product not found',
      source: 'not_found'
    })
  } catch (error) {
    next(error)
  }
})

export default router
