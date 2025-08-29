import { Router } from 'express'
import passport from 'passport'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { configurePassport } from '../config/passport.js'
import { signToken } from '../middleware/auth.js'

const prisma = new PrismaClient()
const router = Router()
configurePassport()
router.use(passport.initialize())

const frontendBase = (() => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173'
  return raw.startsWith('http') ? raw : `https://${raw}`
})()

function normalizeRedirect(r) {
  if (!r || typeof r !== 'string') return '/'
  // only allow same-site paths
  return r.startsWith('/') ? r : '/'
}

function setCookieToken(res, userPayload) {
  const token = signToken(userPayload)
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 3600 * 1000,
  })
  return token
}

function bearerOrCookie(req) {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) return h.slice(7)
  return req.cookies?.token || null
}

/** ---------- OAuth with redirect (state) ---------- **/
router.get('/google', (req, res, next) => {
  const state = encodeURIComponent(normalizeRedirect(req.query.redirect))
  passport.authenticate('google', { scope: ['profile','email'], state })(req, res, next)
})

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${frontendBase}/login?err=google` }),
  async (req, res) => {
    setCookieToken(res, req.user)
    const rd = normalizeRedirect(req.query.state)
    res.redirect(`${frontendBase}${rd}`)
  }
)

router.get('/github', (req, res, next) => {
  const state = encodeURIComponent(normalizeRedirect(req.query.redirect))
  passport.authenticate('github', { scope: ['user:email'], state })(req, res, next)
})

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${frontendBase}/login?err=github` }),
  async (req, res) => {
    setCookieToken(res, req.user)
    const rd = normalizeRedirect(req.query.state)
    res.redirect(`${frontendBase}${rd}`)
  }
)

/** ---------- Email/password ---------- **/
router.post('/register', async (req, res) => {
  try {
    let { email, name, password } = req.body || {}
    email = (email || '').trim().toLowerCase()
    name = (name || '').trim()

    if (!email || !name || !password || password.length < 6) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Name, email and 6+ char password required.' })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return res.status(400).json({ error: 'ALREADY_EXISTS', message: 'Email already registered.' })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, password: hash, roles: [], blocked: false },
    })

    const safe = { id: user.id, email: user.email, name: user.name, roles: user.roles, blocked: user.blocked }
    setCookieToken(res, safe)
    res.json(safe)
  } catch (e) {
    console.error('REGISTER_ERR', e)
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {}
    email = (email || '').trim().toLowerCase()
    if (!email || !password) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Email and password required.' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(400).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' })

    if (user.blocked) return res.status(403).json({ error: 'BLOCKED', message: 'Your account is blocked.' })

    if (!user.password) {
      return res.status(400).json({
        error: 'OAUTH_ONLY',
        message: 'This account uses Google/GitHub. Use social login or set a password after OAuth.',
      })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(400).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' })

    const safe = { id: user.id, email: user.email, name: user.name, roles: user.roles, blocked: user.blocked }
    setCookieToken(res, safe)
    res.json(safe)
  } catch (e) {
    console.error('LOGIN_ERR', e)
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

router.post('/set-password', async (req, res) => {
  try {
    const token = bearerOrCookie(req)
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
    const { id } = jwt.verify(token, process.env.JWT_SECRET)

    const { password } = req.body || {}
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Password must be 6+ characters.' })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({
      where: { id },
      data: { password: hash },
      select: { id: true, email: true, name: true, roles: true, blocked: true },
    })
    res.json({ ok: true, user })
  } catch (e) {
    console.error('SET_PW_ERR', e)
    res.status(401).json({ error: 'UNAUTHORIZED' })
  }
})

router.get('/me', async (req, res) => {
  try {
    const raw = bearerOrCookie(req)
    if (!raw) return res.json(null)
    const { id } = jwt.verify(raw, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, roles: true, blocked: true },
    })
    res.json(user || null)
  } catch {
    res.json(null)
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token', { sameSite: 'none', secure: true })
  res.json({ ok: true })
})

export default router
