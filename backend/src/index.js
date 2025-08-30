// src/index.js
import 'dotenv/config'
import express from 'express'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

// --- your routers ---
import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
// (add any other routers you have)

// -------- CORS ORIGIN WHITELIST ----------
const FRONTEND = (process.env.FRONTEND_URL || '').trim()
// allow your prod Vercel, optional local dev, and Vercel previews (*.vercel.app)
const extraAllowed = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://inventory-app-one-iota.vercel.app',
].filter(Boolean)

const allowedOrigins = [
  ...extraAllowed,
  ...(FRONTEND ? [FRONTEND] : [])
]

// For *.vercel.app previews
const vercelPreviewRe = /\.vercel\.app$/i

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // curl / server-to-server / SSR
    const ok = allowedOrigins.includes(origin) || vercelPreviewRe.test(new URL(origin).hostname)
    if (ok) return cb(null, true)
    return cb(new Error(`CORS: ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}

// -----------------------------------------
const app = express()

// You are behind Railway's proxy; needed for secure cookies
app.set('trust proxy', 1)

// Minimal hardening; allow cross-origin resources
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // you can fine-tune later
}))

// Always set Vary: Origin so caches don't bite CORS
app.use((req,res,next) => { res.setHeader('Vary','Origin'); next() })

// CORS first, before any routes
app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) // preflight responder

// Body & cookies
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(morgan('tiny'))

// Health checks
app.get('/', (_req, res) => res.send('OK'))
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)

// 404 (keep CORS headers intact)
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND' })
})

// Error handler (keeps ACAO header because CORS ran first)
app.use((err, _req, res, _next) => {
  console.error('SERVER_ERR', err?.message || err)
  res.status(500).json({ error: 'SERVER_ERROR' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`API on :${PORT}`)
})
