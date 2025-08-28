// backend/src/utils/validators.js
export const isOwnerOrAdmin = (user, inv) => {
  const roles = user?.roles || [];
  const isAdmin = roles.includes('ADMIN') || roles.includes('admin');
  return isAdmin || inv.ownerId === user?.id;
};

export const canWriteInventory = (user, inv, accessList = []) => {
  const roles = user?.roles || [];
  const isAdmin = roles.includes('ADMIN') || roles.includes('admin');
  return (
    isAdmin ||
    inv.ownerId === user?.id ||
    (inv.publicWrite && !!user) ||
    accessList.some((a) => a.userId === user?.id && a.canWrite)
  );
};
