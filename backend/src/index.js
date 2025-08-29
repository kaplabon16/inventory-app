import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import helmet from 'helmet'
import cors from 'cors'

import corsCfg from './config/cors.js'
import { optionalAuth } from './middleware/auth.js'

import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import userRoutes from './routes/userRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import adminRoutes from './routes/adminRoutes.js'

const app = express()

app.use(helmet())
app.use(cors(corsCfg))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(morgan('tiny'))

// attach user when possible so public GETs can react to ?mine etc
app.use(optionalAuth)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)
app.use('/api/users', userRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/admin', adminRoutes)

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }))
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
})
