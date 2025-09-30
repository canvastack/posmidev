import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  BarChart3,
  Archive,
  Tags,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: ShoppingCart, label: 'Point of Sale', path: '/admin/pos' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Users, label: 'Orders', path: '/admin/orders' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
  { icon: Archive, label: 'Inventory', path: '/admin/inventory' },
  { icon: Tags, label: 'Categories', path: '/admin/categories' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] glass-card border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hover:bg-white/10"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-12 transition-all duration-200',
                    collapsed && 'justify-center px-2',
                    isActive && 'bg-primary/10 text-primary border border-primary/20',
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
