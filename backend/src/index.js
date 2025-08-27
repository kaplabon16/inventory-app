// backend/src/index.js
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'

// Mount auth immediately (must exist)
import authRoutes from './routes/authRoutes.js'

const app = express()

// ----- CORS allowlist (primary + extras + *.vercel.app + localhost) -----
function normalize(url) {
  if (!url) return null
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
const PRIMARY = normalize(process.env.FRONTEND_URL)
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => normalize(s.trim()))
  .filter(Boolean)

const allowSet = new Set(['http://localhost:5173', PRIMARY, ...EXTRA].filter(Boolean))

const corsMiddleware = cors({
  origin(origin, cb) {
    // Non-browser or same-origin
    if (!origin) return cb(null, true)
    try {
      const u = new URL(origin)
      const ok = allowSet.has(u.origin) || /\.vercel\.app$/i.test(u.hostname)
      return ok ? cb(null, true) : cb(new Error(`Not allowed by CORS: ${origin}`))
    } catch {
      return cb(new Error(`Invalid origin: ${origin}`))
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
})

app.use(corsMiddleware)
app.options('*', corsMiddleware)

app.use(express.json())
app.use(cookieParser())
app.use(morgan('tiny'))

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api/auth', authRoutes)

// Helper to mount routes if present (prevents crash on missing files)
async function mountIfExists(modulePath, basePath) {
  try {
    const mod = await import(modulePath)
    app.use(basePath, mod.default)
    console.log(`Mounted ${basePath} from ${modulePath}`)
  } catch (e) {
    console.warn(`Skipped ${basePath}: ${e.message}`)
  }
}

// Dynamically mount the rest (only if the files exist and names match exactly)
await mountIfExists('./routes/inventoryRoutes.js', '/api/inventories')
await mountIfExists('./routes/itemRoutes.js', '/api/items')
await mountIfExists('./routes/searchRoutes.js', '/api/search')
await mountIfExists('./routes/adminRoutes.js', '/api/admin')
await mountIfExists('./routes/userRoutes.js', '/api/users')

// 404 JSON
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }))

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
  console.log('CORS allowlist:', Array.from(allowSet).join(', '), ' + *.vercel.app')
})
