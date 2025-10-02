import { ScrollToTopButton } from '@/components/ScrollToTopButton'
import { Outlet } from 'react-router-dom'

// Public/customer-facing shell - minimal wrapper since pages handle their own headers/footers
export function FrontendShell() {
  return (
    <div className="min-h-screen">
      <Outlet />
      <ScrollToTopButton />
    </div>
  )
}