import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes.js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

// Ensure FRONTEND_URL has protocol, e.g. https://inventory-app-one-iota.vercel.app
const FRONTEND_ORIGIN = process.env.FRONTEND_URL?.startsWith('http')
  ? process.env.FRONTEND_URL
  : `https://${process.env.FRONTEND_URL}`

app.use(cors({
  origin: [FRONTEND_ORIGIN, 'http://localhost:5173'],
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

// Health check
app.get('/api/health', (_req,res)=>res.json({ok:true}))

// ✅ Mount auth routes on /api/auth
app.use('/api/auth', authRoutes)

// Fallback 404 JSON
app.use((req,res) => res.status(404).json({ error: 'Not found', path: req.originalUrl }))

const PORT = process.env.PORT || 5045
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`)
  console.log(`CORS allowed for: ${FRONTEND_ORIGIN}`)
})
