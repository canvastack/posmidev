import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/backend/auth/ProtectedRoute'
import { FrontendLayout } from '@/layouts/frontend/FrontendLayout'
import { BackendLayout } from '@/layouts/backend/BackendLayout'
import { ThemeProvider } from './hooks/useTheme'
import { QueryProvider } from './providers/QueryProvider'
import { Toaster } from './components/ui/toaster'

// Auth
const LoginPage = lazy(() => import('./pages/frontend/auth/login'))
const RegisterPage = lazy(() => import('./pages/frontend/auth/register'))

// Admin (backend) pages
const DashboardPage = lazy(() => import('./pages/backend/dashboard'))
const PosPage = lazy(() => import('./pages/backend/pos'))
const ProductsPage = lazy(() => import('./pages/backend/products'))
const OrdersPage = lazy(() => import('./pages/backend/orders'))
const UsersPage = lazy(() => import('./pages/backend/users'))
const RolesPage = lazy(() => import('./pages/backend/roles'))
const CustomersPage = lazy(() => import('./pages/backend/customers'))
const SettingsPage = lazy(() => import('./pages/backend/settings'))
const ContentPagesPage = lazy(() => import('./pages/backend/content-pages'))

// Stock Management (Phase 5)
const StockAlertsPage = lazy(() => import('./pages/backend/stock-alerts'))
const LowStockProductsPage = lazy(() => import('./pages/backend/stock-alerts/LowStockProductsPage'))

// Product Detail & Edit (Phase 6)
const ProductDetailPage = lazy(() => import('./pages/backend/products/ProductDetailPage'))
const ProductEditPage = lazy(() => import('./pages/backend/products/ProductEditPage'))

// Public (frontend) pages
const HomePage = lazy(() => import('./pages/frontend/home'))
const ProductsPublicPage = lazy(() => import('./pages/frontend/products'))
const ProductDetailPublicPage = lazy(() => import('./pages/frontend/products/product-detail'))
const CompanyPage = lazy(() => import('./pages/frontend/company'))

function App() {
  return (
    <QueryProvider>
      <ThemeProvider defaultTheme="system" storageKey="posmid-ui-theme">
        <Router>
          <Toaster />
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <Routes>
          {/* Public/Frontend routes */}
          <Route element={<FrontendLayout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/products" element={<ProductsPublicPage />} />
            <Route path="/products/:id" element={<ProductDetailPublicPage />} />
            <Route path="/company" element={<CompanyPage />} />

            {/* Auth (public entry points) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes under BackendLayout (admin-only) */}
          <Route path="/admin" element={<ProtectedRoute><BackendLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:productId" element={<ProductDetailPage />} />
            <Route path="products/:productId/edit" element={<ProductEditPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="content-pages" element={<ContentPagesPage />} />
            {/* Stock Management (Phase 5) */}
            <Route path="stock-alerts" element={<StockAlertsPage />} />
            <Route path="stock-alerts/low-stock" element={<LowStockProductsPage />} />
          </Route>

          {/* Catch all → public home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </Router>
      </ThemeProvider>
    </QueryProvider>
  )
}

export default App
