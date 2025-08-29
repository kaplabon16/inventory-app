import dotenv from 'dotenv'
dotenv.config()

function normalize(u) {
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u.replace(/\/+$/,'') : `https://${u}`.replace(/\/+$/,'')
}

const PRIMARY = normalize(process.env.FRONTEND_URL)
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => normalize(s.trim()))
  .filter(Boolean)

export default {
  origin(origin, cb) {
    if (!origin) return cb(null, true) // same-origin/curl
    try {
      const u = new URL(origin)
      const ok =
        (PRIMARY && u.origin === PRIMARY) ||
        EXTRA.includes(u.origin) ||
        /\.vercel\.app$/i.test(u.hostname)
      return ok ? cb(null, true) : cb(new Error(`Not allowed by CORS: ${origin}`))
    } catch {
      return cb(new Error(`Invalid origin: ${origin}`))
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Authorization'
}
