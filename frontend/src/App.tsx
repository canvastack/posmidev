import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { FrontendShell } from './layouts/FrontendShell'
import { BackendShell } from './layouts/BackendShell'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { PosPage } from './pages/PosPage'
import { ProductsPage } from './pages/ProductsPage'
import { OrdersPage } from './pages/OrdersPage'
import { UsersPage } from './pages/UsersPage'
import { RolesPage } from './pages/RolesPage'
import { CustomersPage } from './pages/CustomersPage'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes under FrontendShell */}
        <Route element={<FrontendShell />}> 
          <Route path="/pricing" element={<div>Pricing (public)</div>} />
          <Route path="/features" element={<div>Features (public)</div>} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes under BackendShell */}
        <Route element={<ProtectedRoute><BackendShell /></ProtectedRoute>}>
          {/* Main app pages */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RolesPage />} />

          {/* Customers centralized route (no tenantId in URL) */}
          <Route path="/customers" element={<CustomersPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App