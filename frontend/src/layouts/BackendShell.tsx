import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/authApi'
import { tenantApi, type Tenant } from '@/api/tenantApi'
import { AdminHeader } from '@/layouts/AdminHeader'

// Admin/POS shell with collapsible sidebar, glass header, and breadcrumbs
export function BackendShell() {
  const { user, logout } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])

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
    <div className="min-h-dvh grid grid-rows-[auto,1fr] grid-cols-[auto,1fr]">
      {/* Reusable header */}
      <AdminHeader
        onLogout={handleLogout}
        secondary={<Breadcrumbs />}
      />

      <div className="row-start-2 col-start-1">
        <Sidebar />
      </div>
      <main className="p-4 row-start-2 col-start-2">
        {/* Content card wrapper for modern look */}
        <div className="content-surface min-h-[calc(100dvh-4rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}