// src/config/cors.js
import dotenv from 'dotenv'
dotenv.config()

function normalize(u) {
  if (!u) return null
  const s = /^https?:\/\//i.test(u) ? u : `https://${u}`
  return s.replace(/\/+$/,'')
}

const PRIMARY = normalize(process.env.FRONTEND_URL)
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => normalize(s.trim()))
  .filter(Boolean)

export default {
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    try {
      const url = new URL(origin)
      const ok =
        (PRIMARY && url.origin === PRIMARY) ||
        EXTRA.includes(url.origin) ||
        /\.vercel\.app$/i.test(url.hostname)
      return ok ? cb(null, true) : cb(new Error(`Not allowed by CORS: ${origin}`))
    } catch {
      return cb(new Error(`Invalid origin: ${origin}`))
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Authorization'
}
