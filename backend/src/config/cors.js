
import dotenv from 'dotenv'
import cors from 'cors'
dotenv.config()

function normalize(u) {
  if (!u) return null
  const s = u.trim()
  if (!s) return null
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const { origin } = new URL(withProto)
    return origin
  } catch {
    return null
  }
}

const PRIMARY = normalize(process.env.FRONTEND_URL)
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(normalize)
  .filter(Boolean)

const allow = new Set([PRIMARY, ...EXTRA].filter(Boolean))

export default {
  origin(origin, cb) {
    // Non-browser / same-origin / health checks
    if (!origin) return cb(null, true)
    try {
      const { origin: o, hostname } = new URL(origin)
      if (allow.has(o) || /\.vercel\.app$/i.test(hostname)) {
        return cb(null, true)
      }
      return cb(new Error(`Not allowed by CORS: ${origin}`))
    } catch {
      return cb(new Error(`Invalid origin: ${origin}`))
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
  optionsSuccessStatus: 204,
  preflightContinue: false,
}
