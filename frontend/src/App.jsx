import './styles.css'
import './i18n'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import InventoryList from './pages/InventoryList'
import InventoryPage from './pages/InventoryPage'
import ItemPage from './pages/ItemPage'
import Search from './pages/Search'
import NotFound from './pages/NotFound'
import ProtectedRoute from './routes/ProtectedRoute'
import { useEffect } from 'react'
import { useAuth } from './store/auth'
import { useUI } from './store/ui'

export default function App() {
  const { loadMe } = useAuth()
  const { theme, setTheme } = useUI()
  useEffect(()=>{ loadMe(); setTheme(theme) },[])
  return (
    <BrowserRouter>
      <Header/>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/me" element={<ProtectedRoute><Profile/></ProtectedRoute>}/>
        <Route path="/admin" element={<ProtectedRoute><Admin/></ProtectedRoute>}/>
        <Route path="/inventory/new" element={<ProtectedRoute><InventoryList/></ProtectedRoute>}/>
        <Route path="/inventory/:id" element={<InventoryPage/>}/>
        <Route path="/inventory/:id/item/:itemId" element={<ItemPage/>}/>
        <Route path="/search" element={<Search/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
    </BrowserRouter>
  )
}
