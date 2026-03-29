import fetch from 'node-fetch'
import { logger } from '../utils/logger.js'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const apiToken = process.env.CLOUDFLARE_API_TOKEN
const databaseId = process.env.D1_DATABASE_ID

const isConfigured = accountId && apiToken && databaseId

/**
 * Cloudflare D1 HTTP API Client
 */
export const db = {
  query: async (sql, params = []) => {
    if (!isConfigured) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('D1 not configured. Using mock response for development.')
        return { success: true, results: [] }
      }
      throw new Error('Cloudflare D1 credentials missing')
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql: sql,
          params: params
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || 'D1 Query failed')
      }

      // D1 returns { result: [{ results: [...] }] } for /query
      return {
        success: true,
        results: data.result[0].results,
        meta: data.result[0].meta
      }
    } catch (error) {
      logger.error('D1 Query Error:', error.message)
      throw error
    }
  },

  // Helper for single row
  single: async (sql, params = []) => {
    const { results } = await db.query(sql, params)
    return results[0] || null
  }
}

// Compatibility layer for existing code (mocking supabase object)
export const supabase = {
  from: () => {
    throw new Error('Supabase client is deprecated. Use "db.query" instead.')
  }
}

export const testConnection = async () => {
  if (!isConfigured) return false
  try {
    await db.query('SELECT 1')
    logger.info('✅ Cloudflare D1 connection successful')
    return true
  } catch (error) {
    logger.error('❌ Cloudflare D1 connection failed:', error.message)
    return false
  }
}

export default db
