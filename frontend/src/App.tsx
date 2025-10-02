import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { FrontendShell } from './layouts/FrontendShell'
import { BackendShell } from './layouts/BackendShell'
import { ThemeProvider } from './hooks/useTheme'
import { Toaster } from './components/ui/sonner'

// Auth
const LoginPage = lazy(() => import('./pages/frontend/LoginPage'))
const RegisterPage = lazy(() => import('./pages/frontend/RegisterPage'))

// Admin (backend) pages
const DashboardPage = lazy(() => import('./pages/backend/DashboardPage'))
const PosPage = lazy(() => import('./pages/backend/PosPage'))
const ProductsPage = lazy(() => import('./pages/backend/ProductsPage'))
const OrdersPage = lazy(() => import('./pages/backend/OrdersPage'))
const UsersPage = lazy(() => import('./pages/backend/UsersPage'))
const RolesPage = lazy(() => import('./pages/backend/RolesPage'))
const CustomersPage = lazy(() => import('./pages/backend/CustomersPage'))
const SettingsPage = lazy(() => import('./pages/backend/SettingsPage'))
const ContentPagesPage = lazy(() => import('./pages/backend/ContentPagesPage'))

// Public (frontend) pages
const HomePage = lazy(() => import('./pages/frontend/HomePage'))
const ProductsPublicPage = lazy(() => import('./pages/frontend/ProductsPublicPage'))
const ProductDetailPublicPage = lazy(() => import('./pages/frontend/ProductDetailPublicPage'))
const CompanyPage = lazy(() => import('./pages/frontend/CompanyPage'))

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="posmid-ui-theme">
      <Router>
        <Toaster />
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <Routes>
          {/* Public/Frontend routes */}
          <Route element={<FrontendShell />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/products" element={<ProductsPublicPage />} />
            <Route path="/products/:id" element={<ProductDetailPublicPage />} />
            <Route path="/company" element={<CompanyPage />} />

            {/* Auth (public entry points) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes under BackendShell (admin-only) */}
          <Route path="/admin" element={<ProtectedRoute><BackendShell /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="content-pages" element={<ContentPagesPage />} />
          </Route>

          {/* Catch all → public home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </Router>
    </ThemeProvider>
  )
}

export default App
