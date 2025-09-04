import jwt from 'jsonwebtoken'
import { prisma } from '../services/prisma.js'

export function signToken(user) {
  const payload = { id: user.id, roles: user.roles }
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user || user.blocked) return res.status(401).json({ error: 'Unauthorized' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies?.token || (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return next()
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (user && !user.blocked) req.user = user
  } catch {}
  next()
}
