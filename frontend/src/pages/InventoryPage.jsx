import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import MarkdownBox from '../components/MarkdownBox'
import Toolbar from '../components/Toolbar'
import Table from '../components/Table'
import { useTranslation } from 'react-i18next'
import { renderIdPreview } from '../utils/idPreview'
import { useAuth } from '../store/auth'
import UploadImage from '../components/UploadImage'

const groupLabels = {
  text: 'Text',
  mtext: 'Multiple Text',
  num: 'Numbers',
  link: 'External Links',
  bool: 'Checkboxes (Boolean)',
  image: 'Images',
}

const emptyGroups = () => ({ text: [], mtext: [], num: [], link: [], bool: [], image: [] })

export default function InventoryPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [inv, setInv] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [canWrite, setCanWrite] = useState(false)
  const [tab, setTab] = useState('items')

  const [fields, setFields] = useState(emptyGroups())
  const [order, setOrder] = useState([]) // [{group, slot}]
  const [items, setItems] = useState([])
  const [sel, setSel] = useState([])
  const [version, setVersion] = useState(1)
  const [categories, setCategories] = useState([])
  const [flash, setFlash] = useState('')
  const [stats, setStats] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState('text')

  // Custom ID builder state
  const [elements, setElements] = useState([])   // [{order,type,param?}]
  const [savedElements, setSavedElements] = useState([])
  const [selIdx, setSelIdx] = useState(-1)

  // 🔔 keep hooks before any conditional return
  const [dragIndex, setDragIndex] = useState(-1)

  const toast = (msg) => { setFlash(msg); setTimeout(() => setFlash(''), 2000) }

  const load = async () => {
    setLoadErr('')
    try {
      const { data } = await api.get(`/api/inventories/${id}`)
      setInv(data?.inventory || { id, title: 'Untitled', description: '', publicWrite: false, categoryId: 1, imageUrl: '' })
      setCanEdit(!!data?.canEdit)
      setCanWrite(!!data?.canWrite)
      setItems(Array.isArray(data?.items) ? data.items : [])
      setVersion(data?.inventory?.version || 1)

      // fields grouped + flat order from API
      const g = data?.fields || emptyGroups()
      setFields({
        text:  Array.isArray(g.text)  ? g.text  : [],
        mtext: Array.isArray(g.mtext) ? g.mtext : [],
        num:   Array.isArray(g.num)   ? g.num   : [],
        link:  Array.isArray(g.link)  ? g.link  : [],
        bool:  Array.isArray(g.bool)  ? g.bool  : [],
        image: Array.isArray(g.image) ? g.image : [],
      })
      const flat = Array.isArray(data?.fieldsFlat) ? data.fieldsFlat : []
      setOrder(flat.map(f => ({ group: f.group, slot: f.slot })))

      // custom id elements
      const els = Array.isArray(data?.elements) ? data.elements : []
      setElements(els)
      setSavedElements(els)
      setSelIdx(-1)
    } catch (e) {
      setLoadErr('Failed to load inventory.')
      setInv(null)
      setItems([])
      setElements([])
      setSavedElements([])
    }

    try {
      const cats = await api.get('/api/categories')
      setCategories(Array.isArray(cats.data) ? cats.data : [])
    } catch {
      setCategories([])
    }
  }
  useEffect(() => { load() }, [id])

  const loadStats = async () => {
    try {
      const { data } = await api.get(`/api/inventories/${id}/stats`)
      setStats(data)
    } catch {
      setStats(null)
    }
  }
  useEffect(() => { if (tab === 'stats') loadStats() }, [tab])

  // ---------- ID Preview (live, safe — doesn't advance DB sequence) ----------
  const idPreview = useMemo(() => renderIdPreview(elements || []), [elements])

  const currentFlat = useMemo(() => {
    const titleFor = (g, s) => {
      const key = g === 'NUMBER' ? 'num'
        : g === 'TEXT' ? 'text'
        : g === 'MTEXT' ? 'mtext'
        : g === 'LINK' ? 'link'
        : g === 'BOOL' ? 'bool' : 'image'
      return (fields[key] || [])[s - 1]?.title || `${g} ${s}`
    }
    return order.map(o => ({ ...o, label: titleFor(o.group, o.slot) }))
  }, [order, fields])

  if (loadErr) return <div className="p-6 text-red-600">{loadErr}</div>
  if (!inv) return <div className="p-6">Loading…</div>

  // ------- TABLE COLUMNS -------
  const itemCols = [
    { key: 'customId', title: 'ID', render: (v, r) => <Link to={user ? `/inventories/${id}/item/${r.id}` : '#'} className="text-blue-600">{v}</Link> },
    ...(['text','num','bool'].flatMap((g) =>
      (fields[g] || []).map((cfg, idx) => cfg?.show ? [{
        key: `${g}${idx + 1}`,
        title: (cfg.title || `${g} ${idx + 1}`).replace(/^\w/, s => s.toUpperCase()),
        render: g === 'bool' ? (val) => (val ? '✓' : '') : undefined
      }] : []).flat()
    )),
  ]

  const saveSettings = async () => {
    try {
      const { data } = await api.put(`/api/inventories/${id}`, {
        ...inv,
        imageUrl: inv.imageUrl || null,
        version,
        categoryId: inv.categoryId
      })
      setVersion(data.version)
      setInv(data)
      toast('Saved settings')
    } catch (e) {
      if (e?.response?.status === 409) toast('Version conflict — reload and try again')
      else toast('Save failed')
    }
  }

  const addItem = async () => {
    if (!user) { nav('/login?redirect=' + encodeURIComponent(`/inventories/${id}`)); return }
    if (!canWrite) { toast('You do not have write access.'); return }
    try {
      const { data } = await api.post(`/api/inventories/${id}/items`, {})
      if (data?.id) {
        window.location.href = `/inventories/${id}/item/${data.id}`
      } else {
        toast('Created, but no item id returned.')
        await load()
      }
    } catch {
      toast('Failed to add item')
    }
  }

  const removeSelected = async () => {
    if (!canWrite) { toast('You do not have write access.'); return }
    const ids = Array.isArray(sel) ? sel : []
    if (!ids.length) return
    try {
      await Promise.all(ids.map(itemId => api.delete(`/api/inventories/${id}/items/${itemId}`)))
      setSel([])
      await load()
      toast('Deleted selected items')
    } catch {
      toast('Delete failed for one or more items')
    }
  }

  // ------- FIELD EDITING -------

  const pushNewField = (k) => {
    const next = { ...fields }
    next[k] = [...(next[k] || []), { title: '', desc: '', show: false }]
    setFields(next)

    const type = k === 'num' ? 'NUMBER' :
                 k === 'text' ? 'TEXT' :
                 k === 'mtext' ? 'MTEXT' :
                 k === 'link' ? 'LINK' :
                 k === 'bool' ? 'BOOL'  : 'IMAGE'
    const slot = next[k].length
    setOrder([...order, { group: type, slot }])
  }

  const removeField = (k, idx) => {
    const next = { ...fields }
    next[k] = [...(next[k] || [])]
    next[k].splice(idx, 1)
    setFields(next)

    const type = k === 'num' ? 'NUMBER' :
                 k === 'text' ? 'TEXT' :
                 k === 'mtext' ? 'MTEXT' :
                 k === 'link' ? 'LINK' :
                 k === 'bool' ? 'BOOL'  : 'IMAGE'
    const filtered = order
      .filter(o => !(o.group === type && o.slot === idx + 1))
      .map(o => (o.group === type && o.slot > idx + 1) ? { ...o, slot: o.slot - 1 } : o)
    setOrder(filtered)
  }

  const onDragStart = (i) => (e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move' }
  const onDragOver = (i) => (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  const onDrop = (i) => (e) => {
    e.preventDefault()
    if (dragIndex < 0 || dragIndex === i) return
    const next = [...order]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(i, 0, moved)
    setOrder(next)
    setDragIndex(-1)
  }

  const saveFields = async () => {
    try {
      await api.post(`/api/inventories/${id}/fields`, { fields, order })
      await load()
      toast('Saved field config')
    } catch {
      toast('Failed to save fields')
    }
  }

  // ======== CUSTOM ID BUILDER ========

  const addElem = (type) => {
    const t = type.toUpperCase()
    const defaults = {
      FIXED: { type: 'FIXED', param: '' },
      RAND20: { type: 'RAND20' },
      RAND32: { type: 'RAND32' },
      RAND6: { type: 'RAND6' },
      RAND9: { type: 'RAND9' },
      GUID: { type: 'GUID' },
      DATE: { type: 'DATE', param: 'YYMM' },
      SEQ:  { type: 'SEQ',  param: '0001' }, // min width & leading zeros
    }[t]
    const next = [...elements, { order: elements.length + 1, ...(defaults || { type: 'FIXED', param: '' }) }]
    setElements(next)
    setSelIdx(next.length - 1)
  }

  const moveElem = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= elements.length || to >= elements.length) return
    const next = [...elements]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    // normalize order 1..N
    next.forEach((e, i) => { e.order = i + 1 })
    setElements(next)
    setSelIdx(to)
  }

  const removeElem = (idx) => {
    const next = elements.filter((_, i) => i !== idx).map((e, i) => ({ ...e, order: i + 1 }))
    setElements(next)
    setSelIdx(-1)
  }

  const updateElem = (idx, patch) => {
    const next = elements.map((e, i) => i === idx ? { ...e, ...patch } : e)
    setElements(next)
  }

  const resetElems = () => { setElements(savedElements); setSelIdx(-1) }

  const saveElems = async () => {
    try {
      const payload = elements.map((e, i) => ({ order: i + 1, type: e.type, param: e.param ?? null }))
      const { data } = await api.post(`/api/inventories/${id}/custom-id`, { elements: payload })
      setSavedElements(data.elements || payload)
      toast('Saved ID format')
    } catch {
      toast('Failed to save ID format')
    }
  }

  const testGenerateMany = () => {
    // Front-end preview — doesn’t increment real sequence
    const samples = []
    for (let i = 0; i < 5; i++) samples.push(renderIdPreview(elements || []))
    return samples
  }

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        {canEdit ? (
          <input
            className="px-2 py-1 text-xl font-semibold border rounded"
            value={inv.title}
            onChange={(e) => setInv({ ...inv, title: e.target.value })}
          />
        ) : (
          <div className="text-xl font-semibold">{inv.title}</div>
        )}
        {flash && <span className="ml-2 text-sm text-green-600">{flash}</span>}
        <span className="ml-auto text-sm text-gray-500">
          Category:&nbsp;
          {canEdit ? (
            <select
              className="px-2 py-1 border rounded"
              value={inv.categoryId}
              onChange={(e) => setInv({ ...inv, categoryId: Number(e.target.value) })}
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (categories.find(c => c.id === inv.categoryId)?.name || '-')}
        </span>
        {canEdit && (
          <button onClick={saveSettings} className="px-3 py-1 text-sm border rounded">Save</button>
        )}
      </div>

      <div className="mt-2 text-sm">
        <label className="flex items-center gap-2">
          <span>Public write access</span>
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={!!inv.publicWrite}
            onChange={(e) => setInv({ ...inv, publicWrite: e.target.checked })}
          />
        </label>
      </div>

      <div className="mt-3">
        <UploadImage
          label="Inventory image"
          value={inv.imageUrl || ''}
          onChange={(u) => setInv({ ...inv, imageUrl: u })}
          inventoryId={id}
          canWrite={canWrite || canEdit}
        />
      </div>

      <div className="mt-3">
        <nav className="flex flex-wrap gap-2">
          {['items', 'discussion', 'settings', 'customId', 'access', 'fields', 'stats'].map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-1 border rounded text-sm ${tab === k ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            >
              {k}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'items' && (
        <>
          <Toolbar
            left={<div className="text-sm text-gray-500">Inventory items</div>}
            right={
              <>
                {canWrite && <button onClick={addItem} className="px-2 py-1 text-sm border rounded">Add item</button>}
                {canWrite && <button onClick={removeSelected} className="px-2 py-1 text-sm border rounded">Delete</button>}
              </>
            }
          />
          <Table
            columns={itemCols}
            rows={items}
            onSelect={canWrite ? setSel : undefined}
            emptyText="No items"
          />
        </>
      )}

      {tab === 'settings' && (
        <div className="grid gap-3 mt-3">
          <label className="grid gap-1">
            <span>Description</span>
            {canEdit ? (
              <MarkdownBox value={inv.description || ''} onChange={(v) => setInv({ ...inv, description: v })} />
            ) : (
              <div className="p-3 prose border rounded dark:prose-invert">{inv.description || <i>(no description)</i>}</div>
            )}
          </label>

          {canEdit && (
            <div className="flex gap-2 pt-2">
              <button onClick={saveSettings} className="px-3 py-1 text-sm border rounded">Save</button>
              <button
                onClick={async () => {
                  if (!confirm('Delete this inventory? This cannot be undone.')) return
                  await api.delete(`/api/inventories/${id}`)
                  nav('/profile')
                }}
                className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded"
              >
                Delete inventory
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'customId' && (
        <div className="grid gap-4 mt-4">
          <div className="p-3 border rounded">
            <div className="flex items-center justify-between">
              <div className="font-medium">Custom Inventory Number (ID Builder)</div>
              <div className="text-sm">
                <b>Preview:</b>{' '}
                <code className="px-2 py-1 bg-gray-100 rounded dark:bg-gray-800">{idPreview || '(empty)'}</code>
              </div>
            </div>
          </div>

          {/* Palette */}
          <div className="p-3 border rounded">
            <div className="mb-2 font-medium">Palette</div>
            <div className="flex flex-wrap gap-2">
              {['FIXED','DATE','SEQ','RAND6','RAND9','RAND20','RAND32','GUID'].map(t => (
                <button
                  key={t}
                  className="px-2 py-1 text-sm border rounded"
                  onClick={() => addElem(t)}
                  disabled={!canEdit}
                  title={`Add ${t}`}
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="p-3 border rounded">
            <div className="mb-2 font-medium">Canvas (drag to reorder)</div>
            <ul className="border divide-y rounded">
              {(elements || []).map((e, i) => (
                <li
                  key={`${e.type}-${i}`}
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${selIdx===i ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <button className="cursor-grab" title="Drag up" onClick={() => moveElem(i, Math.max(0, i-1))}>↑</button>
                    <button className="cursor-grab" title="Drag down" onClick={() => moveElem(i, Math.min(elements.length-1, i+1))}>↓</button>
                    <button className="px-2 py-1 text-xs border rounded" onClick={() => setSelIdx(i)}>Select</button>
                    <span className="w-20 text-sm text-gray-500">#{i+1}</span>
                    <span className="font-mono">{e.type}</span>
                    {e.param ? <span className="ml-2 text-xs text-gray-600">({e.param})</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 text-sm border rounded" onClick={() => removeElem(i)} disabled={!canEdit}>Remove</button>
                  </div>
                </li>
              ))}
              {(!elements || elements.length === 0) && (
                <li className="px-3 py-4 text-center text-gray-500">No elements yet — add from the palette</li>
              )}
            </ul>
          </div>

          {/* Config panel */}
          <div className="p-3 border rounded">
            <div className="mb-2 font-medium">Element config</div>
            {selIdx < 0 || !elements[selIdx] ? (
              <div className="p-3 text-gray-500">Select an element to configure</div>
            ) : (
              <>
                <div className="mb-2 text-sm">Selected: <b>{elements[selIdx].type}</b></div>
                {(() => {
                  const cur = elements[selIdx]
                  if (cur.type === 'FIXED') {
                    return (
                      <label className="grid max-w-sm gap-1">
                        <span>Value (text / separators)</span>
                        <input
                          className="px-2 py-1 border rounded"
                          value={cur.param || ''}
                          onChange={(e) => updateElem(selIdx, { param: e.target.value })}
                          disabled={!canEdit}
                        />
                      </label>
                    )
                  }
                  if (cur.type === 'DATE') {
                    return (
                      <label className="grid max-w-sm gap-1">
                        <span>Format (dayjs format)</span>
                        <input
                          className="px-2 py-1 border rounded"
                          placeholder="e.g. YYMM, YYYYMMDD, YYYY-MM"
                          value={cur.param || 'YYMM'}
                          onChange={(e) => updateElem(selIdx, { param: e.target.value || 'YYMM' })}
                          disabled={!canEdit}
                        />
                      </label>
                    )
                  }
                  if (cur.type === 'SEQ') {
                    return (
                      <label className="grid max-w-sm gap-1">
                        <span>Width (leading zeros)</span>
                        <input
                          className="px-2 py-1 border rounded"
                          placeholder="e.g. 0001, 000001"
                          value={cur.param || '0001'}
                          onChange={(e) => {
                            const v = e.target.value || '0001'
                            updateElem(selIdx, { param: v })
                          }}
                          onBlur={(e)=>{ if(!e.target.value) updateElem(selIdx,{param:'0001'}) }}
                          disabled={!canEdit}
                        />
                        <div className="text-xs text-gray-500">Use a mask like <code>0001</code> to set minimum width.</div>
                      </label>
                    )
                  }
                  // RAND/GUID have no extra config
                  return <div className="text-sm text-gray-500">No options for {cur.type}</div>
                })()}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button className="px-3 py-1 text-sm border rounded" onClick={saveElems} disabled={!canEdit}>Save format</button>
            <button className="px-3 py-1 text-sm border rounded" onClick={resetElems} disabled={!canEdit}>Reset</button>
            <button className="px-3 py-1 text-sm border rounded" onClick={() => alert(testGenerateMany().join('\n'))}>Test generate</button>
            <div className="text-sm text-gray-500">Uniqueness enforced per inventory; changing format doesn’t rewrite existing items.</div>
          </div>
        </div>
      )}

      {tab === 'access' && (<AccessTab id={id} canEdit={canEdit} />)}
      {tab === 'discussion' && <DiscussionTab id={id} />}

      {tab === 'fields' && (
        <div className="grid gap-6 mt-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Custom Fields</div>
            {canWrite && (
              <button onClick={() => setShowAdd(true)} className="px-3 py-1 text-sm border rounded">
                + Add Field
              </button>
            )}
          </div>

          <div className="p-3 border rounded">
            <div className="mb-2 font-medium">Reorder (drag to change)</div>
            <ul className="border divide-y rounded">
              {currentFlat.map((f, i) => (
                <li
                  key={`${f.group}-${f.slot}-${i}`}
                  draggable={canWrite}
                  onDragStart={(e)=>{ setDragIndex(i); e.dataTransfer.effectAllowed='move' }}
                  onDragOver={(e)=>{ e.preventDefault(); e.dataTransfer.dropEffect='move' }}
                  onDrop={(e)=>{ e.preventDefault(); if (dragIndex<0 || dragIndex===i) return; const next=[...order]; const [m]=next.splice(dragIndex,1); next.splice(i,0,m); setOrder(next); setDragIndex(-1) }}
                  className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="cursor-grab" title="Drag">≡</span>
                    <span className="text-sm text-gray-500 w-28">{f.group}#{f.slot}</span>
                    <span>{f.label}</span>
                  </div>
                </li>
              ))}
              {currentFlat.length === 0 && (
                <li className="px-3 py-4 text-center text-gray-500">No fields yet</li>
              )}
            </ul>
          </div>

          {(['text', 'mtext', 'num', 'link', 'bool', 'image']).map((group) => (
            <div key={group} className="p-3 border rounded">
              <div className="mb-2 font-medium">{groupLabels[group]}</div>
              {(fields[group] || []).map((f, idx) => (
                <div key={idx} className="grid items-center gap-2 mb-2 md:grid-cols-5">
                  <input
                    disabled={!canWrite}
                    className="px-2 py-1 border rounded"
                    placeholder="Title"
                    value={f.title}
                    onChange={(e) => {
                      const next = { ...fields }
                      next[group][idx].title = e.target.value
                      setFields(next)
                    }}
                  />
                  <input
                    disabled={!canWrite}
                    className="px-2 py-1 border rounded"
                    placeholder="Description"
                    value={f.desc}
                    onChange={(e) => {
                      const next = { ...fields }
                      next[group][idx].desc = e.target.value
                      setFields(next)
                    }}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={!canWrite}
                      checked={!!f.show}
                      onChange={(e) => {
                        const next = { ...fields }
                        next[group][idx].show = e.target.checked
                        setFields(next)
                      }}
                    />
                    <span>Show in table</span>
                  </label>
                  {canWrite && (
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 text-sm border rounded"
                        onClick={() => {
                          if (idx === 0) return
                          const next = { ...fields }
                          const arr = [...next[group]]
                          ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
                          next[group] = arr
                          setFields(next)

                          const type = group === 'num' ? 'NUMBER' :
                                       group === 'text' ? 'TEXT' :
                                       group === 'mtext' ? 'MTEXT' :
                                       group === 'link' ? 'LINK' :
                                       group === 'bool' ? 'BOOL'  : 'IMAGE'
                          const aSlot = idx, bSlot = idx + 1
                          const nextOrder = order.map(o => {
                            if (o.group === type && o.slot === aSlot) return { ...o, slot: bSlot }
                            if (o.group === type && o.slot === bSlot) return { ...o, slot: aSlot }
                            return o
                          })
                          setOrder(nextOrder)
                        }}
                      >
                        ↑
                      </button>
                      <button
                        className="px-2 py-1 text-sm border rounded"
                        onClick={() => {
                          const next = { ...fields }
                          const arr = [...next[group]]
                          if (idx >= arr.length - 1) return
                          ;[arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]
                          next[group] = arr
                          setFields(next)

                          const type = group === 'num' ? 'NUMBER' :
                                       group === 'text' ? 'TEXT' :
                                       group === 'mtext' ? 'MTEXT' :
                                       group === 'link' ? 'LINK' :
                                       group === 'bool' ? 'BOOL'  : 'IMAGE'
                          const aSlot = idx + 2, bSlot = idx + 1
                          const nextOrder = order.map(o => {
                            if (o.group === type && o.slot === aSlot) return { ...o, slot: bSlot }
                            if (o.group === type && o.slot === bSlot) return { ...o, slot: aSlot }
                            return o
                          })
                          setOrder(nextOrder)
                        }}
                      >
                        ↓
                      </button>
                      <button
                        className="px-2 py-1 text-sm border rounded"
                        onClick={() => removeField(group, idx)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {canWrite && (
                <div className="mt-2">
                  <button
                    className="px-3 py-1 text-sm border rounded"
                    onClick={() => pushNewField(group)}
                  >
                    Add {groupLabels[group].replace(/s$/, '')}
                  </button>
                </div>
              )}
            </div>
          ))}

          {canWrite && (
            <div>
              <button className="px-3 py-1 text-sm border rounded" onClick={saveFields}>Save</button>
            </div>
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="grid gap-3 mt-3">
          {!stats ? <div className="p-4">Loading…</div> : (
            <>
              <div className="p-3 border rounded"><b>Items total:</b> {stats.count}</div>
            </>
          )}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="w-full max-w-sm p-4 bg-white rounded shadow dark:bg-gray-900">
            <div className="mb-3 text-lg font-semibold">Create an Element</div>
            <label className="grid gap-1 mb-3">
              <span className="text-sm">Type</span>
              <select className="px-2 py-1 border rounded" value={newType} onChange={(e)=>setNewType(e.target.value)}>
                <option value="text">Text</option>
                <option value="mtext">Multi-line text</option>
                <option value="num">Number</option>
                <option value="link">External link</option>
                <option value="bool">Checkbox</option>
                <option value="image">Image</option>
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 text-sm border rounded" onClick={()=>setShowAdd(false)}>Cancel</button>
              <button className="px-3 py-1 text-sm border rounded" onClick={()=>{
                pushNewField(newType)
                setShowAdd(false)
              }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AccessTab({ id, canEdit }) {
  const [users, setUsers] = useState([])
  const [list, setList] = useState([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('name')

  const load = async () => {
    try {
      const { data } = await api.get(`/api/inventories/${id}/access`)
      setList(Array.isArray(data) ? data : [])
    } catch { setList([]) }
  }
  useEffect(() => { load() }, [id])

  const findUsers = async (text) => {
    try {
      const { data } = await api.get('/api/users/search', { params: { q: text } })
      setUsers(Array.isArray(data) ? data : [])
    } catch { setUsers([]) }
  }
  useEffect(() => { if (q) findUsers(q) }, [q])

  return (
    <div className="grid gap-3 mt-3">
      {canEdit && (
        <>
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type email or name" className="flex-1 px-2 py-1 border rounded" />
          </div>
          {q && (
            <div className="p-2 border rounded">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between py-1">
                  <div>{u.name} &lt;{u.email}&gt;</div>
                  <button className="px-2 py-1 text-sm border rounded"
                    onClick={async () => {
                      await api.post(`/api/inventories/${id}/access`, { userId: u.id, canWrite: true })
                      setQ(''); await load()
                    }}>Add</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm">Sort:</span>
        <select className="px-2 py-1 border rounded" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">name</option>
          <option value="email">email</option>
        </select>
      </div>
      <div className="border rounded">
        {[...list].sort((a, b) => String(a[sort]).localeCompare(String(b[sort]))).map(x => (
          <div key={x.userId} className="flex items-center justify-between px-3 py-2 border-b">
            <div>{x.name} &lt;{x.email}&gt;</div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled={!canEdit} checked={!!x.canWrite} onChange={async (e) => {
                  await api.put(`/api/inventories/${id}/access/${x.userId}`, { canWrite: e.target.checked })
                  await load()
                }} /> write
              </label>
              {canEdit && (
                <button className="px-2 py-1 text-sm border rounded"
                  onClick={async () => { await api.delete(`/api/inventories/${id}/access/${x.userId}`); await load() }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="p-4 text-center text-gray-500">No users</div>}
      </div>
    </div>
  )
}

function DiscussionTab({ id }) {
  const [list, setList] = useState([])
  const [txt, setTxt] = useState('')

  const load = async () => {
    try {
      const { data } = await api.get(`/api/inventories/${id}/comments`)
      setList(Array.isArray(data) ? data : [])
    } catch { setList([]) }
  }
  useEffect(() => { load() }, [id])

  const post = async () => {
    const body = (txt || '').trim()
    if (!body) return
    await api.post(`/api/inventories/${id}/comments`, { body })
    setTxt(''); await load()
  }

  return (
    <div className="grid gap-3 mt-3">
      <div className="p-2 border rounded">
        {list.map(c => (
          <div key={c.id} className="py-2 border-b">
            <div className="text-sm text-gray-500">{c.userName}</div>
            <div>{c.body}</div>
          </div>
        ))}
        {list.length === 0 && <div className="p-4 text-center text-gray-500">No comments</div>}
      </div>
      <div className="flex gap-2">
        <input value={txt} onChange={(e) => setTxt(e.target.value)} className="flex-1 px-2 py-1 border rounded" placeholder="Write a comment…" />
        <button onClick={post} className="px-3 py-1 text-sm border rounded">Post</button>
      </div>
    </div>
  )
}
