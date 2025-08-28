// Soft auth: if a valid JWT is present, populate req.user
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function attachUser(req, _res, next) {
  try {
    const h = req.headers.authorization || ''
    const raw = h.startsWith('Bearer ') ? h.slice(7) : (req.cookies?.token || null)
    if (!raw) return next()
    const { id } = jwt.verify(raw, process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id } })
    if (user && !user.blocked) req.user = user
  } catch { /* ignore */ }
  next()
}
