export const isOwnerOrAdmin = (user, inv) =>
  user?.roles?.includes('ADMIN') || inv.ownerId === user?.id

export const canWriteInventory = (user, inv, accessList = []) =>
  isOwnerOrAdmin(user, inv) ||
  (inv.publicWrite && !!user) ||
  accessList.some(a => a.userId === user?.id && a.canWrite)
