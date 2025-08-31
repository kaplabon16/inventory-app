import { Router } from 'express'
import { prisma } from '../services/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/', async (_req, res) => {
  const list = await prisma.category.findMany({ orderBy: { name: 'asc' } })
  res.json(list)
})

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const name = (req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Name required' })
  try {
    const c = await prisma.category.create({ data: { name } })
    res.json(c)
  } catch {
    res.status(400).json({ error: 'Category exists' })
  }
})

export default router
