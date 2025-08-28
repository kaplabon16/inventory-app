import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function ItemPage() {
  const { id, itemId } = useParams();
  const nav = useNavigate();
  const [item, setItem] = useState(null);
  const [fields, setFields] = useState(null);

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/items/${itemId}`);
    setItem(data.item);
    setFields(data.fields);
  };
  useEffect(() => { load(); }, [id, itemId]);

  const save = async () => {
    await api.put(`/api/inventories/${id}/items/${itemId}`, item);
    await load();
  };

  if (!item || !fields) return <div className="p-6">Loading…</div>;

  return (
    <div className="grid max-w-3xl gap-3 p-4 mx-auto">
      <div>
        <b>ID:</b>
        <input className="w-full px-2 py-1 border rounded" value={item.customId || ''} onChange={e=>setItem({...item, customId: e.target.value})}/>
      </div>

      {fields.text.map((f,idx)=>(
        <label key={`t${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <input value={item[`text${idx+1}`]||''} onChange={e=>setItem({...item, [`text${idx+1}`]: e.target.value})}
                 className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {fields.mtext.map((f,idx)=>(
        <label key={`m${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <textarea rows={4} value={item[`mtext${idx+1}`]||''} onChange={e=>setItem({...item, [`mtext${idx+1}`]: e.target.value})}
                    className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {fields.num.map((f,idx)=>(
        <label key={`n${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <input type="number" value={item[`num${idx+1}`]??''} onChange={e=>setItem({...item, [`num${idx+1}`]: e.target.valueAsNumber})}
                 className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {fields.link.map((f,idx)=>(
        <label key={`l${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <input type="url" value={item[`link${idx+1}`]||''} onChange={e=>setItem({...item, [`link${idx+1}`]: e.target.value})}
                 className="px-2 py-1 border rounded"/>
        </label>
      ))}
      {fields.bool.map((f,idx)=>(
        <label key={`b${idx}`} className="flex items-center gap-2">
          <input type="checkbox" checked={!!item[`bool${idx+1}`]} onChange={e=>setItem({...item, [`bool${idx+1}`]: e.target.checked})}/>
          <span>{f.title}</span>
        </label>
      ))}

      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 border rounded">Save</button>
        <button onClick={async()=>{ await api.delete(`/api/inventories/${id}/items/${itemId}`); nav(-1); }}
                className="px-3 py-1 border rounded">Delete</button>
      </div>
    </div>
  );
}
