import { Router } from 'express'
import passport from 'passport'
import { configurePassport } from '../config/passport.js'
import { signToken } from '../middleware/auth.js'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const router = Router()
configurePassport()

router.use(passport.initialize())

// Helper: send JWT token to frontend
const sendToken = (res, user) => {
  const token = signToken(user)
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 3600 * 1000, // 7 days
  })
  return token
}

// ---------------------
// Local login/register
// ---------------------

// Register with email/password
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password required' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ message: 'Email already in use' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    })

    const token = sendToken(res, user)
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Login with email/password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) return res.status(400).json({ message: 'Invalid credentials' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(400).json({ message: 'Invalid credentials' })

    const token = sendToken(res, user)
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// ---------------------
// OAuth: Google
// ---------------------
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  async (req, res) => {
    sendToken(res, req.user)
    res.redirect(`${process.env.FRONTEND_URL}/profile`)
  }
)

// ---------------------
// OAuth: GitHub
// ---------------------
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }))
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  async (req, res) => {
    sendToken(res, req.user)
    res.redirect(`${process.env.FRONTEND_URL}/profile`)
  }
)

// ---------------------
// Profile & logout
// ---------------------
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.json(null)
    const { id } = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id } })
    res.json(user ? { id: user.id, email: user.email, name: user.name, roles: user.roles } : null)
  } catch {
    res.json(null)
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token', { sameSite: 'none', secure: true })
  res.json({ ok: true })
})

export default router
