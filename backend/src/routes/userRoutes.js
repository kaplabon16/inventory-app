import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const prisma = new PrismaClient()
const router = Router()

router.get('/', requireAuth, requireAdmin, async (_req,res)=>{
  const users = await prisma.user.findMany({ orderBy:{ createdAt:'desc' }})
  res.json(users)
})

router.get('/search', requireAuth, async (req,res)=>{
  const q = (req.query.q||'').toString()
  if (!q) return res.json([])
  const users = await prisma.$queryRawUnsafe(
    `SELECT id, name, email FROM "User"
     WHERE lower(name) LIKE lower($1) OR lower(email) LIKE lower($1)
     ORDER BY name LIMIT 10`,
    `%${q}%`
  )
  res.json(users)
})

router.post('/make-admin', requireAuth, requireAdmin, async (req,res)=>{
  const { ids=[] } = req.body || {}
  for (const id of ids) {
    const u = await prisma.user.findUnique({ where:{ id } })
    if (!u) continue
    const roles = Array.from(new Set([...(u.roles||[]), 'admin']))
    await prisma.user.update({ where:{ id }, data:{ roles } })
  }
  res.json({ ok:true })
})
router.post('/remove-admin', requireAuth, requireAdmin, async (req,res)=>{
  const { ids=[] } = req.body || {}
  for (const id of ids) {
    const u = await prisma.user.findUnique({ where:{ id } })
    if (!u) continue
    const roles = (u.roles||[]).filter(r => r !== 'admin')
    await prisma.user.update({ where:{ id }, data:{ roles } })
  }
  res.json({ ok:true })
})
router.post('/block', requireAuth, requireAdmin, async (req,res)=>{
  const { ids=[] } = req.body || {}
  await prisma.user.updateMany({ where:{ id:{ in: ids } }, data:{ blocked:true } })
  res.json({ ok:true })
})
router.post('/unblock', requireAuth, requireAdmin, async (req,res)=>{
  const { ids=[] } = req.body || {}
  await prisma.user.updateMany({ where:{ id:{ in: ids } }, data:{ blocked:false } })
  res.json({ ok:true })
})

export default router
