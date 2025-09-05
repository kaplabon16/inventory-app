// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import InventoryList from './pages/InventoryList'
import InventoryPage from './pages/InventoryPage'
import ItemPage from './pages/ItemPage'
import Admin from './pages/Admin'
import OAuthCatch from './pages/OAuthCatch'
import NotFound from './pages/NotFound'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="max-w-6xl p-4 mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="/inventories" element={<InventoryList />} />
          <Route path="/inventories/:id" element={<InventoryPage />} />
          <Route path="/inventories/:id/item/:itemId" element={<ItemPage />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

    
          <Route path="/oauth" element={<OAuthCatch />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
