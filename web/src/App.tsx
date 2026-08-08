import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './theme/ThemeContext'
import { ShopProvider } from './context/ShopContext'
import { AuthProvider } from './context/AuthContext'
import { AdminProvider, useAdmin } from './context/AdminContext'
import StorefrontLayout from './layouts/StorefrontLayout'
import Home from './pages/Home'
import CategoryPage from './pages/CategoryPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CollectionsPage from './pages/CollectionsPage'
import HelpPage from './pages/HelpPage'
import AccountPage from './pages/AccountPage'
import AuthPage from './pages/AuthPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import './theme/theme.css'

function RequireAdmin({ children }: { children: ReactElement }) {
  const { isAdmin, checkingSession } = useAdmin()
  if (checkingSession) return null
  return isAdmin ? children : <Navigate to="/admin" replace />
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ShopProvider>
          <AdminProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/account" element={<AccountPage />} />
                </Route>
                <Route path="/signin" element={<AuthPage />} />
                <Route path="/join" element={<AuthPage />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AdminProvider>
        </ShopProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
