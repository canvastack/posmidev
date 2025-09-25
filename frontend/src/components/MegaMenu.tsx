import React, { useState } from 'react'

// Glass mega menu placeholder. Populate categories via API later.
export function MegaMenu() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 rounded-md hover:bg-white/20"
      >
        Browse
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-[640px] rounded-xl bg-white/20 dark:bg-slate-900/50 backdrop-blur-lg ring-1 ring-white/15 p-4 shadow-glass">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold mb-2">Featured</div>
              <ul className="space-y-1">
                <li><a className="hover:underline">New Arrivals</a></li>
                <li><a className="hover:underline">Best Sellers</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Categories</div>
              <ul className="space-y-1">
                <li><a className="hover:underline">Electronics</a></li>
                <li><a className="hover:underline">Groceries</a></li>
                <li><a className="hover:underline">Fashion</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-2">Collections</div>
              <ul className="space-y-1">
                <li><a className="hover:underline">Weekly Deals</a></li>
                <li><a className="hover:underline">Staff Picks</a></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}