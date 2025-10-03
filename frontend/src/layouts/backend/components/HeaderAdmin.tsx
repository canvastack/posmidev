import { TenantPickerButton } from '@/components/backend/tenant/TenantPickerButton'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { LogOut, Bell } from 'lucide-react'
import React from 'react'
import { Button } from '@/components/ui/button'

interface HeaderAdminProps {
  secondary?: React.ReactNode
  onLogout: () => void
}

// Reusable admin header aligned with design-example structure
export function HeaderAdmin({ secondary, onLogout }: HeaderAdminProps) {
  return (
    <header className="sticky top-0 relative z-header header-glass col-span-2">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: spacer (brand moved to sidebar top) */}
        <div className="flex items-center gap-2 min-w-10" />

        {/* Middle: search */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative">
            <input
              placeholder="Search products, orders, customers..."
              className="input pl-10 bg-background placeholder:text-muted-foreground border border-input text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <TenantPickerButton />

          {/* Notifications */}
          <Button
            aria-label="Notifications"
            title="Notifications"
            type="button"
            size="icon"
            variant="ghost"
            className="relative cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-[10px] bg-red-500 text-white">3</span>
          </Button>

          <ThemeToggle />
          <Button
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
            type="button"
            size="icon"
            variant="ghost"
            className="cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
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