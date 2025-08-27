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

// helper: issue cookie + redirect back to frontend root
function sendToken(res, user) {
  const token = signToken(user)
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 3600 * 1000
  })
  const FE = process.env.FRONTEND_URL?.startsWith('http')
    ? process.env.FRONTEND_URL
    : `https://${process.env.FRONTEND_URL}`
  res.redirect(`${FE}/`)
}

// -------- OAuth --------
router.get('/google', passport.authenticate('google', { scope: ['profile','email'] }))
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/fail' }),
  async (req, res) => sendToken(res, req.user)
)

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }))
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/api/auth/fail' }),
  async (req, res) => sendToken(res, req.user)
)

router.get('/fail', (_req,res)=> res.status(401).json({ error: 'OAuth failed' }))

// -------- Email/Password --------
router.post('/register', async (req,res) => {
  try {
    const { name, email, password } = req.body || {}
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password are required' })
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hash, roles: [] }
    })
    const token = signToken(user)
    res.cookie('token', token, {
      httpOnly: true, sameSite: 'none', secure: true, maxAge: 7*24*3600*1000
    })
    res.json({ id: user.id, email: user.email, name: user.name, roles: user.roles })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req,res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signToken(user)
    res.cookie('token', token, {
      httpOnly: true, sameSite: 'none', secure: true, maxAge: 7*24*3600*1000
    })
    res.json({ id: user.id, email: user.email, name: user.name, roles: user.roles })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Login failed' })
  }
})

// -------- Session helpers --------
router.get('/me', async (req,res) => {
  try {
    const token = req.cookies?.token || (req.headers.authorization||'').replace('Bearer ','')
    if (!token) return res.json(null)
    const { id } = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.json(null)
    res.json({ id: user.id, email: user.email, name: user.name, roles: user.roles })
  } catch {
    res.json(null)
  }
})

router.post('/logout', (req,res) => {
  res.clearCookie('token', { sameSite: 'none', secure: true })
  res.json({ ok: true })
})

export default router
