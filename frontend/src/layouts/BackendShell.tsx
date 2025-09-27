import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Sidebar } from '@/components/Sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/authApi'
import { tenantApi, type Tenant } from '@/api/tenantApi'
import { useTenantScopeStore } from '@/stores/tenantScopeStore'

// Admin/POS shell with collapsible sidebar, glass header, and breadcrumbs
export function BackendShell() {
  const { user, logout } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const { selectedTenantId, setSelectedTenantId } = useTenantScopeStore()

  const isHq = user?.tenant_id === import.meta.env.VITE_HQ_TENANT_ID

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
      <header className="sticky top-0 z-header glass-header h-12 flex items-center px-4 justify-between col-span-2">
        <div className="text-sm opacity-80 max-w-[60%] truncate">
          <Breadcrumbs />
        </div>
        <div className="flex items-center gap-3">
          {isHq && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-foreground/80">Tenant:</label>
              <select
                className="px-2 py-1 text-sm rounded-md border border-border bg-background"
                value={selectedTenantId || ''}
                onChange={(e) => setSelectedTenantId(e.target.value || null)}
              >
                <option value="">HQ (no override)</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selectedTenantId && (
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded-md border border-border hover:bg-white/20"
                  onClick={() => setSelectedTenantId(null)}
                  title="Clear tenant override"
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <button onClick={handleLogout} className="px-2 py-1 text-sm rounded-md hover:bg-white/20">Logout</button>
          <ThemeToggle />
        </div>
      </header>
      <div className="row-start-2 col-start-1">
        <Sidebar />
      </div>
      <main className="p-4 row-start-2 col-start-2">
        {/* Content card wrapper for modern look */}
        <div className="glass-card p-4 min-h-[calc(100dvh-4rem)]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}