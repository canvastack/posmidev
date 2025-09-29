import { TenantPickerButton } from '@/components/TenantPickerButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LogOut, Bell } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/Button'

interface AdminHeaderProps {
  secondary?: React.ReactNode
  onLogout: () => void
}

// Reusable admin header aligned with design-example structure
export function AdminHeader({ secondary, onLogout }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 relative z-header header-glass col-span-2">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: brand */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-bold text-xl gradient-primary bg-clip-text text-transparent">
            POSMID
          </span>
        </div>

        {/* Middle: search */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative">
            <input
              placeholder="Search products, orders, customers..."
              className="input pl-10 bg-background placeholder:text-muted-foreground border border-input text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 glass-card border-0"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <TenantPickerButton />

          {/* Notifications */}
          <Button aria-label="Notifications" size="icon" className="relative">
            <Bell className="h-5 w-5 cursor-pointer" />
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-[10px] bg-red-500 text-white">3</span>
          </Button>

          <ThemeToggle />
          <Button
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
            size="icon"
          >
            <LogOut className="h-5 w-5 cursor-pointer" />
          </Button>
        </div>
      </div>

      {secondary && (
        <div className="px-6 pb-2 text-sm opacity-80 truncate">
          {secondary}
        </div>
      )}
    </header>
  )
}