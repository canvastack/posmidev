import { useEffect, useId, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/hooks/useAuth'

// Collapsible sidebar with persistence and keyboard accessibility
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar:collapsed') === '1')
  const toggleId = useId()
  const { tenantId } = useAuth()

  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  // Build menu links; add Customers only if tenantId is resolved
  const baseLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/pos', label: 'POS' },
    { to: '/products', label: 'Products' },
    { to: '/orders', label: 'Orders' },
    { to: '/users', label: 'Users' },
    { to: '/roles', label: 'Roles' },
  ] as const
  const links = [...baseLinks, { to: `/customers`, label: 'Customers' }, { to: '/settings', label: 'Settings' }]

  return (
    <aside className={`sidebar-panel h-full ${collapsed ? 'w-16' : 'w-64'} transition-[width] duration-200 ease-in-out`} data-collapsed={collapsed}>
      <div className="flex items-center justify-between p-2">
        <span className={`text-sm font-semibold truncate ${collapsed ? 'sr-only' : ''}`}>Console</span>
        <button
          id={toggleId}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
          onClick={() => setCollapsed((v) => !v)}
          className="px-2 py-1 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>
      <nav className="p-2 space-y-1 text-sm">
        {links.map((l) => (
          <NavItem key={l.to} to={l.to} label={l.label} collapsed={collapsed} />)
        )}
      </nav>
    </aside>
  )
}

function NavItem({ to, label, collapsed }: { to: string; label: string; collapsed: boolean }) {
  const content = (
    <NavLink
      to={to}
      className={({ isActive }) => `group flex items-center gap-2 px-2 py-2 rounded-md transition-all duration-200 ${isActive ? 'bg-primary-600/20 text-primary-700 dark:text-primary-300' : 'hover:bg-white/20'}`}
      aria-current={({ isActive }) => (isActive ? 'page' : undefined) as any}
    >
      {/* Placeholder icon */}
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-[10px]">{label[0]}</span>
      <span className={`transition-opacity duration-200 ${collapsed ? 'opacity-0 translate-x-[-4px] pointer-events-none w-0 overflow-hidden' : 'opacity-100 translate-x-0'}`}>{label}</span>
    </NavLink>
  )

  return collapsed ? <Tooltip content={label}>{content}</Tooltip> : content
}