import { createServer } from 'http'
import app from './app.js'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

// Seed basic categories if empty
async function seed() {
  const c = await prisma.category.count()
  if (c === 0) {
    await prisma.category.createMany({
      data: [
        { name: 'Equipment' },
        { name: 'Furniture' },
        { name: 'Book' },
        { name: 'Other' }
      ]
    })
    console.log('Seeded categories')
  }
}
seed().catch(console.error)

const server = createServer(app)
const PORT = process.env.PORT || 5045
server.listen(PORT, () => console.log(`API on :${PORT}`))
