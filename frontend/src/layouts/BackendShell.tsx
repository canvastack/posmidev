import { ThemeToggle } from '@/components/ThemeToggle'
import { Sidebar } from '@/components/Sidebar'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/authApi'

// Admin/POS shell with collapsible sidebar, glass header, and breadcrumbs
export function BackendShell() {
  const { logout } = useAuth()

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
        <div className="flex items-center gap-2">
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