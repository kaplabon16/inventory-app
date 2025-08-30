import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

// (kept empty to avoid duplicate mounting)
// See searchRoutes for actual search implementation.

export default router