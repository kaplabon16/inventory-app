// src/index.js
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import corsCfg from './config/cors.js'
import { optionalAuth } from './middleware/auth.js'

// Routes
import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import userRoutes from './routes/userRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import categoriesRoutes from './routes/categoriesRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'

const prisma = new PrismaClient()
const app = express()

// ensure uploads dir exists
const UP = path.resolve('uploads')
if (!fs.existsSync(UP)) fs.mkdirSync(UP, { recursive: true })

// Behind Railway proxy so secure cookies work after OAuth redirects
app.set('trust proxy', 1)

/* ************* CRITICAL: CORS FIRST ************* */
app.use(cors(corsCfg))
app.options('*', cors(corsCfg)) // handle all preflight
/* *********************************************** */

// Security + basics
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use(morgan('tiny'))

// serve uploaded files
app.use('/uploads', express.static(UP))

// Soft attach user when possible (public pages can show “mine/canWrite” if authed)
app.use(optionalAuth)

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// API
app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)
app.use('/api/users', userRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/upload', uploadRoutes)

// 404 + error
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }))
app.use((err, _req, res, _next) => {
  console.error('[server error]', err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

// --- Bootstrap admin + seed ----
async function ensureDefaultAdmin() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'
  const plain = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  const hash = await bcrypt.hash(plain, 10)

  if (!existing) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        password: hash,
        roles: ['ADMIN'],
        blocked: false,
      }
    })
    console.log(`[bootstrap] Created default admin ${adminEmail}`)
  } else if (!existing.roles?.includes('ADMIN')) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { roles: { set: ['ADMIN'] }, password: existing.password || hash }
    })
    console.log(`[bootstrap] Promoted ${adminEmail} to ADMIN`)
  }
}

async function seedCategories() {
  const names = ['Equipment', 'Supplies', 'Vehicles', 'Furniture', 'Other']
  for (const name of names) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name }
    })
  }
  console.log('[seed] Categories ensured')
}

const PORT = process.env.PORT || 5045
;(async () => {
  await ensureDefaultAdmin()
  await seedCategories()
  app.listen(PORT, () => {
    console.log(`API listening on :${PORT}`)
  })
})()
