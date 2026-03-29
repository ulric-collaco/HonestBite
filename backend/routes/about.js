import express from 'express'
import { db } from '../config/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// GET /api/about/users
router.get('/users', async (req, res, next) => {
  try {
    const row = await db.single('SELECT COUNT(*) as count FROM users')
    const usersCount = row ? parseInt(row.count) : 0

    return res.json({ users_count: usersCount })
  } catch (err) {
    logger.error('Unexpected error in /api/about/users', { err })
    return res.status(500).json({ error: 'Unexpected server error' })
  }
})

export default router
