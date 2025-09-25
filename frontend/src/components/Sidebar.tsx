import React from 'react'

// Simple vertical navigation. Enhance with collapse & tooltips later.
export function Sidebar() {
  return (
    <aside className="bg-white/10 dark:bg-slate-900/30 backdrop-blur-md border-r border-white/10 w-64 h-full">
      <nav className="p-3 space-y-2 text-sm">
        <a className="block px-2 py-1 rounded hover:bg-white/20">Dashboard</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">POS</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">Products</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">Orders</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">Customers</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">Payments</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">Inventory</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">Categories</a>
        <a className="block px-2 py-1 rounded hover:bg-white/20">Settings</a>
      </nav>
    </aside>
  )
}