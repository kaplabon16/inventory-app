import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis
export const prisma = globalForPrisma.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}
