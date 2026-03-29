import 'dotenv/config'
import db, { testConnection } from './config/database.js'
import { logger } from './utils/logger.js'

async function runTest() {
  logger.info('🚀 Starting D1 Connection Test...')
  
  try {
    const success = await testConnection()
    if (!success) {
      logger.error('❌ Connection test failed (returned false)')
      process.exit(1)
    }

    const { results } = await db.query('SELECT COUNT(*) as user_count FROM users;')
    logger.info(`✅ Query Success! Total Users: ${results[0].user_count}`)
    
    const secondTest = await db.query('SELECT user_id FROM users LIMIT 1;')
    logger.info(`👋 Verified User ID: ${secondTest.results[0].user_id}`)
    
    logger.info('🎉 Cloudflare D1 Backend Verification Complete!')
    process.exit(0)
  } catch (err) {
    logger.error(`❌ Unexpected Error: ${err.message}`)
    process.exit(1)
  }
}

runTest()
