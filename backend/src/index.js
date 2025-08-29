import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import compression from 'compression'

import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
// (If you have these, keep them; otherwise comment out)
// import categoryRoutes from './routes/categoryRoutes.js'
// import usersRoutes from './routes/usersRoutes.js'

const app = express()

// Behind Railway/Render/Heroku proxies
app.set('trust proxy', 1)

// --- CORS (credentials + exact origin) ---
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
function parseOrigin(v) {
  try {
    const u = new URL(v.includes('://') ? v : `https://${v}`)
    return u.origin
  } catch {
    return v
  }
}
const allowOrigin = parseOrigin(FRONTEND_URL)

app.use(
  cors({
    origin: (origin, cb) => {
      // allow same-origin / server-to-server (no origin header), and the configured FE
      if (!origin || origin === allowOrigin) return cb(null, true)
      return cb(new Error('CORS_NOT_ALLOWED'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)
// Respond to preflight quickly
app.options('*', cors({ origin: allowOrigin, credentials: true }))

// --- Security/utility middleware ---
app.use(helmet({ contentSecurityPolicy: false }))
app.use(compression())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// --- Healthcheck ---
app.get('/healthz', (_req, res) => res.json({ ok: true }))

// --- API routes ---
app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)
// if present:
// app.use('/api/categories', categoryRoutes)
// app.use('/api/users', usersRoutes)

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', path: req.path })
})

// --- Error handler (keeps CORS headers) ---
app.use((err, req, res, _next) => {
  console.error('SERVER_ERR', err)
  res
    .status(500)
    .json({ error: 'SERVER_ERROR', message: err?.message || 'Internal error' })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
  console.log(`Allowing CORS origin: ${allowOrigin}`)
})
