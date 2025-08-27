// backend/src/index.js
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import corsMiddleware from './middleware/cors.js'

import authRoutes from './routes/authRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import itemRoutes from './routes/itemRoutes.js'
import searchRoutes from './routes/searchRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import userRoutes from './routes/userRoutes.js'

const app = express()

app.use(express.json())
app.use(cookieParser())

// CORS (must be before routes)
app.use(corsMiddleware)
app.options('*', corsMiddleware) // preflight

// Simple health check
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/inventories', inventoryRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)

// 404 JSON
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }))

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`)
})
