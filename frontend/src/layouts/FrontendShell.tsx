import React from 'react'
import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import { ThemeToggle } from '@/components/ThemeToggle'

// Public/customer-facing shell with glass header and space for MegaMenu
export function FrontendShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-colors">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">POS</div>
          <div className="flex items-center gap-3">
            {/* MegaMenu trigger goes here */}
            <ThemeToggle />
          </div>
        </div>
        {/* <MegaMenu /> */}
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-white/10 py-6 text-sm opacity-80 text-center">© POS</footer>
      <ScrollToTopButton />
    </div>
  )
}