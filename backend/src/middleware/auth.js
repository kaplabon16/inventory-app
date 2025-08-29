import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export function signToken(user) {
  const payload = { id: user.id, roles: user.roles }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token || (req.headers.authorization||'').replace('Bearer ','')
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

// Attach req.user if a valid token exists; otherwise continue silently
export async function optionalAuth(req, _res, next) {
  try {
    const raw = req.cookies?.token || (req.headers.authorization||'').replace('Bearer ','')
    if (!raw) return next()
    const { id } = jwt.verify(raw, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id } })
    if (user && !user.blocked) req.user = user
  } catch { /* ignore */ }
  next()
}

export function requireAdmin(req, res, next) {
  const roles = req.user?.roles || []
  if (!roles.includes('ADMIN')) return res.status(403).json({ error: 'Admin only' })
  next()
}
