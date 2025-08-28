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
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

