import { useEffect, useMemo, useRef, useState } from "react"


export default function Table({ columns, rows, selected, onSelect, rowLink, emptyText = "No data" }) {
  const controlled = Array.isArray(selected)
  const [internal, setInternal] = useState(() => new Set())
  const sel = useMemo(() => (controlled ? new Set(selected) : internal), [controlled, selected, internal])

  useEffect(() => {
    if (controlled) setInternal(new Set(selected))
  }, [controlled, selected])

  const setSel = (nextSet) => {
    if (!controlled) setInternal(nextSet)
    onSelect?.([...nextSet])
  }

  const allIds = rows.map(r => String(r.id))
  const allSelected = allIds.length > 0 && allIds.every(id => sel.has(String(id)))
  const someSelected = allIds.some(id => sel.has(String(id)))

  const headerRef = useRef(null)
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = !allSelected && someSelected
  }, [allSelected, someSelected])

  const toggleAll = (checked) => {
    const next = new Set(checked ? allIds : [])
    setSel(next)
  }

  const toggleOne = (id, checked) => {
    const next = new Set(sel)
    if (checked) next.add(String(id))
    else next.delete(String(id))
    setSel(next)
  }

  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            {onSelect && (
              <th className="w-10 p-2">
                <input
                  ref={headerRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
            )}
            {columns.map(c => <th key={c.key} className="p-2 text-left">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={(columns.length + (onSelect ? 1 : 0))} className="p-6 text-center text-gray-500">
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map(r => {
            const id = String(r.id)
            const checked = sel.has(id)
            const clickable = !!rowLink
            return (
              <tr
                key={id}
                className={`border-t ${clickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
                onClick={() => { if (clickable) window.location.assign(rowLink(r)) }}
              >
                {onSelect && (
                  <td className="w-10 p-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleOne(id, e.target.checked)}
                    />
                  </td>
                )}
                {columns.map(c => (
                  <td key={c.key} className="p-2">
                    {c.render ? c.render(r[c.key], r) : r[c.key]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
