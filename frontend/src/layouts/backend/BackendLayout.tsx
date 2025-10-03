import { useEffect, useState } from 'react'
import { Sidebar } from '@/layouts/backend/components/Sidebar'
import { Breadcrumbs } from '@/components/backend/navigation/Breadcrumbs'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/authApi'
import { tenantApi, type Tenant } from '@/api/tenantApi'
import { HeaderAdmin } from '@/layouts/backend/components/HeaderAdmin'

// Admin/POS shell matching design-example: fixed sidebar (top-16), header, and content
export function BackendLayout() {
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
      {/* Fixed Sidebar on the left, full height */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Right content column: header + main shift together with sidebar width */}
      <div className={sidebarCollapsed ? 'pl-16' : 'pl-64'}>
        {/* Header - sticky, occupies normal flow height (h-16) */}
        <HeaderAdmin onLogout={handleLogout} secondary={<Breadcrumbs />} />

        {/* Content below header; add left padding to create gap from sidebar */}
        <main className="pt-4 pb-6 pr-4 pl-4 md:pl-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
