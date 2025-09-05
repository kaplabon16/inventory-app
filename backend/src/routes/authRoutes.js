import { Router } from 'express'
import passport from 'passport'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { prisma } from '../services/prisma.js'
import { configurePassport } from '../config/passport.js'
import { signToken } from '../middleware/auth.js'

const router = Router()

configurePassport()
router.use(passport.initialize())

const frontendBase = (() => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173'
  return raw.startsWith('http') ? raw : `https://${raw}`
})()

function normalizeRedirect(r) {
  if (!r || typeof r !== 'string') return '/profile'
  return r.startsWith('/') ? r : '/profile'
}

function setCookieToken(res, userPayload) {
  const token = signToken(userPayload)
  const opts = {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  }
  res.cookie('token', token, opts)
  return token
}

function bearerOrCookie(req) {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) return h.slice(7)
  return req.cookies?.token || null
}



router.get('/google', (req, res, next) => {
  try {
    const state = encodeURIComponent(normalizeRedirect(req.query.redirect))
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state,
      session: false
    })(req, res, next)
  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    res.redirect(`${frontendBase}/login?err=google`)
  }
})

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${frontendBase}/login?err=google`
  }, async (err, user, info) => {
    try {
      if (err || !user) {
        if (err) console.error('Google OAuth error:', err)
        if (!user) console.error('No user returned from Google:', info)
        return res.redirect(`${frontendBase}/login?err=google`)
      }

 
      const token = setCookieToken(res, user)
      const rd = normalizeRedirect(
        typeof req.query.state === 'string' ? decodeURIComponent(req.query.state) : ''
      )
      const target = `${frontendBase}/oauth#token=${encodeURIComponent(token)}&rd=${encodeURIComponent(rd)}`
      return res.redirect(target)
    } catch (error) {
      console.error('Google OAuth callback error:', error)
      res.redirect(`${frontendBase}/login?err=google`)
    }
  })(req, res, next)
})



router.get('/github', (req, res, next) => {
  try {
    const state = encodeURIComponent(normalizeRedirect(req.query.redirect))
    passport.authenticate('github', {
      scope: ['user:email'],
      state,
      session: false
    })(req, res, next)
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error)
    res.redirect(`${frontendBase}/login?err=github`)
  }
})

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${frontendBase}/login?err=github`
  }, async (err, user, info) => {
    try {
      if (err || !user) {
        if (err) console.error('GitHub OAuth error:', err)
        if (!user) console.error('No user returned from GitHub:', info)
        return res.redirect(`${frontendBase}/login?err=github`)
      }

      // ✅ HYBRID: cookie + hash token
      const token = setCookieToken(res, user)
      const rd = normalizeRedirect(
        typeof req.query.state === 'string' ? decodeURIComponent(req.query.state) : ''
      )
      const target = `${frontendBase}/oauth#token=${encodeURIComponent(token)}&rd=${encodeURIComponent(rd)}`
      return res.redirect(target)
    } catch (error) {
      console.error('GitHub OAuth callback error:', error)
      res.redirect(`${frontendBase}/login?err=github`)
    }
  })(req, res, next)
})


router.post('/register', async (req, res) => {
  try {
    let { email, name, password } = req.body || {}
    email = (email || '').trim().toLowerCase()
    name = (name || '').trim()

    if (!email || !name || !password || password.length < 6) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Name, email and 6+ char password required.' })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(400).json({ error: 'ALREADY_EXISTS', message: 'Email already registered.' })

    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name, password: hash, roles: [], blocked: false },
    })

    const safe = { id: user.id, email: user.email, name: user.name, roles: user.roles, blocked: user.blocked }
    const token = setCookieToken(res, safe)
    res.json({ ...safe, token })
  } catch (e) {
    console.error('REGISTER_ERR', e)
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {}
    email = (email || '').trim().toLowerCase()
    if (!email || !password) return res.status(400).json({ error: 'INVALID_INPUT', message: 'Email and password required.' })

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
    const token = setCookieToken(res, safe)
    res.json({ ...safe, token })
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
  const opts = {
    sameSite: 'none',
    secure: true,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  }
  res.clearCookie('token', opts)
  res.json({ ok: true })
})

export default router
