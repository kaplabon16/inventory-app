// backend/src/middleware/cors.js
import cors from 'cors'

function normalize(url) {
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}

const PRIMARY = normalize(process.env.FRONTEND_URL)
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => normalize(s.trim()))
  .filter(Boolean)

const allowList = new Set([PRIMARY, ...EXTRA].filter(Boolean))

const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow non-browser or same-origin requests
    if (!origin) return cb(null, true)

    try {
      const o = new URL(origin)
      const full = o.origin

      // Allow explicit allowlist OR any vercel.app preview
      if (allowList.has(full) || /\.vercel\.app$/i.test(o.hostname)) {
        return cb(null, true)
      }
    } catch { /* ignore parse errors */ }

    return cb(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

export default corsMiddleware
