import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../services/prisma.js'

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
    if (!me.roles?.includes('ADMIN')) return res.status(403).json({ error: 'Forbidden' })
    req.user = me
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

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

router.patch('/users/:id/block', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.update({ where: { id }, data: { blocked: true } })
    res.json({ ok: true, user: { id: user.id, blocked: user.blocked } })
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
})

router.patch('/users/:id/unblock', requireAdmin, async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.update({ where: { id }, data: { blocked: false } })
    res.json({ ok: true, user: { id: user.id, blocked: user.blocked } })
  } catch {
    res.status(404).json({ error: 'User not found' })
  }
})

router.patch('/users/:id/make-admin', requireAdmin, async (req, res) => {
  const { id } = req.params
  const u = await prisma.user.findUnique({ where: { id } })
  if (!u) return res.status(404).json({ error: 'User not found' })
  const roles = Array.from(new Set([...(u.roles || []), 'ADMIN']))
  const user = await prisma.user.update({ where: { id }, data: { roles } })
  res.json({ ok: true, user: { id: user.id, roles: user.roles } })
})

router.patch('/users/:id/remove-admin', requireAdmin, async (req, res) => {
  const { id } = req.params
  const u = await prisma.user.findUnique({ where: { id } })
  if (!u) return res.status(404).json({ error: 'User not found' })
  const roles = (u.roles || []).filter(r => r !== 'ADMIN')
  const user = await prisma.user.update({ where: { id }, data: { roles } })
  res.json({ ok: true, user: { id: user.id, roles: user.roles } })
})

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