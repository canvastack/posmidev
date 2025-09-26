import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { MegaMenu } from '@/components/MegaMenu'
import { Outlet } from 'react-router-dom'

// Public/customer-facing shell with glass header and space for MegaMenu
export function FrontendShell() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-colors">
      <header className="sticky top-0 z-header glass-header">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">POS</div>
          <div className="flex items-center gap-3">
            <MegaMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <div className="glass-card p-4">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-white/10 py-6 text-sm opacity-80 text-center">© POS</footer>
      <ScrollToTopButton />
    </div>
  )
}