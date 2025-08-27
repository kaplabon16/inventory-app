import { Router } from 'express'
import { login, register, me } from '../controllers/authController.js'
import passport from 'passport'

const router = Router()

// Local login/register
router.post('/register', register)
router.post('/login', login)
router.get('/me', me)

// Google & GitHub OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req, res) => res.redirect(`${process.env.FRONTEND_URL}/profile`)
)

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }))
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req, res) => res.redirect(`${process.env.FRONTEND_URL}/profile`)
)

export default router
