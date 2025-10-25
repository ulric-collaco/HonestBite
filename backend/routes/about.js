import express from 'express'
import { supabase } from '../config/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// GET /api/about/users
// Returns a small JSON payload with the current number of users stored in Supabase
router.get('/users', async (req, res, next) => {
  try {
    // Use head:true to fetch only count (no row data)
    const { count, error } = await supabase.from('users').select('id', { count: 'exact', head: true })

    if (error) {
      logger.error('Error fetching user count from Supabase', { error })
      return res.status(500).json({ error: 'Failed to read user metrics' })
    }

    // count may be null/undefined for empty tables; coerce to 0
    const usersCount = typeof count === 'number' ? count : 0

    return res.json({ users_count: usersCount })
  } catch (err) {
    logger.error('Unexpected error in /api/about/users', { err })
    return res.status(500).json({ error: 'Unexpected server error' })
  }
})

export default router
