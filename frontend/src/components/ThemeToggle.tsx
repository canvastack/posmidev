import React from 'react'
import { useTheme, type Theme } from '@/hooks/useTheme'

const options: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

// Small segmented control to switch theme
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-white/10 dark:bg-slate-900/30 px-1 py-1 backdrop-blur-md border border-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          className={`px-2 py-1 rounded-md transition-colors ${
            theme === o.value
              ? 'bg-primary-600 text-white'
              : 'hover:bg-white/20 dark:hover:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}