import { useMemo, useRef, useState } from "react"

const TYPES = [
  { key: 'text',  label: 'Single-line' },
  { key: 'mtext', label: 'Multi-line' },
  { key: 'num',   label: 'Number' },
  { key: 'link',  label: 'Link' },
  { key: 'bool',  label: 'Boolean' },
  { key: 'image', label: 'Image' },
]


export function flattenFields(fields) {
  const out = []
  for (const g of ['text','mtext','num','link','bool','image']) {
    const arr = fields[g] || []
    arr.forEach((f,idx) => out.push({ group: g, slot: idx+1, ...f }))
  }
  return out
}


export function packFields(list) {
  const grouped = { text:[], mtext:[], num:[], link:[], bool:[], image:[] }
  for (const g of Object.keys(grouped)) grouped[g] = []
  list.forEach(e => {
    const g = e.group
    if (grouped[g].length < 3) {
      grouped[g].push({ title: e.title||'', desc: e.desc||'', show: !!e.show, required: !!e.required })
    }
  })

  for (const g of Object.keys(grouped)) grouped[g] = grouped[g].slice(0,3)
  return grouped
}

export default function FieldsDesigner({ value, onChange }) {
  const [list, setList] = useState(()=> flattenFields(value || {}))

  const usedCounts = useMemo(()=>{
    const c = { text:0, mtext:0, num:0, link:0, bool:0, image:0 }
    list.forEach(e => c[e.group]++)
    return c
  },[list])

  const addField = (group) => {
    if ((usedCounts[group]||0) >= 3) return
    const next = [...list, { group, slot: usedCounts[group]+1, title:'', desc:'', show:false, required:false }]
    setList(next)
    onChange?.(packFields(next), next.map(({group,slot}) => ({group,slot})))
  }

  const update = (i, patch) => {
    const next = [...list]
    next[i] = { ...next[i], ...patch }
    setList(next)
    onChange?.(packFields(next), next.map(({group,slot}) => ({group,slot})))
  }

  const remove = (i) => {
    const next = [...list]
    next.splice(i,1)
    setList(next)
    onChange?.(packFields(next), next.map(({group,slot}) => ({group,slot})))
  }


  const dragIndexRef = useRef(null)
  const onDragStart = (_e, from) => { dragIndexRef.current = from }
  const onDragOver = (_to) => {}
  const onDrop = (_e, to) => {
    const from = dragIndexRef.current
    dragIndexRef.current = null
    if (from===null || from===to) return
    const next = [...list]
    const [mv] = next.splice(from, 1)
    next.splice(to, 0, mv)

    const counts = { text:0, mtext:0, num:0, link:0, bool:0, image:0 }
    next.forEach(n => n.slot = ++counts[n.group])
    setList(next)
    onChange?.(packFields(next), next.map(({group,slot}) => ({group,slot})))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button key={t.key} type="button"
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
            disabled={(usedCounts[t.key]||0)>=3}
            onClick={()=>addField(t.key)}
            title={usedCounts[t.key]>=3 ? "Limit 3 per type" : `Add ${t.label}`}
          >
            + {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="w-8 p-2"></th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Label</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left">Show in Add Item</th>
              <th className="p-2 text-left">Required</th>
              <th className="w-20 p-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.length===0 && (
              <tr><td colSpan="7" className="p-6 text-center text-gray-500">No fields yet</td></tr>
            )}
            {list.map((e,i)=>(
              <tr key={`${e.group}-${e.slot}-${i}`}
                  className="border-t"
                  draggable
                  onDragStart={(ev)=>onDragStart(ev, i)}
                  onDragOver={(ev)=>{ev.preventDefault();}}
                  onDrop={(ev)=>onDrop(ev, i)}
              >
                <td className="p-2 text-gray-400 cursor-move" title="Drag to reorder">⋮⋮</td>
                <td className="p-2 capitalize">{e.group}</td>
                <td className="p-2">
                  <input className="w-full px-2 py-1 border rounded" value={e.title}
                         onChange={(ev)=>update(i,{title: ev.target.value})} placeholder="Label"/>
                </td>
                <td className="p-2">
                  <input className="w-full px-2 py-1 border rounded" value={e.desc}
                         onChange={(ev)=>update(i,{desc: ev.target.value})} placeholder="Description"/>
                </td>
                <td className="p-2">
                  <input type="checkbox" checked={!!e.show} onChange={(ev)=>update(i,{show: ev.target.checked})}/>
                </td>
                <td className="p-2">
                  <input type="checkbox" checked={!!e.required} onChange={(ev)=>update(i,{required: ev.target.checked})}/>
                </td>
                <td className="p-2">
                  <button type="button" className="px-2 py-1 text-sm border rounded" onClick={()=>remove(i)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        Drag rows to set the exact order. This order is used in “Add Item”.
      </div>
    </div>
  )
}
