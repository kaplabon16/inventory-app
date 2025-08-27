// backend/src/index.js
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'

// Only import what we KNOW exists
import authRoutes from './routes/authRoutes.js'

const app = express()

// ---------- CORS allowlist ----------
const normalize = (url) =>
  !url ? null : /^https?:\/\//i.test(url) ? url.trim() : `https://${url.trim()}`

const primary = normalize(process.env.FRONTEND_URL)
const extras = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map((s) => normalize(s))
  .filter(Boolean)

const ALLOWED_ORIGINS = new Set(
  ['http://localhost:5173', primary, ...extras].filter(Boolean)
)

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true) // curl / server-to-server
    try {
      const o = new URL(origin).origin
      return ALLOWED_ORIGINS.has(o)
        ? cb(null, true)
        : cb(new Error(`CORS blocked: ${origin}`))
    } catch {
      return cb(new Error(`Invalid origin: ${origin}`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
app.use(corsMiddleware)
app.options('*', (req, res) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.sendStatus(204)
})

app.use(express.json())
app.use(cookieParser())
app.use(morgan('tiny'))

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Auth (exists)
app.use('/api/auth', authRoutes)

// ---------- Conditionally mount the rest (skip if file is missing) ----------
async function mountIfExists(modulePath, basePath) {
  try {
    const mod = await import(modulePath)
    app.use(basePath, mod.default)
    console.log(`Mounted ${basePath} from ${modulePath}`)
  } catch (e) {
    console.warn(`Skipped ${basePath}: ${e.message}`)
  }
}

// Only tries to mount; won’t crash if a file doesn’t exist
await mountIfExists('./routes/userRoutes.js', '/api/users')
await mountIfExists('./routes/inventoryRoutes.js', '/api/inventories')
await mountIfExists('./routes/itemRoutes.js', '/api/items')
await mountIfExists('./routes/searchRoutes.js', '/api/search')
// If you add a tags router later, this will start mounting it automatically:
// await mountIfExists('./routes/tagRoutes.js', '/api/tags')

// 404 JSON
app.use((req, res) =>
  res.status(404).json({ error: 'Not found', path: req.originalUrl })
)

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
  console.log('CORS allowlist:', Array.from(ALLOWED_ORIGINS).join(', '))
})
