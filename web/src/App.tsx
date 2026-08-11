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
import OrderSuccessPage from './pages/OrderSuccessPage'
import AuthPage from './pages/AuthPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import StaffSignup from './pages/admin/StaffSignup'
import './theme/theme.css'

function RequireStaff({ children }: { children: ReactElement }) {
  const { isStaff, checkingSession } = useAdmin()
  if (checkingSession) return null
  return isStaff ? children : <Navigate to="/admin" replace />
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
                  <Route path="/order/success" element={<OrderSuccessPage />} />
                </Route>
                <Route path="/signin" element={<AuthPage />} />
                <Route path="/join" element={<AuthPage />} />
                <Route path="/admin" element={<AdminLogin />} />
                <Route path="/staff/signup" element={<StaffSignup />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <RequireStaff>
                      <AdminDashboard />
                    </RequireStaff>
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
