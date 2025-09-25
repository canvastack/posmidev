import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

// Controls dark/light mode, synced with localStorage and prefers-color-scheme
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) || 'system'
  )

  useEffect(() => {
    const root = document.documentElement
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && systemDark)
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}