// backend/src/index.js
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'
import authRoutes from './routes/authRoutes.js'

const app = express()

function normalize(u) {
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}
const PRIMARY = normalize(process.env.FRONTEND_URL) // main Vercel URL
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => normalize(s.trim()))
  .filter(Boolean)

const allowSet = new Set(['http://localhost:5173', PRIMARY, ...EXTRA].filter(Boolean))

const corsMiddleware = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true) // curl/postman/etc.
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

// Auth
app.use('/api/auth', authRoutes)

// Routes
async function mount(modulePath, basePath) {
  try {
    const mod = await import(modulePath)
    app.use(basePath, mod.default)
    console.log(`Mounted ${basePath}`)
  } catch {
    // skip if missing
  }
}
await mount('./routes/inventoryRoutes.js', '/api/inventories')
await mount('./routes/searchRoutes.js', '/api/search')
await mount('./routes/adminRoutes.js', '/api/admin')
await mount('./routes/userRoutes.js', '/api/users')

app.use((req,res)=>res.status(404).json({ error:'Not found', path: req.originalUrl }))

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
  console.log('CORS allowlist:', Array.from(allowSet).join(', '), ' + *.vercel.app')
})
