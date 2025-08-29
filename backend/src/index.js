import 'dotenv/config'
import express from 'express'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import cookieParser from 'cookie-parser'

// routes
import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
// If you have categories/users routes, keep them:
import { Router } from 'express'

// --- CORS whitelist / dynamic origin ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const EXTRA_ORIGINS = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const allowed = new Set([
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...EXTRA_ORIGINS
])

/**
 * Allow exact frontend origin. If you deploy a new preview URL,
 * add it to CORS_EXTRA_ORIGINS env (comma-separated).
 */
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true)           // curl / server-to-server
    if (allowed.has(origin)) return cb(null, true)
    cb(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,                              // allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
}

const app = express()

// Trust proxy so SameSite=None+Secure cookies work behind Railway proxy
app.set('trust proxy', 1)

// Middlewares
app.use(morgan('tiny'))
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))
app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) // preflight
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Health
app.get('/health', (_req, res) => res.json({ ok: true, env: process.env.NODE_ENV }))

// API
app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)

// Example placeholders if your frontend calls them:
const misc = Router()
misc.get('/categories', (_req, res) => res.json([
  { id: 1, name: 'Other' }
]))
misc.get('/users/search', (req, res) => {
  // Return empty for now; wire to your users table later
  res.json([])
})
app.use('/api', misc)

// 404
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

// Error handler (CORS errors show nicely)
app.use((err, _req, res, _next) => {
  if (err?.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ error: 'CORS', message: err.message })
  }
  console.error('SERVER_ERR', err)
  res.status(500).json({ error: 'SERVER_ERROR' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('API listening on', PORT, 'allowing', [...allowed])
})
