import { Router } from 'express'
import passport from 'passport'
import { configurePassport } from '../config/passport.js'
import { signToken } from '../middleware/auth.js'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const router = Router()
configurePassport()

router.use(passport.initialize())

const sendToken = (req, res, user) => {
  const token = signToken(user)
  res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true, maxAge: 7*24*3600*1000 })
  const url = `${process.env.FRONTEND_URL}/`
  res.redirect(url)
}

router.get('/google', passport.authenticate('google', { scope: ['profile','email'] }))
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  async (req, res) => sendToken(req,res,req.user)
)

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }))
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  async (req, res) => sendToken(req,res,req.user)
)

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token || (req.headers.authorization||'').replace('Bearer ','')
    if (!token) return res.json(null)
    const { id } = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id } })
    res.json(user ? { id: user.id, email: user.email, name: user.name, roles: user.roles } : null)
  } catch { res.json(null) }
})

router.post('/logout', (req,res)=>{
  res.clearCookie('token', { sameSite: 'none', secure: true })
  res.json({ ok:true })
})

export default router
