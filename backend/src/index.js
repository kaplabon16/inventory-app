import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcrypt'
import corsCfg from './config/cors.js'
import { optionalAuth } from './middleware/auth.js'
import { prisma } from './services/prisma.js' 

import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import userRoutes from './routes/userRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import categoriesRoutes from './routes/categoriesRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
// import salesforceRoutes from './routes/integrations.salesforce.js'



import publicApiRoutes from './routes/publicApiRoutes.js'
import salesforceRoutes from './routes/integrations/salesforceRoutes.js'
import supportRoutes from './routes/supportRoutes.js'

const app = express()
app.set('trust proxy', 1)



const UP = path.resolve('uploads')
if (!fs.existsSync(UP)) fs.mkdirSync(UP, { recursive: true })

app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next() })
app.use(cors(corsCfg))
app.options('*', cors(corsCfg))

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(express.json({ limit: '5mb' }))
app.use(cookieParser())
app.use(morgan('tiny'))

app.use('/uploads', express.static(UP))

app.use(optionalAuth)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)
app.use('/api/users', userRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/upload', uploadRoutes)


app.use('/api', publicApiRoutes)
app.use('/api/integrations/salesforce', salesforceRoutes)
app.use('/api/support', supportRoutes)

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }))

app.use((err, _req, res, _next) => {
  console.error('[server error]', err)
  res.setHeader('Vary','Origin')
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

async function ensureDefaultAdmin() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'
  const plain = process.env.DEFAULT_ADMIN_PASSWORD || 'changeme'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  const hash = await bcrypt.hash(plain, 10)

  if (!existing) {
    await prisma.user.create({
      data: { email: adminEmail, name: 'Admin', password: hash, roles: ['ADMIN'], blocked: false }
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
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } })
  }
  console.log('[seed] Categories ensured')
}

const PORT = process.env.PORT || 5045
;(async () => {
  await ensureDefaultAdmin()
  await seedCategories()
  app.listen(PORT, () => console.log(`API listening on :${PORT}`))
})()
