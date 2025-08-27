import ReactMarkdown from 'react-markdown'

export default function MarkdownBox({ value, onChange }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={10}
        className="w-full border rounded p-2 font-mono" placeholder="Markdown…"/>
      <div className="prose dark:prose-invert max-w-none border rounded p-2">
        <ReactMarkdown>{value || '_(no content)_'}</ReactMarkdown>
      </div>
    </div>
  )
}
