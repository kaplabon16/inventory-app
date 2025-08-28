// backend/src/routes/adminRoutes.js
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const router = Router()

function getToken(req) {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) return h.slice(7)
  return req.cookies?.token || null
}

async function requireAdmin(req, res, next) {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const me = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!me) return res.status(401).json({ error: 'Unauthorized' })
    if (me.blocked) return res.status(403).json({ error: 'Blocked' })
    // FIX: role casing
    if (!me.roles?.includes('ADMIN')) return res.status(403).json({ error: 'Forbidden' })
    req.user = me
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

// ... rest unchanged ...
export default router
