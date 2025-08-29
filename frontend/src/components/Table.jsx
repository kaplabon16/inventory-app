export default function Table({ columns, rows, onSelect, rowLink, emptyText = "No data" }) {
  const toggle = (id, selected, setSelected) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
    onSelect?.([...next])
  }
  const allIds = rows.map(r => r.id)

  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            {onSelect && (
              <th className="w-10 p-2">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    const checked = e.target.checked
                    const next = new Set(checked ? allIds : [])
                    onSelect?.([...next])
                    // local selected state not held here anymore
                  }}
                />
              </th>
            )}
            {columns.map(c => <th key={c.key} className="p-2 text-left">{c.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={(columns.length + (onSelect?1:0))} className="p-6 text-center text-gray-500">{emptyText}</td></tr>
          )}
          {rows.map(r => (
            <tr
              key={r.id}
              className={`border-t ${rowLink ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
              onClick={() => { if (rowLink) window.location.assign(rowLink(r)) }}
            >
              {onSelect && (
                <td className="w-10 p-2" onClick={(e)=>e.stopPropagation()}>
                  <input
                    type="checkbox"
                    onChange={(e)=>{
                      // consumer holds selection; emit single toggle
                      onSelect?.([r.id, e.target.checked ? 'add' : 'remove'])
                    }}
                  />
                </td>
              )}
              {columns.map(c => (
                <td key={c.key} className="p-2">{c.render ? c.render(r[c.key], r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
