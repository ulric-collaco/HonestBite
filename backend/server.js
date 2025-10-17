// Load environment variables FIRST
import './loadEnv.js'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { logger, requestLogger } from './utils/logger.js'
import healthRoutes from './routes/health.js'
import userRoutes from './routes/user.js'
import scanRoutes from './routes/scan.js'
import productRoutes from './routes/product.js'
import doctorRoutes from './routes/doctor.js'
import barcodeRoutes from './routes/barcode.js'
import agentRoutes from './routes/agent.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}
app.use(cors(corsOptions))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
  app.use(requestLogger)
}

// Routes
app.use('/', healthRoutes)
app.use('/api/user', userRoutes)
app.use('/api/scan', scanRoutes)
app.use('/api/product', productRoutes)
app.use('/api/doctor', doctorRoutes)
app.use('/api/barcode', barcodeRoutes)
app.use('/api/agent', agentRoutes)
// OCR routes removed from current workflow

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  })
})

// Error handling middleware
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📝 Environment: ${process.env.NODE_ENV}`)
  logger.info(`🔗 CORS enabled for: ${process.env.CORS_ORIGINS}`)
})

export default app
