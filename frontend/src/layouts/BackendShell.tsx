import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/authApi'
import { tenantApi, type Tenant } from '@/api/tenantApi'
import { AdminHeader } from '@/layouts/AdminHeader'

// Admin/POS shell matching design-example: fixed sidebar (top-16), header, and content
export function BackendShell() {
  const { user, logout } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])

  // Sidebar collapsed state to control fixed sidebar width (16/64)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const hqEnv = import.meta.env.VITE_HQ_TENANT_ID
  const isHq = hqEnv ? (user?.tenant_id === hqEnv) : (user?.roles?.includes('Super Admin') ?? false)

  useEffect(() => {
    if (!isHq) return
    // Load tenants for HQ Super Admin to pick from
    tenantApi
      .getTenants({ page: 1, per_page: 100 })
      .then((p) => setTenants(p.data))
      .catch(() => {})
  }, [isHq])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (_) {
      // ignore network errors for logout
    } finally {
      logout()
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-dvh">
      {/* Header - sticky, occupies normal flow height (h-16) */}
      <AdminHeader onLogout={handleLogout} secondary={<Breadcrumbs />} />

      {/* Fixed Sidebar per design-example */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main content shifted by sidebar width to avoid overlap (admin-prefixed) */}
      <main className={`p-4 ${sidebarCollapsed ? 'pl-16' : 'pl-64'}`}>
        <div className="content-surface min-h-[calc(100dvh-4rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
