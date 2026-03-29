import express from 'express'
import { db } from '../config/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Create user
router.post('/', async (req, res, next) => {
  try {
    const { user_id, health_conditions, allergies } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    const doctor_link = `${process.env.API_BASE_URL || 'http://localhost:3001'}/doctor/${user_id}`

    // Check if user already exists
    const existingUser = await db.single('SELECT * FROM users WHERE user_id = ?', [user_id])
    
    if (existingUser) {
      return res.status(200).json({
        ...existingUser,
        health_conditions: JSON.parse(existingUser.health_conditions || '[]'),
        allergies: JSON.parse(existingUser.allergies || '[]')
      })
    }

    // Insert user
    await db.query(
      'INSERT INTO users (user_id, health_conditions, allergies, doctor_link) VALUES (?, ?, ?, ?)',
      [
        user_id,
        JSON.stringify(health_conditions || []),
        JSON.stringify(allergies || []),
        doctor_link
      ]
    )

    const newUser = await db.single('SELECT * FROM users WHERE user_id = ?', [user_id])

    logger.info(`User created: ${user_id}`)
    res.status(201).json({
      ...newUser,
      health_conditions: JSON.parse(newUser.health_conditions || '[]'),
      allergies: JSON.parse(newUser.allergies || '[]')
    })
  } catch (error) {
    next(error)
  }
})

// Get user by ID
router.get('/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params

    const user = await db.single('SELECT * FROM users WHERE user_id = ?', [user_id])

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      ...user,
      health_conditions: JSON.parse(user.health_conditions || '[]'),
      allergies: JSON.parse(user.allergies || '[]')
    })
  } catch (error) {
    next(error)
  }
})

// Update user
router.put('/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { health_conditions, allergies } = req.body

    await db.query(
      'UPDATE users SET health_conditions = ?, allergies = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [
        JSON.stringify(health_conditions || []),
        JSON.stringify(allergies || []),
        user_id
      ]
    )

    const updatedUser = await db.single('SELECT * FROM users WHERE user_id = ?', [user_id])

    logger.info(`User updated: ${user_id}`)
    res.json({
      ...updatedUser,
      health_conditions: JSON.parse(updatedUser.health_conditions || '[]'),
      allergies: JSON.parse(updatedUser.allergies || '[]')
    })
  } catch (error) {
    next(error)
  }
})

// Get user scans
router.get('/:user_id/scans', async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { limit = 20, offset = 0 } = req.query

    const { results } = await db.query(
      'SELECT * FROM scans WHERE user_id = ? ORDER BY scanned_at DESC LIMIT ? OFFSET ?',
      [user_id, parseInt(limit), parseInt(offset)]
    )

    // Parse risk_factors for each scan
    const scans = results.map(scan => ({
      ...scan,
      risk_factors: JSON.parse(scan.risk_factors || '[]')
    }))

    res.json({ scans })
  } catch (error) {
    next(error)
  }
})

export default router

