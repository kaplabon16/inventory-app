export const isOwnerOrAdmin = (user, inv) => {
  const roles = (user?.roles || []).map(r => r.toLowerCase())
  return roles.includes('admin') || inv.ownerId === user?.id
}

export const canWriteInventory = (user, inv, accessList = []) =>
  isOwnerOrAdmin(user, inv) ||
  (inv.publicWrite && !!user) ||
  accessList.some(a => a.userId === user?.id && a.canWrite)
