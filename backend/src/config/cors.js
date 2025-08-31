// backend/src/config/cors.js
import dotenv from 'dotenv'
import cors from 'cors'
dotenv.config()

function norm(u) {
  if (!u) return null
  const s = String(u).trim()
  if (!s) return null
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    return new URL(withProto).origin
  } catch { return null }
}

const primary = norm(process.env.FRONTEND_URL)

// Extra CSV list (domains or full URLs)
const extra = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(norm)
  .filter(Boolean)

const allowSet = new Set([primary, ...extra].filter(Boolean))

/**
 * Accept:
 *  - Exact FRONTEND_URL
 *  - Any domain listed in CORS_ORIGINS
 *  - Any *.vercel.app (preview builds)
 *  - localhost dev
 */
export default {
  origin(origin, cb) {
    // Non-browser / same-origin / server-to-server
    if (!origin) return cb(null, true)
    try {
      const u = new URL(origin)
      const host = u.hostname
      const ok =
        allowSet.has(u.origin) ||
        /\.vercel\.app$/i.test(host) ||
        /^localhost(:\d+)?$/i.test(host) ||
        /^127\.0\.0\.1(:\d+)?$/.test(host)
      if (ok) return cb(null, true)
      return cb(new Error(`Not allowed by CORS: ${origin}`))
    } catch {
      return cb(new Error(`Invalid origin: ${origin}`))
    }
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  exposedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
}

/**
 * Usage in index.js:
 *   app.use((req,res,next)=>{ res.setHeader('Vary','Origin'); next() })
 *   app.use(cors(corsCfg))
 *   app.options('*', cors(corsCfg))
 */

