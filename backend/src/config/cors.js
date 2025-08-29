import dotenv from 'dotenv'
dotenv.config()

function normalize(u) {
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u.replace(/\/+$/,'') : `https://${u}`.replace(/\/+$/,'')
}

const PRIMARY = normalize(process.env.FRONTEND_URL) // e.g. https://inventory-app-one-iota.vercel.app
const EXTRA = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => normalize(s.trim()))
  .filter(Boolean)

const allowVercelPreview = (host) => /\.vercel\.app$/i.test(host)

export default {
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    try {
      const u = new URL(origin)
      const ok =
        (PRIMARY && u.origin === PRIMARY) ||
        EXTRA.includes(u.origin) ||
        allowVercelPreview(u.hostname)
      return ok ? cb(null, true) : cb(new Error(`Not allowed by CORS: ${origin}`))
    } catch {
      return cb(new Error(`Invalid origin: ${origin}`))
    }
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Authorization',
  preflightContinue: false,
  optionsSuccessStatus: 204,
}
