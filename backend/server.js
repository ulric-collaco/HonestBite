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
import aboutRoutes from './routes/about.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration (MOVE TO TOP)
const parsedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const allowedOrigins = parsedOrigins.length > 0
  ? parsedOrigins
  : ['http://localhost:5173', 'http://localhost:3000']

const isOriginAllowed = (origin, list) => {
  if (!origin) return true
  const normalizedOrigin = origin.toLowerCase().trim()
  
  return list.some((entry) => {
    const normalizedEntry = entry.toLowerCase().trim()
    if (normalizedEntry.startsWith('*.')) {
      const suffix = normalizedEntry.slice(1)
      return normalizedOrigin.endsWith(suffix)
    }
    return normalizedOrigin === normalizedEntry
  })
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (isOriginAllowed(origin, allowedOrigins)) {
      return callback(null, true)
    }
    logger.error(`❌ CORS blocked origin: ${origin}. Allowed Origins: ${allowedOrigins.join(', ')}`)
    return callback(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
  optionsSuccessStatus: 200 // Use 200 for better compatibility
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// Security middleware (Helmet comes after CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

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
app.use('/api/about', aboutRoutes)
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
  logger.info(`🔗 CORS allowed origins: ${allowedOrigins.join(', ') || '(none)'}`)
})

export default app
