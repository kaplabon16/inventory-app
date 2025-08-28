import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Table({ columns, rows, onSelect, rowLink, emptyText = 'No data' }) {
  const [selected, setSelected] = useState(new Set())
  const nav = useNavigate()

  const toggle = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
    onSelect?.([...next])
  }
  const all = rows.map(r => r.id)
  const toggleAll = () => {
    const allSelected = selected.size === rows.length
    const next = allSelected ? new Set() : new Set(all)
    setSelected(next)
    onSelect?.([...next])
  }

  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="w-10 p-2">
              <input type="checkbox" onChange={toggleAll} checked={selected.size===rows.length && rows.length>0}/>
            </th>
            {columns.map(c => (
              <th key={c.key} className="p-2 text-left">{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const clickable = typeof rowLink === 'function'
            return (
              <tr
                key={r.id}
                className={`border-t ${clickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
                onClick={() => clickable && nav(rowLink(r))}
              >
                <td className="w-10 p-2">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={(e)=>{ e.stopPropagation(); toggle(r.id) }}/>
                </td>
                {columns.map(c => (
                  <td key={c.key} className="p-2">{c.render ? c.render(r[c.key], r) : r[c.key]}</td>
                ))}
              </tr>
            )
          })}
          {rows.length===0 && (
            <tr>
              <td colSpan={columns.length+1} className="p-6 text-center text-gray-500">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
