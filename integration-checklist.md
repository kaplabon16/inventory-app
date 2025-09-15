Salesforce (profile → Account+Contact): FOUND

- backend/src/routes/integrations/salesforceRoutes.js:113
  router.post('/sync-self', requireAuth, async (req, res) => {
    const account = await sf.sfRequest('/sobjects/Account', { method: 'POST', body: { Name: company, Phone: phone } })
    const contact = await sf.sfRequest('/sobjects/Contact', { method: 'POST', body: { ... , AccountId: account?.id } })

- frontend/src/pages/Profile.jsx:67
  const { data } = await api.post(apiUrl("/integrations/salesforce/sync-self"), { company, phone, title })
  ...
  <p className="mb-3 text-sm ...">Create an Account + linked Contact in your Salesforce Dev org.</p>


Odoo (inventory API token + aggregates): FOUND

- backend/src/routes/inventoryRoutes.js:500
  // ===== API token generation for external/public aggregate =====
  router.post('/:id/api-token', requireAuth, async (req, res) => { ... res.json({ ok: true, token: row.token }) })

- backend/src/routes/publicApiRoutes.js:8
  // GET /api/public/inventory-aggregate?token=...
  router.get('/public/inventory-aggregate', async (req, res) => { ... res.json({ ok: true, inventoryId: id, count, likes, numbers: { ... } }) })

- frontend/src/pages/InventoryPage.jsx:401
  <div className="...">External API Access Token (for Odoo import)</div>
  const url = `${window.location.origin}/api/public/inventory-aggregate?token=${encodeURIComponent(data.token)}`

- odoo/odoo_addons/inventory_viewer/models/inventory.py:13
  # numeric aggregates
  ag = (data.get("aggregates") or {})


Power Automate (support ticket JSON upload to OneDrive/Dropbox): PARTIAL

- backend/src/routes/supportRoutes.js:43
  const uploaded = await uploadSupportJson({ filenamePrefix: 'support_ticket', json: payload })
  res.json({ ok: true, uploaded })

- backend/src/utils/storageUpload.js:4
  const PROVIDER = (process.env.SUPPORT_UPLOAD_PROVIDER || 'dropbox').toLowerCase()
  ...
  export async function uploadSupportJson(...) { if (PROVIDER !== 'dropbox') throw new Error('Only Dropbox is supported by this build') }

- frontend/src/components/SupportTicketModal.jsx:33
  <div className="text-lg font-semibold">Create support ticket</div>
  const { data } = await api.post(apiUrl("/support/ticket"), { summary, priority, inventoryId, link })

Notes
- OneDrive integration: NOT FOUND (no references to "onedrive" in code); Dropbox upload is implemented and used.
