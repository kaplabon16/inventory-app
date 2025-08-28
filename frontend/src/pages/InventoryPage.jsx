// frontend/src/pages/InventoryPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import MarkdownBox from '../components/MarkdownBox'
import Toolbar from '../components/Toolbar'
import Table from '../components/Table'
import { useUI } from '../store/ui'
import { useTranslation } from 'react-i18next'
import { renderIdPreview } from '../utils/idPreview'

const emptyFields = {
  text: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  mtext:[{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  num:  [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  link: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  bool: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
}

const defaultElements = [
  { order:1, type:'FIXED', param:'INV-' },
  { order:2, type:'RAND32', param:'' },
  { order:3, type:'SEQ', param:'001' }
]

export default function InventoryPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const { autosaveState, setSaving } = useUI()
  const [inv, setInv] = useState(null)
  const [tab, setTab] = useState('items')
  const [fields,setFields] = useState(emptyFields)
  const [elements,setElements] = useState(defaultEl
