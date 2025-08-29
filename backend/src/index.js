import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import compression from 'compression'
import helmet from 'helmet'

// Routes
import authRoutes from './src/routes/authRoutes.js'
import inventoryRoutes from './src/routes/inventoryRoutes.js'

const app = express()

// Railway/Heroku style proxies → needed for secure cookies
app.set('trust proxy', 1)

// Hardening
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))
app.use(compression())

// Parsers
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// ---------- CORS (credentialed) ----------
function toOrigin(v) {
  if (!v) return null
  try {
    return new URL(v.includes('://') ? v : `https://${v}`).origin
  } catch { return null }
}

const allowList = [
  process.env.FRONTEND_URL,           // e.g. https://inventory-app-one-iota.vercel.app
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].map(toOrigin).filter(Boolean)

const corsOptions = {
  origin(origin, cb) {
    // allow server-to-server / curl (no Origin header)
    if (!origin) return cb(null, true)
    if (allowList.includes(origin)) return cb(null, true)
    return cb(new Error(`CORS: origin not allowed: ${origin}`))
  },
  credentials: true, // <— allow cookies
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) // preflight

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// API
app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// Error handler (helps surface CORS rejections)
app.use((err, _req, res, _next) => {
  const msg = err?.message || 'Server error'
  const code = msg.startsWith('CORS:') ? 403 : 500
  res.status(code).json({ error: msg })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('API listening on', PORT, { FRONTEND: allowList.join(', ') })
})
