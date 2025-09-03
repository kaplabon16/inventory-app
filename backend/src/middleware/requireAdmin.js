export function requireAdmin(req, _res, next) {
  const roles = req.user?.roles || [];
  const isAdmin = roles.includes('ADMIN') || roles.includes('admin');
  if (!isAdmin) {
    return _res.status(403).json({ error: 'Admin only' });
  }
  next();
}

