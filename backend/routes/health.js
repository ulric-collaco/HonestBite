import express from 'express'

const router = express.Router()

// Simple root route for platform health checks (e.g., Render)
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'HonestBite API',
    timestamp: new Date().toISOString()
  })
})

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  })
})

// Lightweight HEAD support for faster liveness checks
router.head('/health', (req, res) => {
  res.status(200).end()
})

export default router
