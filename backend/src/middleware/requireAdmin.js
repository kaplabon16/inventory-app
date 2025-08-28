export function requireAdmin(req, res, next) {
  if (!req.user?.roles?.includes('ADMIN')) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}


routes/

adminRoutes.js

// backend/src/routes/adminRoutes.js
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const router = Router()

// Helper: read JWT from cookie or Authorization header
function getToken(req) {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) return h.slice(7)
  return req.cookies?.token || null
}

// Middleware: require admin (and not blocked)
async function requireAdmin(req, res, next) {
  try {
    const token = getToken(req)
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const me = await prisma.user.findUnique({ where: { id: payload.id } })
    if (!me) return res.status(401).json({ error: 'Unauthorized' })
    if (me.blocked) return res.status(403).json({ error: 'Blocked' })
    if (!me.roles?.includes('admin')) return res.status(403).json({ error: 'Forbidden' })
    req.user = me
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

// -------- Admin APIs --------

// List users with optional search + pagination
// GET /api/admin/users?q=term&skip=0&take=20
router.get('/users', requireAdmin, async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  const skip = Number.isFinite(+req.query.skip) ? +req.query.skip : 0
  const take = Number.isFinite(+req.query.take) ? Math.min(+req.query.take, 100) : 20

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: { id: true, email: true, name: true, roles: true, blocked: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ])

  res.json({ items, total, skip, take })
})

// Block user
// PATCH /api/admin/users/:id/block
router.patch('/users/:id/block', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.update({ where: { id }, data: { blocked: true } })
    res.json({ ok: true, user: { id: user.id, blocked: user.blocked } })
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
})

// Unblock user
// PATCH /api/admin/users/:id/unblock
router.patch('/users/:id/unblock', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.update({ where: { id }, data: { blocked: false } })
    res.json({ ok: true, user: { id: user.id, blocked: user.blocked } })
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
})

// Make admin (adds "admin" to roles if missing)
router.patch('/users/:id/make-admin', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const u = await prisma.user.findUnique({ where: { id } })
    if (!u) return res.status(404).json({ error: 'User not found' })
    const roles = Array.from(new Set([...(u.roles || []), 'admin']))
    const user = await prisma.user.update({ where: { id }, data: { roles } })
    res.json({ ok: true, user: { id: user.id, roles: user.roles } })
  } catch {
    res.status(500).json({ error: 'Failed to update roles' })
  }
})

// Remove admin (can remove from self, per spec)
router.patch('/users/:id/remove-admin', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const u = await prisma.user.findUnique({ where: { id } })
    if (!u) return res.status(404).json({ error: 'User not found' })
    const roles = (u.roles || []).filter(r => r !== 'admin')
    const user = await prisma.user.update({ where: { id }, data: { roles } })
    res.json({ ok: true, user: { id: user.id, roles: user.roles } })
  } catch {
    res.status(500).json({ error: 'Failed to update roles' })
  }
})

// Delete user (DB cascade handles related rows if configured)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await prisma.user.delete({ where: { id } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
})

export default router