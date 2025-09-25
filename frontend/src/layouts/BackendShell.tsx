import React from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

// Admin/POS shell with collapsible sidebar and glass header
export function BackendShell({ children }: { children: React.ReactNode }) {
  // In further iterations, persist collapse with localStorage
  return (
    <div className="min-h-dvh grid grid-cols-[auto,1fr] grid-rows-[auto,1fr]">
      <aside className="row-span-2 bg-white/10 dark:bg-slate-900/30 backdrop-blur-md border-r border-white/10 w-64 data-[collapsed=true]:w-16 transition-[width]">
        <nav className="p-3 space-y-2 text-sm">
          {/* Sidebar items with icons */}
          <a className="block px-2 py-1 rounded hover:bg-white/20">Dashboard</a>
          <a className="block px-2 py-1 rounded hover:bg-white/20">POS</a>
          <a className="block px-2 py-1 rounded hover:bg-white/20">Products</a>
          <a className="block px-2 py-1 rounded hover:bg-white/20">Orders</a>
        </nav>
      </aside>
      <header className="sticky top-0 z-30 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/10 h-12 flex items-center px-4 justify-between">
        <div className="text-sm opacity-80">{/* Breadcrumbs */}Home / Dashboard</div>
        <ThemeToggle />
      </header>
      <main className="p-4">{children}</main>
    </div>
  )}