import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun } from 'lucide-react'

// Single icon button toggler (Light <-> Dark)
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'
  const icon = isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
      className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent cursor-pointer"
    >
      {icon}
    </button>
  )
}
