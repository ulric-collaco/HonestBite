import express from 'express'
import { db } from '../config/database.js'
import { getProductByBarcode } from '../services/openFoodFacts.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

router.get('/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params

    // Check local database first
    const localProduct = await db.single('SELECT * FROM products WHERE barcode = ?', [barcode])

    if (localProduct) {
      return res.json({
        product_data: {
          ...localProduct,
          nutrition_facts: JSON.parse(localProduct.nutrition_facts || '{}'),
          risk_flags: JSON.parse(localProduct.risk_flags || '[]')
        },
        source: 'local_cache'
      })
    }

    // Try Open Food Facts
    try {
      const productData = await getProductByBarcode(barcode)
      
      if (productData) {
        // Cache in local database (Upsert)
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
          'Open Food Facts'
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
    const fssaiProduct = await db.single('SELECT * FROM fssai_products WHERE barcode = ?', [barcode])

    if (fssaiProduct) {
      const nutritionInfo = JSON.parse(fssaiProduct.nutrition_info || '{}')
      return res.json({
        product_data: {
          name: fssaiProduct.name,
          brand: fssaiProduct.brand,
          category: fssaiProduct.category,
          barcode: fssaiProduct.barcode,
          nutrition_facts: nutritionInfo.nutrition_facts || {}
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

