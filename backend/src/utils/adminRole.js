import { prisma } from '../services/prisma.js'

function buildAdminSet() {
  const chunks = [process.env.DEFAULT_ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .flatMap(value => String(value).split(/[,\s]+/))
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
  return new Set(chunks)
}

const adminEmailSet = buildAdminSet()

export function isAdminEmail(email) {
  if (!email) return false
  return adminEmailSet.has(String(email).trim().toLowerCase())
}

export async function ensureAdminRole(user) {
  if (!user?.id || !user?.email) return user

  const email = String(user.email).trim().toLowerCase()
  if (!isAdminEmail(email)) return user

  const roles = Array.isArray(user.roles) ? user.roles : []
  if (roles.includes('ADMIN')) return user

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { roles: { set: [...roles, 'ADMIN'] } },
    })
    return updated
  } catch (error) {
    console.error('ensureAdminRole failed for', email, error)
    return user
  }
}
