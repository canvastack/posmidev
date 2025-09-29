import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// Prevent initial flash: we also inject a tiny script in index.html.
// This hook still reacts to changes and persists user choice.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) || 'system'
  )

  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && systemDark)
    root.classList.toggle('dark', isDark)
    root.classList.toggle('light', !isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}