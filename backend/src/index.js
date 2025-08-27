// backend/src/index.js
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'

// Static imports for only the routes you actually have
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import itemRoutes from './routes/itemRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import tagRoutes from './routes/tagRoutes.js'

const app = express()

// ----- CORS allowlist (supports FRONTEND_URL and/or FRONTEND_URLS CSV) -----
const normalize = (url) =>
  !url ? null : /^https?:\/\//i.test(url) ? url.trim() : `https://${url.trim()}`

const primary = normalize(process.env.FRONTEND_URL)
const extras = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map((s) => normalize(s))
  .filter(Boolean)

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  primary,
  ...extras,
].filter(Boolean))

app.use(
  cors({
    origin(origin, cb) {
      // No origin (curl/native) → allow
      if (!origin) return cb(null, true)
      try {
        const u = new URL(origin)
        const ok = ALLOWED_ORIGINS.has(u.origin)
        return ok ? cb(null, true) : cb(new Error(`CORS blocked: ${origin}`))
      } catch {
        return cb(new Error(`Invalid origin: ${origin}`))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
// Explicit preflight
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  )
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.sendStatus(204)
})

app.use(express.json())
app.use(cookieParser())
app.use(morgan('tiny'))

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/inventories', inventoryRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/tags', tagRoutes)

// 404 JSON
app.use((req, res) =>
  res.status(404).json({ error: 'Not found', path: req.originalUrl })
)

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
  console.log(
    'CORS allowlist:',
    Array.from(ALLOWED_ORIGINS).join(', ')
  )
})
