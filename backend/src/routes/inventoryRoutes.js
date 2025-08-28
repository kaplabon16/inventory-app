// backend/src/routes/inventoryRoutes.js
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { isOwnerOrAdmin, canWriteInventory } from '../utils/validators.js';
import { generateCustomId } from '../utils/customId.js';

const prisma = new PrismaClient();
const router = Router();

// ---------- list (home page), mine, canWrite ----------
router.get('/', async (req, res) => {
  const { mine, canWrite } = req.query;
  const userId = req.user?.id;

  if (mine && userId) {
    const list = await prisma.inventory.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { items: true } } },
    });
    return res.json(
      list.map((x) => ({ id: x.id, title: x.title, itemsCount: x._count.items }))
    );
  }

  if (canWrite && userId) {
    const acc = await prisma.inventoryAccess.findMany({
      where: { userId, canWrite: true },
    });
    const invs = await prisma.inventory.findMany({
      where: { id: { in: acc.map((a) => a.inventoryId) } },
      include: { _count: { select: { items: true } } },
    });
    return res.json(
      invs.map((x) => ({ id: x.id, title: x.title, itemsCount: x._count.items }))
    );
  }

  const list = await prisma.inventory.findMany({
    include: {
      _count: { select: { items: true } },
      owner: { select: { name: true } },
      category: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });

  res.json(
    list.map((x) => ({
      id: x.id,
      title: x.title,
      categoryName: x.category.name,
      ownerName: x.owner.name,
      itemsCount: x._count.items,
    }))
  );
});

// ---------- create ----------
router.post('/', requireAuth, async (req, res) => {
  const { title, description, categoryId } = req.body || {};
  const inv = await prisma.inventory.create({
    data: {
      title: title || 'New Inventory',
      description: description || '',
      ownerId: req.user.id,
      categoryId: Number(categoryId || 1),
    },
  });
  res.json(inv);
});

// ---------- get one (with fields, id elements, recent items) ----------
router.get('/:id', async (req, res) => {
  const inv = await prisma.inventory.findUnique({
    where: { id: req.params.id },
    include: { category: true },
  });
  if (!inv) return res.status(404).json({ error: 'Not found' });

  const fields = await prisma.inventoryField.findMany({
    where: { inventoryId: inv.id },
  });
  const elems = await prisma.customIdElement.findMany({
    where: { inventoryId: inv.id },
    orderBy: { order: 'asc' },
  });

  const pack = (type) =>
    [1, 2, 3].map((slot) => {
      const f = fields.find((v) => v.type === type && v.slot === slot);
      return { title: f?.title || '', desc: f?.description || '', show: !!f?.showInTable };
    });

  const items = await prisma.item.findMany({
    where: { inventoryId: inv.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json({
    inventory: inv,
    fields: {
      text: pack('TEXT'),
      mtext: pack('MTEXT'),
      num: pack('NUMBER'),
      link: pack('LINK'),
      bool: pack('BOOL'),
    },
    elements: elems,
    items,
  });
});

// ---------- update inventory (optimistic) ----------
router.put('/:id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' });

  const { version, title, description, publicWrite } = req.body || {};
  const v = Number.isFinite(+version) ? +version : inv.version;

  const result = await prisma.inventory.updateMany({
    where: { id: inv.id, version: v },
    data: { title, description, publicWrite: !!publicWrite, version: { increment: 1 } },
  });
  if (result.count === 0) return res.status(409).json({ error: 'Version conflict' });

  const updated = await prisma.inventory.findUnique({ where: { id: inv.id } });
  res.json(updated);
});

// ---------- fields save ----------
router.post('/:id/fields', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' });

  const { fields } = req.body || {};
  const tx = [];
  const upsert = (type, slot, { title, desc, show }) =>
    prisma.inventoryField.upsert({
      where: { inventoryId_type_slot: { inventoryId: inv.id, type, slot } },
      update: { title, description: desc, showInTable: !!show },
      create: { inventoryId: inv.id, type, slot, title, description: desc, showInTable: !!show },
    });

  ['text', 'mtext', 'num', 'link', 'bool'].forEach((group) => {
    const type = { text: 'TEXT', mtext: 'MTEXT', num: 'NUMBER', link: 'LINK', bool: 'BOOL' }[
      group
    ];
    (fields?.[group] || []).forEach((cfg, idx) => tx.push(upsert(type, idx + 1, cfg)));
  });

  await prisma.$transaction(tx);
  res.json({ ok: true });
});

// ---------- custom id elements save ----------
router.post('/:id/custom-id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' });

  const { elements = [] } = req.body || {};
  await prisma.customIdElement.deleteMany({ where: { inventoryId: inv.id } });
  if (elements.length) {
    await prisma.customIdElement.createMany({
      data: elements.map((e) => ({
        inventoryId: inv.id,
        order: Number(e.order) || 1,
        type: e.type,
        param: e.param || null,
      })),
    });
  }
  res.json({ ok: true });
});

// ---------- access management ----------
router.get('/:id/access', requireAuth, async (req, res) => {
  const list = await prisma.inventoryAccess.findMany({
    where: { inventoryId: req.params.id },
    include: { user: true },
  });
  res.json(list.map((x) => ({ userId: x.userId, name: x.user.name, email: x.user.email, canWrite: x.canWrite })));
});

router.post('/:id/access', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' });

  const { userId, canWrite } = req.body || {};
  await prisma.inventoryAccess.upsert({
    where: { inventoryId_userId: { inventoryId: inv.id, userId } },
    update: { canWrite: !!canWrite },
    create: { inventoryId: inv.id, userId, canWrite: !!canWrite },
  });
  res.json({ ok: true });
});

router.put('/:id/access/:userId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' });

  await prisma.inventoryAccess.update({
    where: { inventoryId_userId: { inventoryId: inv.id, userId: req.params.userId } },
    data: { canWrite: !!req.body.canWrite },
  });
  res.json({ ok: true });
});

router.delete('/:id/access/:userId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' });

  await prisma.inventoryAccess.delete({
    where: { inventoryId_userId: { inventoryId: inv.id, userId: req.params.userId } },
  });
  res.json({ ok: true });
});

// ---------- comments ----------
router.get('/:id/comments', async (req, res) => {
  const list = await prisma.comment.findMany({
    where: { inventoryId: req.params.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(list.map((c) => ({ id: c.id, userName: c.user.name, body: c.body })));
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });

  const c = await prisma.comment.create({
    data: { inventoryId: inv.id, userId: req.user.id, body: req.body?.body || '' },
  });
  res.json(c);
});

// ---------- stats ----------
router.get('/:id/stats', async (req, res) => {
  const id = req.params.id;
  const count = await prisma.item.count({ where: { inventoryId: id } });
  const aggs = await prisma.$queryRaw`
    SELECT AVG(num1) AS num1_avg, AVG(num2) AS num2_avg
    FROM "Item" WHERE "inventoryId" = ${id}
  `;
  res.json({ count, ...(aggs?.[0] || {}) });
});

// ========== ITEMS (fixes: add item, edit, delete, bulk delete) ==========
router.post('/:id/items', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });

  // write permission
  const access = await prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } });
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' });

  const customId = await generateCustomId(inv.id);
  const item = await prisma.item.create({
    data: { inventoryId: inv.id, customId, createdById: req.user.id },
  });
  res.json(item);
});

router.get('/:id/items/:itemId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });

  const item = await prisma.item.findUnique({ where: { id: req.params.itemId } });
  if (!item || item.inventoryId !== inv.id) return res.status(404).json({ error: 'Item not found' });

  const fields = await prisma.inventoryField.findMany({ where: { inventoryId: inv.id } });
  const pack = (type) =>
    [1, 2, 3].map((slot) => {
      const f = fields.find((v) => v.type === type && v.slot === slot);
      return { title: f?.title || '' };
    });

  res.json({
    item,
    fields: {
      text: pack('TEXT'),
      mtext: pack('MTEXT'),
      num: pack('NUMBER'),
      link: pack('LINK'),
      bool: pack('BOOL'),
    },
  });
});

router.put('/:id/items/:itemId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });

  const access = await prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } });
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' });

  const updated = await prisma.item.update({
    where: { id: req.params.itemId },
    data: { ...req.body },
  });
  res.json(updated);
});

router.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });

  const access = await prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } });
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' });

  await prisma.item.delete({ where: { id: req.params.itemId } });
  res.json({ ok: true });
});

router.post('/:id/items/bulk-delete', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ error: 'Not found' });

  const access = await prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } });
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' });

  const ids = (req.body?.ids || []).filter(Boolean);
  if (!ids.length) return res.json({ ok: true });
  await prisma.item.deleteMany({ where: { id: { in: ids }, inventoryId: inv.id } });
  res.json({ ok: true });
});

export default router;
