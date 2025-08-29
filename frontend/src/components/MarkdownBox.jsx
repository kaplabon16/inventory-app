import ReactMarkdown from 'react-markdown'

export default function MarkdownBox({ value, onChange }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={10}
        className="w-full p-2 font-mono border rounded" placeholder="Markdown…"/>
      <div className="p-2 prose border rounded dark:prose-invert max-w-none">
        <ReactMarkdown>{value || '*(no content)*'}</ReactMarkdown>
      </div>
    </div>
  )
}
