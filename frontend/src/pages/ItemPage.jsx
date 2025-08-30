import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../store/auth'

export default function ItemPage() {
  const { user } = useAuth()
  const { id, itemId } = useParams()
  const [item,setItem] = useState(null)
  const [fields,setFields] = useState(null)
  const [likes,setLikes] = useState(0)
  const [liked,setLiked] = useState(false)

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/items/${itemId}`)
    setItem(data.item); setFields(data.fields)
    const lk = await api.get(`/api/inventories/${id}/items/${itemId}/likes`)
    setLikes(lk.data.count); setLiked(lk.data.liked)
  }
  useEffect(()=>{ load() },[id,itemId])

  const save = async () => {
    await api.put(`/api/inventories/${id}/items/${itemId}`, item)
    await load()
  }

  const toggleLike = async () => {
    if (!user) { alert('Please sign in to like'); return }
    const { data } = await api.post(`/api/inventories/${id}/items/${itemId}/like`)
    setLikes(data.count)
    setLiked(!liked)
  }

  if (!item || !fields) return <div className="p-6">Loading…</div>

  const titled = (arr) => arr.map((f,idx)=>({ ...f, _i: idx })).filter(f => (f.title||'').trim() !== '')

  return (
    <div className="grid max-w-3xl gap-3 p-4 mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex-1"><b>ID:</b> <input className="w-full px-2 py-1 border rounded"
          value={item.customId || ''} onChange={e=>setItem({...item, customId: e.target.value})}/></div>
        <button onClick={toggleLike}
          className={`px-2 py-1 ml-3 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${liked?'!border-pink-600':''}`}
          title={liked ? 'Unlike' : 'Like'}>
          {liked ? '💖' : '🤍'} {likes}
        </button>
      </div>

      {titled(fields.text).map((f)=>(
        <label key={`t${f._i}`} className="grid gap-1">
          <span>{f.title}</span>
          <input value={item[`text${f._i+1}`]||''} onChange={e=>setItem({...item, [`text${f._i+1}`]: e.target.value})}
            className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {titled(fields.mtext).map((f)=>(
        <label key={`m${f._i}`} className="grid gap-1">
          <span>{f.title}</span>
          <textarea rows={4} value={item[`mtext${f._i+1}`]||''} onChange={e=>setItem({...item, [`mtext${f._i+1}`]: e.target.value})}
            className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {titled(fields.num).map((f)=>(
        <label key={`n${f._i}`} className="grid gap-1">
          <span>{f.title}</span>
          <input type="number" value={item[`num${f._i+1}`]??''} onChange={e=>setItem({...item, [`num${f._i+1}`]: e.target.valueAsNumber})}
            className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {titled(fields.link).map((f)=>(
        <label key={`l${f._i}`} className="grid gap-1">
          <span>{f.title}</span>
          <input type="url" value={item[`link${f._i+1}`]||''} onChange={e=>setItem({...item, [`link${f._i+1}`]: e.target.value})}
            className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {titled(fields.bool).map((f)=>(
        <label key={`b${f._i}`} className="flex items-center gap-2">
          <input type="checkbox" checked={!!item[`bool${f._i+1}`]} onChange={e=>setItem({...item, [`bool${f._i+1}`]: e.target.checked})}/>
          <span>{f.title}</span>
        </label>
      ))}

      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">Save</button>
        <button onClick={async()=>{ await api.delete(`/api/inventories/${id}/items/${itemId}`); history.back() }}
          className="px-3 py-1 border rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">Delete</button>
      </div>
    </div>
  )
}
