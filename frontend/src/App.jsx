import { BrowserRouter, Routes, Route } from "react-router-dom"
import "./styles.css"
import "./i18n"
import { useEffect } from 'react'
import { useAuth } from './store/auth'
import Header from "./components/Header"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Profile from "./pages/Profile"
import InventoryList from "./pages/InventoryList"
import InventoryPage from "./pages/InventoryPage"
import ItemPage from "./pages/ItemPage"
import Admin from "./pages/Admin"
import Search from "./pages/Search"

import ProtectedRoute from "./routes/ProtectedRoute"

export default function App() {
  useEffect(() => { useAuth.getState().hydrate() }, [])

  return (
    <BrowserRouter>
      {/* Root wrapper with proper dark/light contrast */}
      <div className="flex flex-col min-h-screen text-gray-900 transition-colors duration-300 bg-white dark:bg-gray-900 dark:text-gray-100">
        {/* Header always visible */}
        <Header />

        {/* Main content */}
        <main className="flex-1 p-4">
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
            <Route
              path="/inventories"
              element={
                <ProtectedRoute>
                  <InventoryList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventories/:id"
              element={
                <ProtectedRoute>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items/:id"
              element={
                <ProtectedRoute>
                  <ItemPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="/search" element={<Search />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
