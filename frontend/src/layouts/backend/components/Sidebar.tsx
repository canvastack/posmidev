import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  BarChart3,
  IdCard,
  ClipboardList,
  BrainCircuit,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Building2,
  Tags,
  TrendingUp,
  Factory,
  ClipboardCheck,
  PieChart,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: ShoppingCart, label: 'Point of Sale', path: '/admin/pos' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: Building2, label: 'Suppliers', path: '/admin/suppliers' },
  { icon: Tags, label: 'Product Tags', path: '/admin/product-tags' },
  { icon: AlertTriangle, label: 'Stock Alerts', path: '/admin/stock-alerts' },
  { icon: TrendingUp, label: 'Analytics', path: '/admin/analytics' },
  { icon: ClipboardList, label: 'Orders', path: '/admin/orders' },
  // BOM Engine
  { icon: PieChart, label: 'BOM Dashboard', path: '/admin/bom-dashboard', highlight: true },
  { icon: Factory, label: 'Materials', path: '/admin/materials' },
  { icon: ClipboardCheck, label: 'Recipes', path: '/admin/recipes' },
  // Users & Settings
  { icon: IdCard, label: 'Users', path: '/admin/users' },
  { icon: BrainCircuit, label: 'Roles', path: '/admin/roles' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: FileText, label: 'Content Pages', path: '/admin/content-pages' },
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
        'fixed left-0 top-0 z-30 h-dvh sidebar-glass sidebar-shadow transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
      aria-label="Admin sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Brand at top */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            {!collapsed && (
              <span className="font-bold text-xl gradient-primary bg-clip-text text-transparent">POSMID</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
            aria-label="Toggle sidebar"
            aria-pressed={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar pr-2" aria-label="Primary">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)

            return (
              <Link key={item.path} to={item.path} aria-current={isActive ? 'page' : undefined}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-12 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    collapsed && 'justify-center px-2',
                    isActive && 'bg-primary/10 text-primary border border-primary/20',
                  )}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
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
