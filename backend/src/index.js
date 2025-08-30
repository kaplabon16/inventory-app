import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

const app = express()
app.set('trust proxy', 1) // important on Railway/Heroku/Render behind HTTPS proxy

const FRONTEND = process.env.FRONTEND_URL || 'https://inventory-app-one-iota.vercel.app'

app.use(helmet())
app.use(cookieParser())
app.use(express.json())

app.use(cors({
  origin: [FRONTEND],   // add more allowed origins if you have them
  credentials: true,    // allow cookies to be sent
}))

// ... your routers mounted at /api
// app.use('/api/auth', authRoutes)
// app.use('/api/inventories', inventoryRoutes)
