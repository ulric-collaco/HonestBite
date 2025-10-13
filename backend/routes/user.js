import express from 'express'
import { supabase } from '../config/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Create user
router.post('/', async (req, res, next) => {
  try {
    const { user_id, health_conditions, allergies } = req.body

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' })
    }

    // Generate doctor link
    const doctor_link = `${process.env.CORS_ORIGIN}/doctor/${user_id}`

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          user_id,
          health_conditions: health_conditions || [],
          allergies: allergies || [],
          doctor_link
        }
      ])
      .select()
      .single()

    if (error) throw error

    logger.info(`User created: ${user_id}`)
    res.status(201).json(data)
  } catch (error) {
    next(error)
  }
})

// Get user by ID
router.get('/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      throw error
    }

    res.json(data)
  } catch (error) {
    next(error)
  }
})

// Update user
router.put('/:user_id', async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { health_conditions, allergies } = req.body

    const { data, error } = await supabase
      .from('users')
      .update({
        health_conditions: health_conditions || [],
        allergies: allergies || []
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error

    logger.info(`User updated: ${user_id}`)
    res.json(data)
  } catch (error) {
    next(error)
  }
})

// Get user scans
router.get('/:user_id/scans', async (req, res, next) => {
  try {
    const { user_id } = req.params
    const { limit = 20, offset = 0 } = req.query

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', user_id)
      .order('scanned_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    res.json({ scans: data })
  } catch (error) {
    next(error)
  }
})

export default router
