import { useSearchParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import Table from '../components/Table'
import { useTranslation } from 'react-i18next'

export default function Search() {
  const { t } = useTranslation()
  const [sp] = useSearchParams()
  const q = sp.get('q') || ''
  const [rows, setRows] = useState([])

  useEffect(()=>{
    let ignore = false
    if (!q) {
      setRows([])
      return () => { ignore = true }
    }

    const translateOrFallback = (key, idx, fallback) => {
      const translated = t(key, { index: idx })
      return translated === key ? fallback : translated
    }

    const yesText = (() => {
      const value = t('yes')
      return value === 'yes' ? 'Yes' : value
    })()
    const noText = (() => {
      const value = t('no')
      return value === 'no' ? 'No' : value
    })()

    const normalizeValue = (v) => {
      if (typeof v === 'number') return Number.isFinite(v) ? v.toString() : ''
      if (typeof v === 'boolean') return v ? yesText : noText
      if (typeof v === 'string') return v.trim()
      return ''
    }

    const formatSlot = (item, idx) => {
      const inventoryFields = item?.inventoryFields || null
      const slotIndex = idx - 1
      const candidates = [
        { key: `text${idx}`, fieldKey: 'text', translationKey: 'text_field', fallback: `Text ${idx}` },
        { key: `mtext${idx}`, fieldKey: 'mtext', translationKey: 'multiline_field', fallback: `Long Text ${idx}` },
        { key: `num${idx}`, fieldKey: 'num', translationKey: 'number_field', fallback: `Number ${idx}` },
        { key: `bool${idx}`, fieldKey: 'bool', translationKey: 'bool_field', fallback: `Boolean ${idx}` },
        { key: `link${idx}`, fieldKey: 'link', translationKey: 'link_field', fallback: `Link ${idx}`, isLink: true }
      ]

      for (const cand of candidates) {
        const raw = item?.[cand.key]
        if (raw === null || raw === undefined) continue
        const value = normalizeValue(raw)
        if (!value) continue
        const configured = inventoryFields?.[cand.fieldKey]?.[slotIndex]?.title?.trim()
        const label = configured && configured.length > 0
          ? configured
          : translateOrFallback(cand.translationKey, idx, cand.fallback)
        return { value, label, isLink: !!cand.isLink }
      }
      return { value: '', label: '', isLink: false }
    }

    const renderableRows = (items) => items.map((item) => {
      const slot1 = formatSlot(item, 1)
      const slot2 = formatSlot(item, 2)
      const slot3 = formatSlot(item, 3)
      return {
        ...item,
        invTitle: item?.inventory?.title || '',
        t1: slot1.value,
        t2: slot2.value,
        t3: slot3.value,
        t1Label: slot1.label,
        t2Label: slot2.label,
        t3Label: slot3.label,
        t1IsLink: slot1.isLink,
        t2IsLink: slot2.isLink,
        t3IsLink: slot3.isLink
      }
    })

    ;(async()=>{
      try {
        const { data } = await api.get('/api/search', { params: { q } })
        if (ignore) return
        const items = Array.isArray(data.items) ? data.items : []
        setRows(renderableRows(items))
      } catch {
        if (!ignore) setRows([])
      }
    })()

    return () => { ignore = true }
  },[q, t])

  const renderFieldCell = (key) => (value, row) => {
    if (!value) return ''
    const label = row?.[`${key}Label`]
    const isLink = row?.[`${key}IsLink`]
    const content = isLink ? (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
        {value}
      </a>
    ) : value

    return label ? (
      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div>{content}</div>
      </div>
    ) : content
  }

  const cols = [
    { key: 'customId', title: 'ID', render:(v,r)=><Link to={`/inventories/${r.inventoryId}/item/${r.id}`} className="text-blue-600">{v}</Link> },
    { key: 'invTitle', title: 'Inventory' },
    { key: 't1', title: 'Field 1', render: renderFieldCell('t1') },
    { key: 't2', title: 'Field 2', render: renderFieldCell('t2') },
    { key: 't3', title: 'Field 3', render: renderFieldCell('t3') }
  ]

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <div className="mb-2 text-sm text-gray-500">{t('search')}: <b>{q}</b></div>
      <Table columns={cols} rows={rows}/>
    </div>
  )
}
