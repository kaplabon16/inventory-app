import dayjs from 'dayjs'

// client-side preview to mirror backend generator
export function renderIdPreview(elements) {
  return elements
    .sort((a, b) => a.order - b.order)
    .map((el) => {
      switch (el.type) {
        case 'FIXED': return el.param || ''
        case 'RAND20': return Math.floor(Math.random() * (2 ** 20)).toString(16).toUpperCase()
        case 'RAND32': return Math.floor(Math.random() * (2 ** 32)).toString(16).toUpperCase()
        case 'RAND6':  return String(Math.floor(Math.random() * 1_000_000)).padStart(6,'0')
        case 'RAND9':  return String(Math.floor(Math.random() * 1_000_000_000)).padStart(9,'0')
        case 'GUID':
          return crypto.randomUUID().toUpperCase()
        case 'DATE':
          return dayjs().format(el.param || 'YYYY')
        case 'SEQ':
          return (el.param || '0001')
        default: return ''
      }
    })
    .join('')
}
