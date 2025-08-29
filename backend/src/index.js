// backend/src/index.js
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'

// STATIC imports (no dynamic import)
import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import userRoutes from './routes/userRoutes.js'

const app = express()

function normalize(u) {
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

const PRIMARY = normalize(process.env.FRONTEND_URL) // your Vercel URL
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => normalize(s.trim()))
  .filter(Boolean)

const allowSet = new Set(['http://localhost:5173', PRIMARY, ...EXTRA].filter(Boolean))

const corsMiddleware = cors({
  origin(origin, cb) {
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

app.get('/api/health', (_req,res)=>res.json({ok:true}))

// Mount routes (these were missing in prod due to failed dynamic import)
app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)

app.use((req,res)=>res.status(404).json({ error:'Not found', path: req.originalUrl }))

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
  console.log('CORS allowlist:', Array.from(allowSet).join(', '), ' + *.vercel.app')
})
